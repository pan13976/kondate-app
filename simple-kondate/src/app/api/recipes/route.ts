import { NextResponse } from "next/server";
import { getRecipes, createRecipe } from "../../../lib/recipesApi";

export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json(recipes);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createRecipe(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 400 });
  }
}