"use client";

import type { KondateRow } from "../types/kondate";
import { formatJpShort, toYmd } from "../lib/date";

type Props = {
  weekDates: Date[];                // 7日分
  kondates: KondateRow[];           // その週の全データ
  onSelectDate: (ymd: string) => void;
};

const CATS = ["朝", "昼", "夜", "弁当"] as const;

function pickTitle(rows: KondateRow[], cat: string): string {
  const hit = rows.find((r) => r.category === cat);
  return hit?.title ?? "";
}

export default function WeekTiles({ weekDates, kondates, onSelectDate }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      {weekDates.map((d) => {
        const ymd = toYmd(d);
        const dayRows = kondates.filter((r) => r.meal_date === ymd);

        return (
          <button
            key={ymd}
            onClick={() => onSelectDate(ymd)}
            style={{
              textAlign: "left",
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: 12,
background: "white",
boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{formatJpShort(d)}</div>

            {CATS.map((cat) => {
              const title = pickTitle(dayRows, cat);

              return (
                <div key={cat} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 44, color: "#666" }}>{cat}</div>
                  <div
                    style={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: title ? "#111" : "#aaa",
                    }}
                    title={title}
                  >
                    {title || "（未設定）"}
                  </div>
                </div>
              );
            })}
          </button>
        );
      })}
    </div>
  );
}
