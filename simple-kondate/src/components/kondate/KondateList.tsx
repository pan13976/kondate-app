// src/components/kondate/KondateList.tsx
"use client";

import type { KondateRow } from "../../types/kondate";

type Props = {
  items: KondateRow[];
  loading: boolean;
  onDelete: (id: number) => void;
};

export function KondateList(props: Props) {
  const { items, loading, onDelete } = props;

  if (items.length === 0) {
    return <p style={{ color: "#666" }}>データがありません（追加してみてね）</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
      {items.map((k) => (
        <li
          key={k.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{k.title}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              カテゴリ：{k.category} / ID：{k.id}
            </div>
          </div>

          <button
            onClick={() => onDelete(k.id)}
            disabled={loading}
            style={{ padding: "8px 12px", cursor: loading ? "not-allowed" : "pointer" }}
          >
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
