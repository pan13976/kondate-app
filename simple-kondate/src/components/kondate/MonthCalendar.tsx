// src/components/kondate/MonthCalendar.tsx
"use client";

import { useMemo } from "react";
import type { KondateRow } from "../../types/kondate";

type Props = {
  year: number;
  month: number; // 1-12
  kondates: KondateRow[];
  onSelectDay: (ymd: string) => void;
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MonthCalendar({
  year,
  month,
  kondates,
  onSelectDay,
}: Props) {
  /** 月初・月末 */
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  /** 月曜始まりに合わせる */
  const startOffset = (firstDay.getDay() + 6) % 7;

  /** 日付ごとの献立数 */
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    kondates.forEach((k) => {
      map[k.meal_date] = (map[k.meal_date] ?? 0) + 1;
    });
    return map;
  }, [kondates]);

  /** カレンダー用配列 */
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month - 1, d));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 8,
      }}
    >
      {cells.map((date, idx) => {
        if (!date) {
          return <div key={idx} />;
        }

        const ymd = toYmd(date);
        const count = countByDate[ymd] ?? 0;
        const barCount = Math.min(count, 3);

        return (
          <button
            key={ymd}
            onClick={() => onSelectDay(ymd)}
            style={{
              borderRadius: 14,
              padding: "10px 6px",
              minHeight: 88,
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* 日付 */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#2563eb",
              }}
            >
              {date.getDate()}
            </div>

            {/* スペーサ */}
            <div style={{ flex: 1 }} />

            {/* 横バー表示（件数） */}
            <div
              style={{
                display: "flex",
                gap: 4,
                paddingBottom: 2,
              }}
            >
              {Array.from({ length: barCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 4,
                    borderRadius: 2,
                    background: "#93c5fd", // 薄い青
                  }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
