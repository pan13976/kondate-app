// src/app/recipes/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ★ここはあなたの指定どおり（Api の A が大文字）
import { getRecipeById } from "../../../lib/recipes/Api";
import type { Category } from "../../../types/kondate";

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
  mainCategory?: string | null;
};

const circled = (n: number) => {
  const code = 9311 + n; // ①=9312
  if (n >= 1 && n <= 20) return String.fromCharCode(code);
  return String(n);
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ===== 献立に追加（モーダル） =====
  const todayYmd = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [openAdd, setOpenAdd] = useState(false);
  const [mealDate, setMealDate] = useState(todayYmd);
  const [category, setCategory] = useState<Category>("夜");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setNotFound(false);

        // ★あなたの lib 関数で取得（camelCaseに整形済みの想定）
        const detail = await getRecipeById(id);

        if (!alive) return;

        if (!detail) {
          setNotFound(true);
          return;
        }

        // getRecipeById の返却型に mainCategory 等が含まれていればそのまま入る
        setRecipe(detail as any);
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

  async function onAddToKondate() {
    if (!recipe) return;
    if (adding) return;

    // 軽いガード
    if (!mealDate) {
      alert("日付を選択してください");
      return;
    }

    try {
      setAdding(true);
      setErrorMsg(null);

      // APIルール：snake_case で送る
      const res = await fetch("/api/kondates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          category, // "朝" | "昼" | "夜" | "弁当"
          meal_date: mealDate,
          recipe_id: recipe.id, // ★DBに追加したカラム
          ingredients: recipe.ingredients, // ★追加（[{name,amount}]）
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(data?.error ?? `failed (status=${res.status})`);
      }

      // 追加できたら献立へ
      setOpenAdd(false);
      router.push("/kondates");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setAdding(false);
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

  // モーダル（スマホ前提：下から出る）
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 12,
    zIndex: 50,
  };

  const modalStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(0,0,0,0.10)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    padding: 14,
    backdropFilter: "blur(8px)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "#444",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.9)",
    fontWeight: 800,
    outline: "none",
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(200,247,220,0.75)",
    fontWeight: 900,
    cursor: adding ? "not-allowed" : "pointer",
  };

  const cancelBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    fontWeight: 900,
    cursor: adding ? "not-allowed" : "pointer",
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
          {recipe.timeMinutes != null && recipe.timeMinutes !== 0 && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(200,247,220,0.6)",
                fontWeight: 900,
              }}
            >
              ⏱ {recipe.timeMinutes}分
            </span>
          )}

          {recipe.servings != null && recipe.servings !== 0 && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(179,229,255,0.6)",
                fontWeight: 900,
              }}
            >
              🍽 {recipe.servings}人分
            </span>
          )}

          {recipe.mainCategory ? (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(240,240,240,0.9)",
                fontWeight: 900,
              }}
            >
              📌 {recipe.mainCategory}
            </span>
          ) : null}
        </div>

        {/* 献立に追加 / 編集 / 削除 */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(200,247,220,0.75)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🍱 献立に追加
          </button>

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

      {/* ===== 献立に追加：モーダル ===== */}
      {openAdd && (
        <div
          style={overlayStyle}
          onClick={() => {
            if (!adding) setOpenAdd(false);
          }}
        >
          <div
            style={modalStyle}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>献立に追加</div>
              <button
                type="button"
                onClick={() => setOpenAdd(false)}
                disabled={adding}
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: adding ? "not-allowed" : "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ marginTop: 10, marginBottom: 0, color: "#555", fontWeight: 800 }}>
              「{recipe.title}」を献立に追加します
            </p>

            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>日付</div>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                style={inputStyle}
                disabled={adding}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>区分</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={inputStyle}
                disabled={adding}
              >
                <option value="朝">朝</option>
                <option value="昼">昼</option>
                <option value="夜">夜</option>
                <option value="弁当">弁当</option>
              </select>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={onAddToKondate}
                disabled={adding}
                style={{
                  ...primaryBtnStyle,
                  opacity: adding ? 0.7 : 1,
                }}
              >
                {adding ? "追加中…" : "追加する"}
              </button>

              <button
                type="button"
                onClick={() => setOpenAdd(false)}
                disabled={adding}
                style={{
                  ...cancelBtnStyle,
                  opacity: adding ? 0.7 : 1,
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div style={{ lineHeight: 1.75, fontWeight: 700, color: "#333" }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== メモ ===== */}
      {recipe.notes && (
        <section style={{ ...cardStyle, marginBottom: 14 }}>
          <h2 style={cardTitleStyle}>メモ</h2>
          <p style={{ color: "#555", lineHeight: 1.6, margin: 0, fontWeight: 700 }}>
            {recipe.notes}
          </p>
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
