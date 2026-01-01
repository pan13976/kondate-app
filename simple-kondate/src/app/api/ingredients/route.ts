// src/app/api/ingredients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

/**
 * GET /api/ingredients?category=肉
 * - category があればそのカテゴリだけ返す
 * - 無ければ全部返す（最初はこれでOK）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "").trim();

  let query = supabase
    .from("ingredients_master")
    .select("id,name_ja,category")
    .order("name_ja", { ascending: true });

  // category 指定がある場合のみフィルタ
  if (category) query = query.eq("category", category);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
