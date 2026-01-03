"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiRecipe, Recipe } from "../../types/recipe";
import { buildAllTags, filterRecipes, mapApiRecipe, groupByMainCategory } from "../../lib/recipes/recipesView";
import { getRecipeById, type RecipeDetail } from "../../lib/recipes/Api";
import type { Category } from "../../types/kondate";

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("すべて");
  const [openTags, setOpenTags] = useState<Record<string, boolean>>({});

  // ===== 献立に追加（一覧からも使う） =====
  const [openAdd, setOpenAdd] = useState(false);
  const [mealDate, setMealDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [category, setCategory] = useState<Category>("夜");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErrorMsg(null);
        setLoading(true);

        const res = await fetch("/api/recipes", { cache: "no-store" });
        const data = (await res.json()) as ApiRecipe[];

        if (!res.ok) {
          const msg = (data as any)?.error ?? `failed_to_fetch (status=${res.status})`;
          throw new Error(msg);
        }

        const mapped = (data ?? []).map(mapApiRecipe);
        if (!alive) return;
        setRecipes(mapped);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(String(e?.message ?? e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const allTags = useMemo(() => buildAllTags(recipes), [recipes]);

  const filtered = useMemo(() => filterRecipes(recipes, query, selectedTag), [recipes, query, selectedTag]);

  const grouped = useMemo(() => groupByMainCategory(filtered), [filtered]);

  // 初回：すべて表示のとき、グループを自動で展開
  useEffect(() => {
    if (selectedTag !== "すべて") return;
    if (Object.keys(openTags).length > 0) return;

    const next: Record<string, boolean> = {};
    for (const t of Array.from(grouped.keys())) next[t] = true;
    setOpenTags(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, selectedTag]);

  function toggleGroup(tag: string) {
    setOpenTags((prev) => ({ ...prev, [tag]: !prev[tag] }));
  }

  async function openAddModalByRecipeId(recipeId: string) {
    try {
      if (adding) return;
      setActionErrorMsg(null);

      // ★材料込み詳細を取得（詳細画面と同じ前提）
      const detail = await getRecipeById(recipeId);
      if (!detail) {
        setActionErrorMsg("レシピが見つかりませんでした");
        return;
      }

      setSelectedRecipe(detail);
      setOpenAdd(true);
    } catch (e: any) {
      setActionErrorMsg(String(e?.message ?? e));
    }
  }

  async function addSelectedRecipeToKondate() {
    if (!selectedRecipe) return;
    if (adding) return;
    if (!mealDate) {
      alert("日付を選択してください");
      return;
    }

    try {
      setAdding(true);
      setActionErrorMsg(null);

      const res = await fetch("/api/kondates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: selectedRecipe.title,
          category,
          meal_date: mealDate,
          recipe_id: selectedRecipe.id,
          ingredients: selectedRecipe.ingredients,
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error ?? `failed (status=${res.status})`);

      setOpenAdd(false);
      location.href = "/kondates";
    } catch (e: any) {
      setActionErrorMsg(String(e?.message ?? e));
    } finally {
      setAdding(false);
    }
  }

  return {
    recipes,
    loading,
    errorMsg,

    query,
    setQuery,
    selectedTag,
    setSelectedTag,

    allTags,
    filtered,
    grouped,

    openTags,
    toggleGroup,

    // 献立追加モーダル（一覧からも）
    openAdd,
    setOpenAdd,
    mealDate,
    setMealDate,
    category,
    setCategory,
    selectedRecipe,
    adding,
    actionErrorMsg,
    openAddModalByRecipeId,
    addSelectedRecipeToKondate,
  };
}
