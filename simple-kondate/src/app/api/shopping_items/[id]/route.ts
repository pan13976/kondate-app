// src/app/api/shopping_items/[id]/route.ts

import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

type Body = { checked?: boolean };

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Body | null;
  const checked = body?.checked;

  if (typeof checked !== "boolean") {
    return NextResponse.json({ message: "checked (boolean) is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shopping_items")
    .update({ checked })
    .eq("id", id)
    .select("id,name,amount,checked,sort_order")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 200 });
}
