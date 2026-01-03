"use client";

import type { CSSProperties } from "react";
import type { Category } from "../../types/kondate";
import type { RecipeDetail } from "../../lib/recipes/Api";

/**
 * レシピを献立に追加するモーダル（スマホ前提：下から出る）
 * - 表示だけ担当（データ取得・POST は呼び出し側）
 */
export function AddToKondateModal({
  open,
  recipe,
  mealDate,
  setMealDate,
  category,
  setCategory,
  adding,
  errorMsg,
  onClose,
  onSubmit,
}: {
  open: boolean;
  recipe: RecipeDetail | null;
  mealDate: string;
  setMealDate: (v: string) => void;
  category: Category;
  setCategory: (v: Category) => void;
  adding: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 12,
    zIndex: 50,
  };

  const modalStyle: CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(0,0,0,0.10)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    padding: 14,
    backdropFilter: "blur(8px)",
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "#444",
    marginBottom: 6,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.9)",
    fontWeight: 800,
    outline: "none",
  };

  const primaryBtnStyle: CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(200,247,220,0.75)",
    fontWeight: 900,
    cursor: adding ? "not-allowed" : "pointer",
  };

  const cancelBtnStyle: CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    fontWeight: 900,
    cursor: adding ? "not-allowed" : "pointer",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={overlayStyle}
      onClick={() => {
        if (!adding) onClose();
      }}
    >
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>🍱 献立に追加</div>

        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900 }}>{recipe?.title ?? "（レシピ）"}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#666", fontWeight: 800 }}>
            材料：{recipe?.ingredients?.length ?? 0}件
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={labelStyle}>日付</div>
            <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={labelStyle}>区分</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={inputStyle}>
              <option value="朝">朝</option>
              <option value="昼">昼</option>
              <option value="夜">夜</option>
              <option value="弁当">弁当</option>
            </select>
          </div>
        </div>

        {errorMsg ? (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,230,230,0.75)",
              color: "#a11",
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <button type="button" onClick={onSubmit} disabled={adding} style={primaryBtnStyle}>
            {adding ? "追加中…" : "追加する"}
          </button>
          <button type="button" onClick={onClose} disabled={adding} style={cancelBtnStyle}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
