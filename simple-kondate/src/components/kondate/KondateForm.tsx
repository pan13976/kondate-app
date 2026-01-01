// src/components/kondate/KondateForm.tsx
"use client";

import type { Category } from "../../types/kondate";
import { CATEGORIES } from "../../types/kondate";

type Props = {
  title: string;
  onChangeTitle: (v: string) => void;

  category: Category;
  onChangeCategory: (v: Category) => void;

  loading: boolean;
  onAdd: () => void;
  onReload: () => void;
};

export function KondateForm(props: Props) {
  const { title, onChangeTitle, category, onChangeCategory, loading, onAdd, onReload } = props;

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* 献立名 */}
        <input
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="例：厚揚げ麻婆丼"
          style={{ padding: 8, minWidth: 240, flex: "1 1 240px" }}
          disabled={loading}
        />

        {/* カテゴリ選択（追加時） */}
        <select
          value={category}
          onChange={(e) => onChangeCategory(e.target.value as Category)}
          style={{ padding: 8 }}
          disabled={loading}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* 追加 */}
        <button
          onClick={onAdd}
          disabled={loading}
          style={{ padding: "8px 12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          追加
        </button>

        {/* 再読込 */}
        <button
          onClick={onReload}
          disabled={loading}
          style={{ padding: "8px 12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          再読込
        </button>
      </div>

      <p style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
        ※ フロントは Supabase 直呼びせず、API（/api/kondates）経由で操作しています。
      </p>
    </section>
  );
}
