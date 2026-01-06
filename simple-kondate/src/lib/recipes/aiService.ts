// src/lib/recipes/aiService.ts
// ブラウザ（Client Component）から「材料→AI生成→レシピ保存」を叩く薄いラッパ。

export type AiCreateRecipeRequest = {
  ingredientsText: string;
  preference?: string;
};

export type AiCreateRecipeResponse = {
  id: string;
};

export async function apiAiCreateRecipe(
  req: AiCreateRecipeRequest
): Promise<AiCreateRecipeResponse> {
  const res = await fetch("/api/ai/recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.error ?? "ai_create_failed";
    throw new Error(msg);
  }
  return json as AiCreateRecipeResponse;
}
