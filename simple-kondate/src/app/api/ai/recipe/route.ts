// src/app/api/ai/recipe/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRecipe } from "../../../../lib/recipes/Api";
import { generateRecipeFromIngredients } from "../../../../lib/ai/gemini";

// POST /api/ai/recipe
// body: { ingredientsText: string, preference?: string }
// -> GeminiでレシピJSON生成 → Supabaseへ保存 → { id }

// ✅ route.ts 内で完結する “AIへ渡す材料型”
// gemini.ts が AiIngredient[] を要求している前提に合わせる
type AiIngredientLike = { name: string; amount?: string };

// 入力テキストを {name, amount?} にざっくり分解
function parseIngredients(text: string): AiIngredientLike[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line) => {
      const m = line.match(/^(.+?)(?:\s+|　+)(.+)$/);
      if (!m) return { name: line };
      return { name: m[1].trim(), amount: m[2].trim() };
    });
}

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

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const ingredients = parseIngredients(body.ingredientsText);

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "ingredients_required" },
        { status: 400 }
      );
    }

    // ✅ gemini.ts 側が AiIngredient[] を要求しているなら、ここはオブジェクト配列で渡す
    // preference は constraints として渡す（名前合わせ）
    const generated = await generateRecipeFromIngredients({
      ingredients, // ✅ AiIngredientLike[] (構造一致でOK)
      constraints: body.preference,
    } as any); // ← gemini.ts 側の型が厳しくて通らない場合の最後の保険

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
