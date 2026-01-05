// src/components/kondate/MonthCalendar.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * MonthCalendar（表示専用）
 * - 6週×7日=42マス固定
 * - dayMeta で「その日の状態（登録状況）」を受け取り、見やすく表示する
 *
 * ★変更点：
 * - “横棒（進捗バー）” は廃止
 * - PC/スマホ共通で「縦棒4つ（朝/昼/夜/弁当）」表示に統一
 */
type Props = {
  month: Date;

  /**
   * key: "YYYY-MM-DD"
   * value: UI表示に必要なメタ
   */
  dayMeta?: Record<
    string,
    {
      // 互換のため残す（使わなくてもOK）
      filledCount?: number;

      // これを使う：朝/昼/夜/弁当の登録有無
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

/** 曜日表示（日曜始まり） */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** YYYY-MM-DD へ整形 */
function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 同日判定（時刻は無視） */
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * month からカレンダー開始日（左上）を計算
 * - 日曜始まり：月初が水曜なら前の日曜まで戻す
 */
function getCalendarStart(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dow = first.getDay(); // 0=日
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

/** 6週×7日=42マスの配列を作る */
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

/** スマホ判定（簡易） */
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

  const title = useMemo(() => {
    return month.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  }, [month]);

  const gap = isMobile ? 6 : 8;
  const cellPad = isMobile ? 8 : 10;

  // 縦棒（4本）の見た目設定
  const barW = isMobile ? 16 : 18;
  const barH = isMobile ? 5 : 6;
  const barGap = isMobile ? 3 : 4;

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          padding: "6px 8px 10px",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            棒：朝 / 昼 / 夜 / 弁当（濃い＝登録）
          </div>
        </div>
      </div>

      {/* 曜日 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap,
          padding: "0 6px 6px",
        }}
      >
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: i === 0 ? "#c0392b" : i === 6 ? "#2980b9" : "#444",
              textAlign: "center",
              padding: "6px 0",
            }}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap,
          padding: "0 6px 6px",
        }}
      >
        {gridDates.map((d) => {
          const inCurrentMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, today);

          const key = formatYmd(d);
          const meta = dayMeta?.[key];

          // ★縦棒4本のON/OFF
          // 朝/昼/夜/弁当 の順で上から表示
          const cats = meta?.filledCats;
          const barOn = [
            !!cats?.morning, // 朝
            !!cats?.lunch, // 昼
            !!cats?.dinner, // 夜
            !!cats?.bento, // 弁当
          ];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate?.(d)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 12,
                padding: cellPad,
                border: isToday ? "2px solid rgba(31,95,165,0.90)" : "1px solid rgba(0,0,0,0.08)",
                background: isToday ? "rgba(31,95,165,0.08)" : "rgba(255,255,255,0.85)",
                boxShadow: isToday ? "0 10px 24px rgba(0,0,0,0.10)" : "none",
                opacity: inCurrentMonth ? 1 : 0.45,
                cursor: "pointer",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
                minHeight: isMobile ? 58 : 74,
              }}
              aria-label={`${key} を開く`}
            >
              {/* 上段：日付 + 今日 + 縦棒 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{d.getDate()}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isToday ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(31,95,165,0.50)",
                        background: "rgba(31,95,165,0.12)",
                        color: "#1f5fa5",
                      }}
                    >
                      今日
                    </span>
                  ) : null}

                  {/* ★縦棒4本（朝/昼/夜/弁当） */}
                  <div
                    aria-label="朝/昼/夜/弁当の登録状況"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: barGap,
                      alignItems: "flex-end",
                      paddingTop: 1,
                    }}
                  >
                    {barOn.map((on, i) => (
                      <span
                        key={i}
                        aria-hidden
                        style={{
                          width: barW,
                          height: barH,
                          borderRadius: 999,
                          background: on ? "rgba(31,95,165,0.92)" : "rgba(31,95,165,0.18)",
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 余白：タップしやすさ優先で高さ確保 */}
              <div style={{ height: 10 }} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
