"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RecipeIngredient = {
  name: string;
  amount: string;
};

type RecipeDetail = {
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
type ApiRecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  time_minutes?: number | null;
  servings?: number | null;
  steps?: string[] | null;
  notes?: string | null;
  // recipe_ingredients を返す実装にした場合のみ
  ingredients?: { name: string; amount: string }[] | null;
};

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        setErrorMsg(null);
        setNotFound(false);

        const res = await fetch(`/api/recipes/${id}`, { cache: "no-store" });
        const data = (await res.json()) as any;

        if (!alive) return;

        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error(data?.error ?? `failed (status=${res.status})`);
        }

        const api = data as ApiRecipeDetail;

        // UI用に整形（snake_case → camelCase）
        const mapped: RecipeDetail = {
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

        setRecipe(mapped);
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
  }, [id]);

  if (loading) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (notFound || !recipe) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <p>レシピが見つかりません。</p>
        {errorMsg && <p style={{ color: "#a11" }}>エラー：{errorMsg}</p>}
        <a href="/recipes">← レシピ一覧へ戻る</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ===== ヘッダー ===== */}
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>{recipe.title}</h1>

        {recipe.description && (
          <p style={{ color: "#555", marginTop: 6 }}>{recipe.description}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {recipe.timeMinutes && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(200,247,220,0.6)",
              }}
            >
              ⏱ {recipe.timeMinutes}分
            </span>
          )}

          {recipe.servings && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(179,229,255,0.6)",
              }}
            >
              🍽 {recipe.servings}人分
            </span>
          )}
        </div>
      </header>

      {/* ===== 献立に使う（将来） ===== */}
      <section style={{ marginBottom: 20 }}>
        <button
          type="button"
          disabled
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px dashed rgba(0,0,0,0.3)",
            background: "rgba(255,255,255,0.7)",
            fontWeight: 900,
          }}
        >
          献立に使う（準備中）
        </button>
      </section>

      {/* ===== 材料 ===== */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>材料</h2>

        {recipe.ingredients.length === 0 ? (
          <p style={{ color: "#555" }}>材料データが未登録です。</p>
        ) : (
          <ul style={{ paddingLeft: 16 }}>
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                {ing.name}（{ing.amount}）
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== 作り方 ===== */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>作り方</h2>

        {recipe.steps.length === 0 ? (
          <p style={{ color: "#555" }}>手順データが未登録です。</p>
        ) : (
          <ol style={{ paddingLeft: 18 }}>
            {recipe.steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: 8 }}>
                {step}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ===== メモ ===== */}
      {recipe.notes && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>メモ</h2>
          <p style={{ color: "#555" }}>{recipe.notes}</p>
        </section>
      )}

      {/* ===== フッター ===== */}
      <footer>
        <a href="/recipes" style={{ color: "#1f5fa5", fontWeight: 800 }}>
          ← レシピ一覧へ戻る
        </a>
      </footer>
    </main>
  );
}
