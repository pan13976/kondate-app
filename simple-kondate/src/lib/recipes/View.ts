import type { ApiRecipe, Recipe } from "../../types/recipe";

const CATEGORY_ORDER = [
  "主菜",
  "副菜",
  "主食",
  "汁物",
  "麺",
  "サラダ",
  "おやつ",
  "作り置き",
  "その他",
];

export function groupByMainCategory(filtered: Recipe[]) {
  const map = new Map<string, Recipe[]>();

  for (const r of filtered) {
    const key =
      r.mainCategory && r.mainCategory.trim() ? r.mainCategory.trim() : "その他";
    map.set(key, [...(map.get(key) ?? []), r]);
  }

  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a[0]);
    const bi = CATEGORY_ORDER.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return new Map(entries);
}

export function normalizeTag(tag: string) {
  return tag.trim();
}

export function mapApiRecipe(r: ApiRecipe): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    timeMinutes: r.time_minutes ?? null,
    tags: (r.tags ?? []).map(normalizeTag),
    // ★ここが重要：ApiRecipe は main_category を持つ想定
    mainCategory: (r.main_category ?? "その他").trim(),
  };
}

export function buildAllTags(recipes: Recipe[]) {
  const s = new Set<string>();
  for (const r of recipes) {
    for (const t of r.tags ?? []) {
      const nt = normalizeTag(t);
      if (nt) s.add(nt);
    }
  }
  return ["すべて", ...Array.from(s).sort((a, b) => a.localeCompare(b, "ja"))];
}

export function recipeMatchesQuery(r: Recipe, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [r.title ?? "", r.description ?? "", ...(r.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function filterRecipes(recipes: Recipe[], query: string, selectedTag: string) {
  return recipes.filter((r) => {
    if (!recipeMatchesQuery(r, query)) return false;
    if (selectedTag === "すべて") return true;
    return (r.tags ?? []).includes(selectedTag);
  });
}

export function groupByTag(filtered: Recipe[], selectedTag: string) {
  const map = new Map<string, Recipe[]>();

  if (selectedTag !== "すべて") {
    map.set(selectedTag, filtered);
    return map;
  }

  // すべて表示：タグをキーにして分類。タグがないものは「未分類」へ。
  for (const r of filtered) {
    const tags = (r.tags ?? []).filter(Boolean).map(normalizeTag);
    if (tags.length === 0) {
      const key = "未分類";
      map.set(key, [...(map.get(key) ?? []), r]);
      continue;
    }
    for (const t of tags) {
      map.set(t, [...(map.get(t) ?? []), r]);
    }
  }

  // ソート：件数多い順 → 同件数は日本語順、未分類は最後
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    const aKey = a[0];
    const bKey = b[0];
    if (aKey === "未分類") return 1;
    if (bKey === "未分類") return -1;
    const diff = (b[1]?.length ?? 0) - (a[1]?.length ?? 0);
    if (diff !== 0) return diff;
    return aKey.localeCompare(bKey, "ja");
  });

  return new Map(entries);
}
// src/lib/recipes/view.ts
// コメント多め：DTO(=API/DB) → UI用(=camelCase) の唯一の変換点にする

export type RecipeIngredient = { name: string; amount: string };

export type RecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  servings?: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string | null;
};

// APIが返す形（snake_case）
// ※ route.ts が返すJSON構造に合わせる（あなたの実装に合わせている）
export type ApiRecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  time_minutes?: number | null;
  servings?: number | null;
  steps?: string[] | null;
  notes?: string | null;
  ingredients?: { name: string; amount: string }[] | null;
};

/**
 * APIのレスポンス（snake_case）を UI用（camelCase）に整形する
 * - ここ以外で time_minutes / ingredients? などを触らないルールにすると事故らない
 */
export function mapApiRecipeDetail(api: ApiRecipeDetail): RecipeDetail {
  return {
    id: api.id,
    title: api.title,
    description: api.description ?? null,
    timeMinutes: api.time_minutes ?? null,
    servings: api.servings ?? null,
    ingredients: (api.ingredients ?? []).map((i) => ({
      name: i.name,
      amount: i.amount,
    })),
    steps: api.steps ?? [],
    notes: api.notes ?? null,
  };
}
