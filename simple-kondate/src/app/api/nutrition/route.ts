// src/app/api/nutrition/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * 受け取る材料（分量）の型
 * ※ いまはダミーなので、内容は使わず固定値を返します
 */
type Ingredient = {
  name: string;
  amount: string;
};

export async function POST(request: NextRequest) {
  // 1) body を受け取る（失敗しても null にする）
  const body = (await request.json().catch(() => null)) as
    | { title?: string; ingredients?: Ingredient[] }
    | null;

  const title = body?.title ?? "";
  const ingredients = Array.isArray(body?.ingredients) ? body!.ingredients : [];

  // 2) 最低限のバリデーション（titleもingredientsも空なら弾く）
  if (!title && ingredients.length === 0) {
    return NextResponse.json(
      { message: "title または ingredients が必要です" },
      { status: 400 }
    );
  }

  // 3) ダミー結果（ここを後で GPT 呼び出しに差し替える）
  //    いまは必ず同じ値を返すので「配線確認」専用
  const result = {
    energy_kcal: 650,
    protein_g: 28,
    fat_g: 22,
    carbs_g: 75,
    note: "※ダミー結果（後でGPTに差し替え）",
    echo: { title, ingredientsCount: ingredients.length }, // デバッグ用
  };

  return NextResponse.json({ nutrition: result });
}
