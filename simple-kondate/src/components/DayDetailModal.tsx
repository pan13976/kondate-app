"use client";

import type { KondateRow } from "../types/kondate";

type Props = {
  open: boolean;
  ymd: string | null;
  kondates: KondateRow[];
  onClose: () => void;
};

export default function DayDetailModal({ open, ymd, kondates, onClose }: Props) {
  if (!open || !ymd) return null;

  const rows = kondates.filter((r) => r.meal_date === ymd);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(640px, 100%)", background: "white", borderRadius: 12, padding: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{ymd} の献立</div>
          <button onClick={onClose} style={{ padding: "6px 10px" }}>
            閉じる
          </button>
        </div>

        {rows.length === 0 ? (
          <div style={{ color: "#666" }}>この日の登録はまだありません。</div>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {rows.map((r) => (
              <li key={r.id}>
                <b>{r.category}</b>：{r.title}
              </li>
            ))}
          </ul>
        )}

        {/* 次のフェーズ：ここに「この日の追加フォーム」「削除ボタン」を入れる */}
      </div>
    </div>
  );
}
