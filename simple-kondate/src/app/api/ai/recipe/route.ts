// src/app/api/ai/recipe/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRecipe } from "../../../../lib/recipes/Api";
import { generateRecipeFromIngredients } from "../../../../lib/ai/gemini";

// POST /api/ai/recipe
// body: { ingredientsText: string, preference?: string }
// -> GeminiでレシピJSON生成 → Supabaseへ保存 → { id }

const BodySchema = z.object({
  ingredientsText: z.string().max(4000).default(""),
  preference: z.string().max(2000).optional(),
});

const GeneratedSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  timeMinutes: z.number().nullable().optional(),
  servings: z.number().nullable().optional(),
  mainCategory: z.string().min(1),
  tags: z.array(z.string()).optional().nullable(),
  ingredients: z
    .array(z.object({ name: z.string().min(1), amount: z.string().min(1) }))
    .default([]),
  steps: z.array(z.string().min(1)).default([]),
  notes: z.string().nullable().optional(),
});

function parseIngredientLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = BodySchema.parse(raw);

    const ingredientLines = parseIngredientLines(body.ingredientsText);
    if (ingredientLines.length === 0) {
      return NextResponse.json(
        { error: "ingredients_required" },
        { status: 400 }
      );
    }

    // ✅ gemini.ts 側の実export名に合わせる
    const generated = await generateRecipeFromIngredients({
      ingredients: ingredientLines,
      constraints: body.preference,
    });

    const parsed = GeneratedSchema.parse(generated);

    const created = await createRecipe({
      title: parsed.title,
      description: parsed.description ?? null,
      timeMinutes: parsed.timeMinutes ?? null,
      tags: parsed.tags ?? [],
      mainCategory: parsed.mainCategory,
      servings: parsed.servings ?? null,
      steps: parsed.steps ?? [],
      notes: parsed.notes ?? null,
      ingredients: parsed.ingredients ?? [],
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { error: "invalid_request", details: e.flatten?.() ?? e },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 400 });
  }
}
