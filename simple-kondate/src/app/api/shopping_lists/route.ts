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
  mode?: "kondates" | "manual"; // ★追加：手動 or 献立から
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
  const mode: "kondates" | "manual" = body?.mode ?? "kondates";

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

  const items = buildShoppingItemsFromIngredients(allIngredients);

  // 4) items を一括 insert（0件ならスキップ）
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
