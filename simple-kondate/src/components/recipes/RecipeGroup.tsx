"use client";

import type { Recipe } from "../../types/recipe";
import { RecipeCard } from "./RecipeCard";

export function RecipeGroup({
  tag,
  items,
  onUse,
  collapsible,
  isOpen,
  onToggle,
}: {
  tag: string;
  items: Recipe[];
  onUse: (recipeId: string) => void;
  collapsible: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (collapsible) onToggle();
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontWeight: 900,
          fontSize: 14,
          cursor: collapsible ? "pointer" : "default",
        }}
      >
        <span>
          {tag} <span style={{ color: "#666", fontWeight: 800 }}>（{items.length}）</span>
        </span>
        {collapsible ? <span style={{ color: "#666", fontWeight: 900 }}>{isOpen ? "−" : "＋"}</span> : null}
      </button>

      {isOpen ? (
        <div style={{ padding: "0 12px 12px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {items.map((r) => (
              <RecipeCard key={r.id} recipe={r} onUse={onUse} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
