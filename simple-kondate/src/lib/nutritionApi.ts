// src/lib/nutritionApi.ts
type Ingredient = { name: string; amount: string };

export type NutritionResult = {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  note?: string;
  echo?: { title: string; ingredientsCount: number };
};

export async function apiCalcNutrition(input: {
  title: string;
  ingredients: Ingredient[];
}): Promise<NutritionResult> {
  const res = await fetch("/api/nutrition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "栄養計算に失敗しました");

  // { nutrition: {...} } を返す設計
  return json.nutrition as NutritionResult;
}
