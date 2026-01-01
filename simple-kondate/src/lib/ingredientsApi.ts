// src/lib/ingredientsApi.ts

export type IngredientMaster = {
  id: number;
  name_ja: string;
  category: string;
};

/**
 * 食材マスタを取得する
 * - category を渡せば絞り込み
 */
export async function apiFetchIngredients(category?: string): Promise<IngredientMaster[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/ingredients${qs}`);
  const json = await res.json();

  if (!res.ok) throw new Error(json?.message ?? "食材マスタ取得に失敗しました");

  return json.items as IngredientMaster[];
}
