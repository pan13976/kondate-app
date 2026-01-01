import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

type Ingredient = { name: string; amount: string };

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isFinite(numId)) {
    return NextResponse.json({ message: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { title?: string; ingredients?: Ingredient[] }
    | null;

  const title = body?.title?.trim();
  const ingredients = Array.isArray(body?.ingredients) ? body!.ingredients : [];

  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  // 空行っぽいのを軽く正規化（サーバ側でも保険）
  const normalized = ingredients
    .map((x) => ({ name: (x.name ?? "").trim(), amount: (x.amount ?? "").trim() }))
    .filter((x) => x.name !== "" || x.amount !== "");

  const { data, error } = await supabase
    .from("kondates")
    .update({ title, ingredients: normalized }) // ★ここで保存
    .eq("id", numId)
    .select("id,title,category,meal_date,created_at,ingredients") // ★返す
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ kondate: data });
}
