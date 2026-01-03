// src/app/api/kondates/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

type Ingredient = { name: string; amount: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // "YYYY-MM-DD"
  const to = url.searchParams.get("to");     // "YYYY-MM-DD"

  let q = supabase
    .from("kondates")
    .select("id,title,category,meal_date,created_at,recipe_id,ingredients")
    .order("meal_date", { ascending: true })
    .order("category", { ascending: true });

  // from/to があれば期間で絞る
  if (from) q = q.gte("meal_date", from);
  if (to) q = q.lte("meal_date", to);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ kondates: data ?? [] });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        category?: string;
        meal_date?: string;
        recipe_id?: string | null;
        ingredients?: Ingredient[] | null;
      }
    | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const category = body?.category?.trim() || "夜";
  const meal_date = body?.meal_date?.trim() || new Date().toISOString().slice(0, 10);
  const recipe_id = body?.recipe_id ?? null;
  const ingredients = Array.isArray(body?.ingredients) ? body?.ingredients : null;

  const { data, error } = await supabase
    .from("kondates")
    .insert([{ title, category, meal_date, recipe_id, ingredients }])
    .select("id,title,category,meal_date,created_at,recipe_id,ingredients")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ kondate: data }, { status: 201 });
}
