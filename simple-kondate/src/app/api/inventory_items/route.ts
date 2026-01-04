// src/app/api/inventory_items/route.ts

import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";
import type { InventoryKind } from "../../../types/inventory";

type CreateBody = {
  kind?: InventoryKind;
  category?: string | null;
  name?: string;
  quantity_num?: number;
  unit?: string | null;
  expires_on?: string | null; // YYYY-MM-DD
};

const isYmdOrNull = (s: unknown) =>
  s === null || s === undefined || (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s));

export async function GET() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id,kind,category,name,quantity_num,unit,expires_on,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}


export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateBody | null;

  const kind = body?.kind;
  const name = (body?.name ?? "").trim();
  const category = (body?.category ?? null) ? String(body?.category).trim() : null;
  const unit = (body?.unit ?? null) ? String(body?.unit).trim() : null;
  const quantity_num = Number(body?.quantity_num ?? NaN);
  const expires_on = body?.expires_on ?? null;

  if (kind !== "食材" && kind !== "日用品") {
    return NextResponse.json({ message: "kind は 食材 / 日用品 のどちらかです" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ message: "name は必須です" }, { status: 400 });
  }
  if (!Number.isFinite(quantity_num) || quantity_num < 0) {
    return NextResponse.json({ message: "quantity_num は 0 以上の数値です" }, { status: 400 });
  }
  if (!isYmdOrNull(expires_on)) {
    return NextResponse.json({ message: "expires_on は YYYY-MM-DD か null です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      kind,
      category,
      name,
      quantity_num,
      unit: unit || null,
      expires_on: expires_on || null,
    })
    .select("id,kind,category,name,quantity_num,unit,expires_on,created_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 200 });
}
