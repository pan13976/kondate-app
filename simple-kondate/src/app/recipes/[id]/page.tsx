// src/app/recipes/page.tsx
"use client";

import { useMemo, useState } from "react";

import { useRecipes } from "../../../hooks/recipes/useRecipes";
import { TagChips } from "../../../components/recipes/TagChips";

// ★ここはあなたの指定どおり（Api の A が大文字）
import { getRecipeById } from "../../../lib/recipes/Api";
import type { Category } from "../../../types/kondate";

type RecipeIngredient = { name: string; amount: string };

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

type RecipeListItem = {
  id: string;
  title: string;
  description?: string | null;
  timeMinutes?: number | null;
  tags?: string[] | null;
  mainCategory?: string | null;
};

export default function RecipesPage() {
  const {
    loading,
    errorMsg: listErrorMsg,
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    allTags,
    filtered,
    grouped,
    openTags,
    toggleGroup,
  } = useRecipes();

  // ===== 献立に追加（一覧から） =====
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

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  async function openAddModalByRecipeId(recipeId: string) {
    try {
      setActionErrorMsg(null);

      // 連打防止（開いてる最中は弾く）
      if (adding) return;

      // ★詳細画面と同じ前提にするため、材料込みの詳細を取得
      const detail = await getRecipeById(recipeId);
      if (!detail) {
        setActionErrorMsg("レシピが見つかりませんでした");
        return;
      }

      setSelectedRecipe(detail as any);
      setOpenAdd(true);
    } catch (e: any) {
      setActionErrorMsg(String(e?.message ?? e));
    }
  }

  async function onAddToKondate() {
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
          category, // "朝" | "昼" | "夜" | "弁当"
          meal_date: mealDate,
          recipe_id: selectedRecipe.id,
          ingredients: selectedRecipe.ingredients, // ★材料も同時に入れる
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(data?.error ?? `failed (status=${res.status})`);
      }

      // 成功：献立へ
      setOpenAdd(false);
      location.href = "/kondates";
    } catch (e: any) {
      setActionErrorMsg(String(e?.message ?? e));
    } finally {
      setAdding(false);
    }
  }

  /* ===== 画面共通スタイル ===== */
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  };

  const groupHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 900,
  };

  const recipeCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  };

  const chipStyle = (bg: string): React.CSSProperties => ({
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    background: bg,
    border: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 900,
    whiteSpace: "nowrap",
  });

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
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>レシピ</h1>
        <p style={{ color: "#555", fontSize: 14 }}>タグでカテゴリ分けして探しやすくします。</p>
      </header>

      {/* ＋ レシピを追加 */}
      <div style={{ marginBottom: 12 }}>
        <a
          href="/recipes/new"
          style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(179,229,255,0.85)",
            fontWeight: 900,
            textAlign: "center",
            textDecoration: "none",
            color: "#222",
          }}
        >
          ＋ レシピを追加
        </a>
      </div>

      {/* 検索 */}
      <div style={{ marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（例：唐揚げ / 作り置き / 野菜）"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
            fontSize: 14,
          }}
        />
      </div>

      {/* タグチップ */}
      <div style={{ marginBottom: 12 }}>
        <TagChips tags={allTags} selectedTag={selectedTag} onSelect={setSelectedTag} />
      </div>

      {/* 一覧取得エラー（useRecipes由来） */}
      {listErrorMsg && (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,230,230,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#a11",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          取得エラー：{listErrorMsg}
        </div>
      )}

      {/* 一覧ロード中 */}
      {loading && (
        <div style={{ ...cardStyle, color: "#555", marginBottom: 12 }}>読み込み中…</div>
      )}

      {/* アクション（献立追加）側のエラー */}
      {actionErrorMsg && (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,230,230,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#a11",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          エラー：{actionErrorMsg}
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "rgba(255,255,255,0.75)",
            border: "1px dashed rgba(0,0,0,0.2)",
            color: "#555",
          }}
        >
          条件に一致するレシピがありません。
        </div>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {Array.from(grouped.entries()).map(([tag, items]) => {
            const collapsible = selectedTag === "すべて";
            const isOpen = collapsible ? !!openTags[tag] : true;

            return (
              <section key={tag} style={{ display: "grid", gap: 10 }}>
                {/* グループヘッダー */}
                <div style={groupHeaderStyle}>
                  <div>
                    {tag} <span style={{ opacity: 0.7 }}>（{items.length}）</span>
                  </div>
                  {collapsible ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(tag)}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontWeight: 900,
                        cursor: "pointer",
                        color: "#333",
                      }}
                      aria-label="toggle"
                    >
                      {isOpen ? "−" : "＋"}
                    </button>
                  ) : (
                    <span style={{ opacity: 0.6 }}>−</span>
                  )}
                </div>

                {/* グループ中身 */}
                {isOpen && (
                  <div style={{ display: "grid", gap: 12 }}>
                    {(items as unknown as RecipeListItem[]).map((r) => (
                      <div key={r.id} style={recipeCardStyle}>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{r.title}</div>

                        {r.description ? (
                          <div
                            style={{
                              marginTop: 4,
                              color: "#555",
                              fontSize: 13,
                              lineHeight: 1.5,
                            }}
                          >
                            {r.description}
                          </div>
                        ) : null}

                        {/* チップ */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {r.timeMinutes ? (
                            <span style={chipStyle("rgba(200,247,220,0.6)")}>
                              ⏱ {r.timeMinutes}分
                            </span>
                          ) : null}

                          {r.mainCategory ? (
                            <span style={chipStyle("rgba(240,240,240,0.9)")}>
                              📌 {r.mainCategory}
                            </span>
                          ) : null}

                          {(r.tags ?? []).slice(0, 4).map((t) => (
                            <span key={t} style={chipStyle("rgba(179,229,255,0.6)")}>
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* 操作 */}
                        <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 13 }}>
                          <a
                            href={`/recipes/${r.id}`}
                            style={{
                              color: "#1f5fa5",
                              fontWeight: 800,
                              textDecoration: "none",
                            }}
                          >
                            詳細を見る →
                          </a>

                          {/* ★ここが「詳細画面と同じロジック」で献立に追加 */}
                          <button
                            type="button"
                            onClick={() => openAddModalByRecipeId(r.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#1f5fa5",
                              fontWeight: 800,
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            献立に使う
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </section>
      )}

      <footer style={{ marginTop: 20 }}>
        <a href="/main" style={{ color: "#1f5fa5", fontWeight: 800, textDecoration: "none" }}>
          ← メインメニューへ戻る
        </a>
      </footer>

      {/* ===== 献立に追加：モーダル ===== */}
      {openAdd && selectedRecipe && (
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
              「{selectedRecipe.title}」を献立に追加します
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

            {/* 材料プレビュー（任意：確認できると安心） */}
            <div style={{ marginTop: 12, fontSize: 12, color: "#555", fontWeight: 800 }}>
              材料（{selectedRecipe.ingredients.length}）
            </div>
            {selectedRecipe.ingredients.length > 0 ? (
              <div
                style={{
                  marginTop: 8,
                  maxHeight: 160,
                  overflow: "auto",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.75)",
                  padding: 10,
                }}
              >
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      padding: "6px 0",
                      borderTop: idx === 0 ? "none" : "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div>{ing.name}</div>
                    <div style={{ fontWeight: 900 }}>{ing.amount}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                ※材料が登録されていません
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
