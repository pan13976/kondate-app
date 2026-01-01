// src/components/kondate/KondateFilter.tsx
"use client";

import type { Category } from "../../types/kondate";
import { CATEGORIES } from "../../types/kondate";

type Props = {
  filterCategory: "全て" | Category;
  onChangeFilterCategory: (v: "全て" | Category) => void;
  loading: boolean;
  count: number;
};

export function KondateFilter(props: Props) {
  const { filterCategory, onChangeFilterCategory, loading, count } = props;

  return (
    <section style={{ marginBottom: 12 }}>
      <label style={{ marginRight: 8 }}>表示：</label>

      <select
        value={filterCategory}
        onChange={(e) => onChangeFilterCategory(e.target.value as "全て" | Category)}
        style={{ padding: 8 }}
        disabled={loading}
      >
        <option value="全て">全て</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <span style={{ marginLeft: 12, color: "#666" }}>
        件数：{count}
        {loading ? "（処理中…）" : ""}
      </span>
    </section>
  );
}
