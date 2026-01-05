// src/app/kondates/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import DayDetailModal from "../../components/kondate/DayDetailModal";
import { MonthCalendar } from "../../components/kondate/MonthCalendar";
import type { KondateRow } from "../../types/kondate";
import { apiFetchKondatesByRange } from "../../lib/kondates/Api";

/** YYYY-MM-DD */
function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 月初 */
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 月末 */
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** 月の表示範囲（API用：月初〜月末） */
function getMonthRange(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const fromYmd = toYmd(start);
  // [from, to) にするため、月末+1日
  const toYmdExclusive = toYmd(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1));

  return { fromYmd, toYmdExclusive };
}

export default function KondatesPage() {
  // 表示中の月
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // DBから取った献立
  const [kondates, setKondates] = useState<KondateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // モーダル
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  const { fromYmd, toYmdExclusive } = useMemo(() => getMonthRange(month), [month]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const rows = await apiFetchKondatesByRange(fromYmd, toYmdExclusive);
        if (!alive) return;
        setKondates(rows);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(String(e?.message ?? e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fromYmd, toYmdExclusive]);

  // 日付 → その日の献立配列
  const byDate = useMemo(() => {
    const map = new Map<string, KondateRow[]>();
    for (const row of kondates) {
      const ymd = row.meal_date;
      const arr = map.get(ymd) ?? [];
      arr.push(row);
      map.set(ymd, arr);
    }
    return map;
  }, [kondates]);

  // MonthCalendar 用の dayMeta を作る
  const dayMeta = useMemo(() => {
    const meta: Record<
      string,
      {
        filledCount: number;
        filledCats: { morning: boolean; lunch: boolean; dinner: boolean; bento: boolean };
      }
    > = {};

    for (const [ymd, rows] of byDate.entries()) {
      const flags = { morning: false, lunch: false, dinner: false, bento: false };

      for (const r of rows) {
        if (r.category === "朝") flags.morning = true;
        if (r.category === "昼") flags.lunch = true;
        if (r.category === "夜") flags.dinner = true;
        if (r.category === "弁当") flags.bento = true;
      }

      const filledCount = [flags.morning, flags.lunch, flags.dinner, flags.bento].filter(Boolean).length;

      meta[ymd] = { filledCount, filledCats: flags };
    }

    return meta;
  }, [byDate]);

  function moveMonth(diff: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
  }

  // Upsert（作成/更新）反映
  function upsertKondate(row: KondateRow) {
    setKondates((prev) => {
      const idx = prev.findIndex((x) => x.id === row.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      return [row, ...prev];
    });
  }

  const monthLabel = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth() + 1;
    return `${y}年${m}月`;
  }, [month]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ヘッダー */}
      <header
        style={{
          borderRadius: 16,
          padding: 14,
          background: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          backdropFilter: "blur(8px)",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              fontWeight: 900,
              cursor: "pointer",
            }}
            aria-label="前の月へ"
          >
            ←
          </button>

          <div style={{ fontSize: 18, fontWeight: 900 }}>{monthLabel}</div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              fontWeight: 900,
              cursor: "pointer",
            }}
            aria-label="次の月へ"
          >
            →
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <a href="/main" style={{ color: "#1f5fa5", fontWeight: 900, textDecoration: "none" }}>
            ← メインメニュー
          </a>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(200,247,220,0.75)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            今日へ
          </button>
        </div>
      </header>

      {/* 状態表示 */}
      {loading ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#555",
            marginBottom: 12,
          }}
        >
          読み込み中…
        </div>
      ) : null}

      {errorMsg ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,230,230,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#a11",
            marginBottom: 12,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          エラー：{errorMsg}
        </div>
      ) : null}

      {/* ここが重要：MonthCalendar を使う */}
      <MonthCalendar
        month={month}
        dayMeta={dayMeta}
        onSelectDate={(date) => setSelectedYmd(toYmd(date))}
      />

      {/* 詳細モーダル */}
      <DayDetailModal
        open={selectedYmd !== null}
        ymd={selectedYmd}
        kondates={selectedYmd ? byDate.get(selectedYmd) ?? [] : []}
        onClose={() => setSelectedYmd(null)}
        onUpsert={upsertKondate}
      />
    </main>
  );
}
