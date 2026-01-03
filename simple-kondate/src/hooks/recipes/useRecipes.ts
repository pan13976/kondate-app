"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiRecipe, Recipe } from "../../types/recipe";
import { buildAllTags, filterRecipes, groupByTag, mapApiRecipe, groupByMainCategory } from "../../lib/recipes/recipesView";

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState("すべて");

    const [openTags, setOpenTags] = useState<Record<string, boolean>>({});

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

    const filtered = useMemo(
        () => filterRecipes(recipes, query, selectedTag),
        [recipes, query, selectedTag]
    );

    const grouped = useMemo(
        () => groupByMainCategory(filtered),
        [filtered]
    );

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
    };
}
