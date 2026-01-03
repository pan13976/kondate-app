// src/components/recipes/RecipeCard.tsx
"use client";

import { useRouter } from "next/navigation";
import type { Recipe } from "../../types/recipe";

export function RecipeCard({
  recipe,
  onUse,
}: {
  recipe: Recipe;
  onUse: (recipeId: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900 }}>{recipe.title}</div>

      {recipe.description && (
        <div style={{ fontSize: 13, color: "#555", marginTop: 4, lineHeight: 1.5 }}>
          {recipe.description}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {recipe.timeMinutes ? (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(200,247,220,0.6)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            ⏱ {recipe.timeMinutes}分
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 13 }}>
        <button
          type="button"
          onClick={() => router.push(`/recipes/${recipe.id}`)}
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#1f5fa5",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          詳細を見る →
        </button>

        <button
          type="button"
          onClick={() => onUse(recipe.id)}
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#1f5fa5",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          献立に使う
        </button>
      </div>
    </div>
  );
}
