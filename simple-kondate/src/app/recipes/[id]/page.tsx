"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AddToKondateModal } from "../../../components/recipes/AddToKondateModal";

// ★ここは指定どおり（Api の A が大文字）
import { getRecipeById, type RecipeDetail } from "../../../lib/recipes/Api";
import type { Category } from "../../../types/kondate";

const circled = (n: number) => {
  // ①(9312)〜⑳(9331)
  const code = 9311 + n;
  return String.fromCharCode(code);
};

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);

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
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        if (!id) throw new Error("missing_id");

        const detail = await getRecipeById(id);
        if (!detail) throw new Error("recipe_not_found");

        if (!alive) return;
        setRecipe(detail);
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
    if (!id) return;
    const ok = confirm("このレシピを削除します。よろしいですか？");
    if (!ok) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error ?? `failed (status=${res.status})`);

      router.push("/recipes");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function addToKondate() {
    if (!recipe) return;
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
          title: recipe.title,
          category,
          meal_date: mealDate,
          recipe_id: recipe.id,
          ingredients: recipe.ingredients,
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error ?? `failed (status=${res.status})`);

      setOpenAdd(false);
      router.push("/kondates");
    } catch (e: any) {
      setActionErrorMsg(String(e?.message ?? e));
    } finally {
      setAdding(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => router.push("/recipes")}
          style={{
            border: "none",
            background: "transparent",
            color: "#1f5fa5",
            fontWeight: 900,
            padding: 0,
            cursor: "pointer",
          }}
        >
          ← レシピ一覧へ
        </button>
      </header>

      {loading ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#555",
          }}
        >
          読み込み中…
        </div>
      ) : null}

      {errorMsg ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,230,230,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#a11",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          エラー：{errorMsg}
        </div>
      ) : null}

      {!loading && recipe ? (
        <section
          style={{
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>{recipe.title}</div>
          {recipe.description ? (
            <div style={{ marginTop: 6, color: "#555", fontSize: 14, lineHeight: 1.5 }}>{recipe.description}</div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {recipe.mainCategory ? (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(179,229,255,0.55)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontWeight: 900,
                }}
              >
                {recipe.mainCategory}
              </span>
            ) : null}
            {recipe.timeMinutes ? (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(200,247,220,0.6)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontWeight: 900,
                }}
              >
                ⏱ {recipe.timeMinutes}分
              </span>
            ) : null}
            {recipe.servings ? (
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(255,240,200,0.65)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontWeight: 900,
                }}
              >
                👥 {recipe.servings}人分
              </span>
            ) : null}
          </div>

          {/* アクション */}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setActionErrorMsg(null);
                setOpenAdd(true);
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.10)",
                background: "rgba(200,247,220,0.75)",
                fontWeight: 900,
              }}
            >
              🍱 献立に使う
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(255,255,255,0.85)",
                  fontWeight: 900,
                }}
              >
                編集
              </button>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(255,230,230,0.85)",
                  fontWeight: 900,
                  color: "#a11",
                }}
              >
                削除
              </button>
            </div>
          </div>

          {/* 材料 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>材料</div>
            {recipe.ingredients.length === 0 ? (
              <div style={{ color: "#666", fontSize: 13 }}>未登録</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {recipe.ingredients.map((ing, idx) => (
                  <div
                    key={`${ing.name}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.75)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{ing.name}</div>
                    <div style={{ color: "#555", fontWeight: 800 }}>{ing.amount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 作り方 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>作り方</div>
            {recipe.steps.length === 0 ? (
              <div style={{ color: "#666", fontSize: 13 }}>未登録</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {recipe.steps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.75)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 32,
                        height: 28,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(179,229,255,0.55)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        fontWeight: 900,
                      }}
                    >
                      {circled(idx + 1)}
                    </div>
                    <div style={{ lineHeight: 1.5 }}>{step}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* メモ */}
          {recipe.notes ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>メモ</div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  lineHeight: 1.6,
                }}
              >
                {recipe.notes}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <AddToKondateModal
        open={openAdd}
        recipe={recipe}
        mealDate={mealDate}
        setMealDate={setMealDate}
        category={category}
        setCategory={setCategory}
        adding={adding}
        errorMsg={actionErrorMsg}
        onClose={() => {
          if (!adding) setOpenAdd(false);
        }}
        onSubmit={addToKondate}
      />
    </main>
  );
}
