// src/app/recipes/[id]/page.tsx
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
  ingredients?: { name: string; amount: string }[] | null;
};

const circled = (n: number) => {
  const code = 9311 + n; // ①=9312
  if (n >= 1 && n <= 20) return String.fromCharCode(code);
  return String(n);
};

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function onDelete() {
    if (!recipe) return;
    if (deleting) return;

    const ok = confirm("このレシピを削除しますか？（元に戻せません）");
    if (!ok) return;

    try {
      setDeleting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        throw new Error(data?.error ?? `failed (status=${res.status})`);
      }

      location.href = "/recipes";
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setDeleting(false);
    }
  }

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

  /* ===== 共通カードスタイル ===== */
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 10,
  };

  // 材料（2列）
  const ingRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    padding: "10px 6px",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    alignItems: "center",
  };

  const ingAmountStyle: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 13,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(179,229,255,0.45)",
    whiteSpace: "nowrap",
  };

  // 作り方（①②③チップ）
  const stepRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 10,
    padding: "10px 6px",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    alignItems: "start",
  };

  const stepChipStyle: React.CSSProperties = {
    minWidth: 34,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 13,
    background: "rgba(200,247,220,0.55)",
    border: "1px solid rgba(0,0,0,0.06)",
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ===== ヘッダー ===== */}
      <header style={{ marginBottom: 14 }}>
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

        {/* 編集 / 削除 */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <a
            href={`/recipes/${recipe.id}/edit`}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(179,229,255,0.45)",
              fontWeight: 900,
              textDecoration: "none",
              color: "#1f5fa5",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✏️ 編集
          </a>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(255,230,230,0.85)",
              color: "#a11",
              fontWeight: 900,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "削除中…" : "🗑 削除"}
          </button>
        </div>

        {errorMsg && (
          <p style={{ color: "#a11", fontWeight: 800, marginTop: 10 }}>
            エラー：{errorMsg}
          </p>
        )}
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

      {/* ===== 材料（2列） ===== */}
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <h2 style={cardTitleStyle}>材料</h2>

        {recipe.ingredients.length === 0 ? (
          <p style={{ color: "#555" }}>材料データが未登録です。</p>
        ) : (
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            {recipe.ingredients.map((ing, idx) => (
              <div
                key={idx}
                style={{
                  ...ingRowStyle,
                  borderTop: idx === 0 ? "none" : ingRowStyle.borderTop,
                }}
              >
                <div style={{ fontWeight: 800, lineHeight: 1.4 }}>{ing.name}</div>
                <div style={ingAmountStyle}>{ing.amount}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 作り方（①②③チップ） ===== */}
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <h2 style={cardTitleStyle}>作り方</h2>

        {recipe.steps.length === 0 ? (
          <p style={{ color: "#555" }}>手順データが未登録です。</p>
        ) : (
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            {recipe.steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  ...stepRowStyle,
                  borderTop: idx === 0 ? "none" : stepRowStyle.borderTop,
                }}
              >
                <span style={stepChipStyle}>{circled(idx + 1)}</span>
                <div style={{ lineHeight: 1.75 }}>{step}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== メモ ===== */}
      {recipe.notes && (
        <section style={{ ...cardStyle, marginBottom: 14 }}>
          <h2 style={cardTitleStyle}>メモ</h2>
          <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>{recipe.notes}</p>
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
