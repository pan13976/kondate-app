import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isFinite(numId)) {
    return NextResponse.json({ message: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { title?: string } | null;
  const title = body?.title?.trim();

  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("kondates")
    .update({ title })
    .eq("id", numId)
    .select("id,title,category,meal_date,created_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ kondate: data });
}
