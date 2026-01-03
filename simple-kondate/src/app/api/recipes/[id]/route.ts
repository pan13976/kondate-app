import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(req: Request) {
    const pathname = new URL(req.url).pathname;
    const id = pathname.split("/").pop(); // ← /api/recipes/<id> の最後を取る

    const isUuid =
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (!isUuid) {
        return NextResponse.json(
            { error: "invalid_id", got: id, pathname },
            { status: 400 }
        );
    }

    // recipes 本体
    const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("id,title,description,time_minutes,tags,servings,steps,notes,main_category")
        .eq("id", id)
        .maybeSingle();

    if (recipeError) {
        return NextResponse.json({ error: recipeError.message }, { status: 500 });
    }
    if (!recipe) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // B案：ingredients（別テーブル）
    const { data: ings, error: ingError } = await supabase
        .from("recipe_ingredients")
        .select("name,amount,sort_order")
        .eq("recipe_id", id)
        .order("sort_order", { ascending: true });

    if (ingError) {
        return NextResponse.json({ error: ingError.message }, { status: 500 });
    }

    return NextResponse.json({
        ...recipe,
        ingredients: (ings ?? []).map((i) => ({ name: i.name, amount: i.amount })),
    });
}

export async function PUT(req: Request) {
  const pathname = new URL(req.url).pathname;
  const id = pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json();

  const { error } = await supabase
    .from("recipes")
    .update({
      title: body.title,
      description: body.description ?? null,
      time_minutes: body.timeMinutes ?? null,
      servings: body.servings ?? null,
      tags: body.tags ?? [],
      main_category: body.mainCategory,
      steps: body.steps ?? [],
      notes: body.notes ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 材料は一旦全削除 → 再insert（シンプルで安全）
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);

  if (Array.isArray(body.ingredients)) {
    const rows = body.ingredients.map((i: any, idx: number) => ({
      recipe_id: id,
      name: i.name,
      amount: i.amount,
      sort_order: idx + 1,
    }));
    if (rows.length > 0) {
      await supabase.from("recipe_ingredients").insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const pathname = new URL(req.url).pathname;
  const id = pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // 子テーブル → 親テーブルの順で削除
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}