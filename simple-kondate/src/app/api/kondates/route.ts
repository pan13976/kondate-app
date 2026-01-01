// src/app/api/kondates/route.ts
import { NextResponse } from "next/server";
//import { supabaseServer } from "../../lib/supabaseClient";
import { supabase } from "../../../lib/supabaseClient";


/**
 * GET /api/kondates
 * 一覧取得（created_at の降順）
 *
 * 画面は「DBにどう繋いでいるか」を知らずに
 * /api/kondates を叩くだけで一覧が取れる。
 */
export async function GET() {
const { data, error } = await supabase
  .from("kondates")
  .select("id,title,category,meal_date,created_at")
  .order("created_at", { ascending: false });

  if (error) {
    // エラーは 500 で返す（画面側で res.ok を見て弾く）
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // 成功時は kondates 配列を返す
  return NextResponse.json({ kondates: data ?? [] });
}

/**
 * POST /api/kondates
 * 追加（insert）
 *
 * 画面からは title/category を JSON で送るだけ。
 * SupabaseのキーやRLS事情はAPI側に隠蔽できる。
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { title?: string; category?: string; meal_date?: string }
    | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const category = body?.category?.trim() || "夜";

  // ★ meal_date を受け取り。なければ「今日」を採用
  // "YYYY-MM-DD" を想定。厳密バリデーションは後で追加可能。
  const meal_date = body?.meal_date?.trim() || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("kondates")
    .insert([{ title, category, meal_date }])
    .select("id,title,category,meal_date,created_at")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ kondate: data }, { status: 201 });
}