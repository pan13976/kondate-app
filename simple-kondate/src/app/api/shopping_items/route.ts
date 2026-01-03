// src/app/api/shopping_items/route.ts

import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

type Body = {
  shopping_list_id?: string;
  name?: string;
  amount?: string | null;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const shopping_list_id = body?.shopping_list_id?.trim();
  const name = body?.name?.trim();
  const amount = body?.amount?.trim() || null;

  if (!shopping_list_id) {
    return NextResponse.json({ message: "shopping_list_id is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  // sort_order は末尾に追加（最大+1）
  const { data: maxRow } = await supabase
    .from("shopping_items")
    .select("sort_order")
    .eq("shopping_list_id", shopping_list_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("shopping_items")
    .insert({
      shopping_list_id,
      name,
      amount,
      checked: false,
      sort_order: nextOrder,
    })
    .select("id,name,amount,checked,sort_order")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 200 });
}
