import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import type { InventoryKind } from "../../../../types/inventory";

type UpdateBody = Partial<{
  kind: InventoryKind;
  category: string | null;
  name: string;
  quantity_num: number;
  unit: string | null;
  expires_on: string | null; // YYYY-MM-DD
}>;

type PatchBody =
  | { op: "consume"; delta?: number }
  | { op: string; [k: string]: unknown };

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

async function getId(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!id || id === "undefined" || !isUuid(id)) return null;
  return id;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await getId(ctx.params);
  if (!id) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  if (!body) return NextResponse.json({ message: "body is required" }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.kind !== undefined) {
    if (body.kind !== "食材" && body.kind !== "日用品") {
      return NextResponse.json({ message: "kind は 食材 / 日用品 のどちらかです" }, { status: 400 });
    }
    patch.kind = body.kind;
  }

  if (body.category !== undefined) patch.category = body.category ? String(body.category).trim() : null;

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ message: "name は必須です" }, { status: 400 });
    patch.name = name;
  }

  if (body.quantity_num !== undefined) {
    const q = Number(body.quantity_num);
    if (!Number.isFinite(q) || q < 0) {
      return NextResponse.json({ message: "quantity_num は 0 以上の数値です" }, { status: 400 });
    }
    patch.quantity_num = Math.floor(q);
    // ★ 互換：もしDBに quantity(text) が残ってても破綻しないように
    patch.quantity = String(Math.floor(q));
  }

  if (body.unit !== undefined) patch.unit = body.unit ? String(body.unit).trim() : null;

  if (body.expires_on !== undefined) {
    const x = body.expires_on;
    if (x === null || x === undefined || String(x).trim() === "") {
      patch.expires_on = null;
    } else {
      const s = String(x).trim();
      if (!isYmd(s)) return NextResponse.json({ message: "expires_on は YYYY-MM-DD か null です" }, { status: 400 });
      patch.expires_on = s;
    }
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .select("id,kind,category,name,quantity_num,unit,expires_on,created_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 200 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await getId(ctx.params);
  if (!id) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body || body.op !== "consume") {
    return NextResponse.json({ message: "unsupported patch" }, { status: 400 });
  }

  const delta = Math.max(1, Math.floor(Number(body.delta ?? 1) || 1));

  // 現在値
  const { data: cur, error: gErr } = await supabase
    .from("inventory_items")
    .select("id,quantity_num")
    .eq("id", id)
    .single();

  if (gErr) return NextResponse.json({ message: gErr.message }, { status: 500 });

  const next = Math.max(0, Number((cur as any)?.quantity_num ?? 0) - delta);

  // 0なら削除
  if (next <= 0) {
    const { error: dErr } = await supabase.from("inventory_items").delete().eq("id", id);
    if (dErr) return NextResponse.json({ message: dErr.message }, { status: 500 });
    return NextResponse.json({ deleted: true }, { status: 200 });
  }

  const { data, error: uErr } = await supabase
    .from("inventory_items")
    .update({ quantity_num: next, quantity: String(next) }) // ★互換
    .eq("id", id)
    .select("id,kind,category,name,quantity_num,unit,expires_on,created_at")
    .single();

  if (uErr) return NextResponse.json({ message: uErr.message }, { status: 500 });
  return NextResponse.json({ deleted: false, item: data }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await getId(ctx.params);
  if (!id) return NextResponse.json({ message: "invalid id" }, { status: 400 });

  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
