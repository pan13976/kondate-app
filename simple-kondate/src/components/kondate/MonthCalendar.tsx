// src/components/kondate/MonthCalendar.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  month: Date;
  dayMeta?: Record<
    string,
    {
      filledCats?: {
        morning?: boolean;
        lunch?: boolean;
        dinner?: boolean;
        bento?: boolean;
      };
    }
  >;
  onSelectDate?: (date: Date) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarStart(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dow = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

function buildGridDates(month: Date) {
  const start = getCalendarStart(month);
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function useIsMobile(maxWidth = 430) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${maxWidth}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } else {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, [maxWidth]);

  return isMobile;
}

export function MonthCalendar({ month, dayMeta, onSelectDate }: Props) {
  const isMobile = useIsMobile(430);
  const today = useMemo(() => new Date(), []);
  const gridDates = useMemo(() => buildGridDates(month), [month]);

  const gap = isMobile ? 6 : 8;

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* 曜日 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
          marginBottom: 6,
        }}
      >
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            style={{
              textAlign: "center",
              fontWeight: 900,
              fontSize: 12,
              color: i === 0 ? "#c0392b" : i === 6 ? "#2980b9" : "#444",
            }}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* 日付 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
        }}
      >
        {gridDates.map((d) => {
          const key = formatYmd(d);
          const meta = dayMeta?.[key];
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, today);

          const bars = [
            !!meta?.filledCats?.morning,
            !!meta?.filledCats?.lunch,
            !!meta?.filledCats?.dinner,
            !!meta?.filledCats?.bento,
          ];

          return (
            <button
              key={key}
              onClick={() => onSelectDate?.(d)}
              style={{
                borderRadius: 14,
                padding: 8,
                minHeight: isMobile ? 62 : 74,
                border: isToday
                  ? "2px solid rgba(31,95,165,0.9)"
                  : "1px solid rgba(0,0,0,0.08)",
                background: isToday
                  ? "rgba(31,95,165,0.08)"
                  : "rgba(255,255,255,0.85)",
                opacity: inMonth ? 1 : 0.45,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {/* 日付 */}
              <div style={{ fontWeight: 900, fontSize: 14 }}>
                {d.getDate()}
              </div>

              {/* ★数字の下：横並びの縦棒4つ */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  marginTop: 6,
                }}
              >
                {bars.map((on, i) => (
                  <span
                    key={i}
                    aria-hidden
                    style={{
                      width: 6,
                      height: 14,
                      borderRadius: 999,
                      background: on
                        ? "rgba(31,95,165,0.9)"
                        : "rgba(31,95,165,0.18)",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
