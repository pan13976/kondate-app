import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// GET /api/kondates
export async function GET() {
  const { data, error } = await supabase
    .from("kondates")
    .select("*")
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/kondates
export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabase
    .from("kondates")
    .insert({ title: body.title });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
