// src/app/api/shopping_lists/route.ts

import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";
import {
  buildShoppingItemsFromIngredients,
  type ApiKondateIngredient,
} from "../../../lib/shopping/build";

type CreateBody = {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  family_id?: string | null; // 将来用（今は省略OK）
  title?: string | null; // 任意
  mode?: "kondates" | "manual" | "kondates_minus_inventory"; // ★在庫差し引き追加
};

type ApiKondateRow = {
  id: number;
  meal_date: string; // YYYY-MM-DD
  ingredients: ApiKondateIngredient[] | null;
};

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * GET /api/shopping_lists
 * 直近の買い物リスト一覧（最新順）
 * ※ここは [id] ではないので params は存在しない（ctx を受け取らない）
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(50, Number(limitRaw ?? 20) || 20));

  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id,family_id,start_date,end_date,title,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ shopping_lists: data ?? [] }, { status: 200 });
}

/**
 * POST /api/shopping_lists
 * - mode="manual"  : 空のリストを作る
 * - mode="kondates": 期間内の献立 ingredients から買い物リストを生成
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateBody | null;

  const start_date = body?.start_date?.trim();
  const end_date = body?.end_date?.trim();

  if (!start_date || !end_date || !isYmd(start_date) || !isYmd(end_date)) {
    return NextResponse.json(
      { message: "start_date / end_date（YYYY-MM-DD）が必要です" },
      { status: 400 }
    );
  }
  if (start_date > end_date) {
    return NextResponse.json(
      { message: "start_date <= end_date にしてください" },
      { status: 400 }
    );
  }

  const family_id = body?.family_id ?? null;
  const title = body?.title ?? null;
  const mode: "kondates" | "manual" | "kondates_minus_inventory" = body?.mode ?? "kondates";

  // 1) リスト本体を作成（共通）
  const { data: listRow, error: lErr } = await supabase
    .from("shopping_lists")
    .insert({
      family_id,
      start_date,
      end_date,
      title,
    })
    .select("id,family_id,start_date,end_date,title,created_at")
    .single();

  if (lErr) return NextResponse.json({ message: lErr.message }, { status: 500 });

  // 2) 手動モード：空で返して終了
  if (mode === "manual") {
    return NextResponse.json(
      { shopping_list: listRow, items_count: 0 },
      { status: 200 }
    );
  }

  // 3) 献立モード：期間内の献立（ingredients）を集めて集約
  // ※ ingredients 列名が違う場合はここの select の3つ目を直す
  const { data: kondates, error: kErr } = await supabase
    .from("kondates")
    .select("id,meal_date,ingredients")
    .gte("meal_date", start_date)
    .lte("meal_date", end_date)
    .order("meal_date", { ascending: true });

  if (kErr) return NextResponse.json({ message: kErr.message }, { status: 500 });

  const rows = (kondates ?? []) as ApiKondateRow[];

  const allIngredients: ApiKondateIngredient[] = [];
  for (const r of rows) {
    const list = Array.isArray(r.ingredients) ? r.ingredients : [];
    for (const ing of list) allIngredients.push(ing);
  }

  // 在庫差し引きモードなら、材料を「回数」として数え、在庫の数量と差し引く
  // ※分量(amount)は文字列なので、まずは最小運用（個数カウント）で。
  if (mode === "kondates_minus_inventory") {
    // 食材在庫だけ見る（kind='食材'）
    const { data: invRows, error: iErr } = await supabase
      .from("inventory_items")
      .select("name,quantity_num,kind")
      .eq("kind", "食材");

    if (iErr) return NextResponse.json({ message: iErr.message }, { status: 500 });

    const invMap = new Map<string, number>();
    for (const r of (invRows ?? []) as { name: string; quantity_num: number; kind: string }[]) {
      const n = (r?.name ?? "").trim();
      if (!n) continue;
      invMap.set(n, Math.max(0, Number(r.quantity_num ?? 0) || 0));
    }

    const need = new Map<string, number>();
    for (const ing of allIngredients) {
      const n = (ing.name ?? "").trim();
      if (!n) continue;
      need.set(n, (need.get(n) ?? 0) + 1);
    }

    const items = [] as { name: string; amount: string | null; checked: boolean; sort_order: number }[];
    let idx = 0;
    for (const [n, cnt] of need.entries()) {
      const have = invMap.get(n) ?? 0;
      const missing = Math.max(0, cnt - have);
      if (missing <= 0) continue;
      items.push({ name: n, amount: String(missing), checked: false, sort_order: idx++ });
    }

    // 4) items を一括 insert（0件ならスキップ）
    if (items.length) {
      const payload = items.map((it) => ({
        shopping_list_id: listRow.id,
        name: it.name,
        amount: it.amount,
        checked: it.checked,
        sort_order: it.sort_order,
      }));

      const { error: insErr } = await supabase.from("shopping_items").insert(payload);
      if (insErr) return NextResponse.json({ message: insErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { shopping_list: listRow, items_count: items.length },
      { status: 200 }
    );
  }

  // 4) items を作る（通常：献立の材料をそのまま集計）
  const items = buildShoppingItemsFromIngredients(allIngredients);

  // 5) items を一括 insert（0件ならスキップ）
  if (items.length) {
    const payload = items.map((it) => ({
      shopping_list_id: listRow.id,
      name: it.name,
      amount: it.amount,
      checked: it.checked,
      sort_order: it.sort_order,
    }));

    const { error: iErr } = await supabase.from("shopping_items").insert(payload);
    if (iErr) return NextResponse.json({ message: iErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { shopping_list: listRow, items_count: items.length },
    { status: 200 }
  );
}
