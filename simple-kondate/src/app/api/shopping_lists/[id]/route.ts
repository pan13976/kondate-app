// src/app/api/shopping_lists/[id]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const { data: list, error: lErr } = await supabase
    .from("shopping_lists")
    .select("id,family_id,start_date,end_date,title,created_at")
    .eq("id", id)
    .single();

  if (lErr) return NextResponse.json({ message: lErr.message }, { status: 500 });
  if (!list) return NextResponse.json({ message: "not found" }, { status: 404 });

  const { data: items, error: iErr } = await supabase
    .from("shopping_items")
    .select("id,name,amount,checked,sort_order,created_at")
    .eq("shopping_list_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (iErr) return NextResponse.json({ message: iErr.message }, { status: 500 });

  return NextResponse.json({ shopping_list: list, items: items ?? [] }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 先に削除（存在しない場合でもエラーにはならないが、原因特定のため select 返す）
  const { data, error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    // ここにSupabaseの生エラーが出るので、原因が一発でわかる
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ message: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
