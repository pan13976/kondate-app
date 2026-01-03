// src/lib/recipesApi.ts
import { supabase } from "./supabaseClient";
import type { ApiRecipe } from "../types/recipe";
export type RecipeListItem = {
  id: string;
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  tags?: string[] | null;
  mainCategory?: string | null; // ★追加  
};

export type RecipeIngredient = { name: string; amount: string };

export type RecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  servings?: number | null;
  mainCategory?: string | null; // ★追加
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string | null;
};


export async function getRecipes(): Promise<RecipeListItem[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,description,time_minutes,tags,main_category") // ★追加
    .order("created_at", { ascending: false });



  if (error) throw error;
  // DBの返却（snake_case）をそのままAPIで返す
  return (data ?? []) as ApiRecipe[];
}

export async function getRecipeById(id: string): Promise<RecipeDetail | null> {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("id,title,description,time_minutes,servings,steps,notes,main_category")
    .eq("id", id)
    .maybeSingle();

  if (recipeError) throw recipeError;
  if (!recipe) return null;

  const { data: ingredients, error: ingError } = await supabase
    .from("recipe_ingredients")
    .select("name,amount,sort_order")
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true });

  if (ingError) throw ingError;

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    timeMinutes: recipe.time_minutes,
    servings: recipe.servings,
    mainCategory: recipe.main_category,
    ingredients: (ingredients ?? []).map((i) => ({ name: i.name, amount: i.amount })),
    steps: recipe.steps ?? [],
    notes: recipe.notes,
  };
}

export type CreateRecipeInput = {
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  tags?: string[] | null;
  mainCategory: string; // 固定リスト
  servings?: number | null;
  steps?: string[] | null;
  notes?: string | null;
  ingredients: { name: string; amount: string }[];
};

const MAIN_CATEGORIES = [
  "主菜", "副菜", "主食", "汁物", "麺", "サラダ", "おやつ", "作り置き", "その他",
] as const;

function isValidMainCategory(v: string) {
  return (MAIN_CATEGORIES as readonly string[]).includes(v);
}

export async function createRecipe(input: CreateRecipeInput): Promise<{ id: string }> {
  if (!input.title.trim()) throw new Error("title_required");
  if (!isValidMainCategory(input.mainCategory)) throw new Error("invalid_main_category");

  // 1) recipes を作成
  const { data: created, error: createErr } = await supabase
    .from("recipes")
    .insert({
      title: input.title.trim(),
      description: input.description ?? null,
      time_minutes: input.timeMinutes ?? null,
      tags: input.tags ?? [],
      main_category: input.mainCategory,
      servings: input.servings ?? null,
      steps: input.steps ?? [],
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (createErr) throw createErr;

  const recipeId = created.id as string;

  // 2) ingredients を作成（0件でもOK）
  const ings = (input.ingredients ?? [])
    .filter((i) => i.name.trim() && i.amount.trim())
    .map((i, idx) => ({
      recipe_id: recipeId,
      name: i.name.trim(),
      amount: i.amount.trim(),
      sort_order: idx + 1,
    }));

  if (ings.length > 0) {
    const { error: ingErr } = await supabase.from("recipe_ingredients").insert(ings);
    if (ingErr) throw ingErr;
  }

  return { id: recipeId };
}

