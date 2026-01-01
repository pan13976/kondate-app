"use client";

import { useEffect, useMemo, useState } from "react";
import WeekTiles from "../components/WeekTiles";
import DayDetailModal from "../components/DayDetailModal";
import { apiFetchKondatesByRange } from "../lib/kondatesApi";
import { getWeekDates, startOfWeekMonday, toYmd } from "../lib/date";
import type { KondateRow } from "../types/kondate";

export default function Page() {
  // 週の基準日（今日）
  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => startOfWeekMonday(today), [today]);
  const weekDates = useMemo(() => getWeekDates(start), [start]);

  // 今週の from/to（YYYY-MM-DD）
  const from = useMemo(() => toYmd(weekDates[0]), [weekDates]);
  const to = useMemo(() => toYmd(weekDates[6]), [weekDates]);

  const [kondates, setKondates] = useState<KondateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // 詳細モーダル
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

const upsertKondate = (row: KondateRow) => {
  setKondates((prev) => {
    const idx = prev.findIndex((x) => x.id === row.id);
    if (idx >= 0) {
      const copy = [...prev];
      copy[idx] = row;
      return copy;
    }
    return [row, ...prev]; // 追加は先頭でOK（必要ならソート）
  });
};

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetchKondatesByRange(from, to);
        setKondates(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>献立（今週）</h1>
      <div style={{ color: "#666", marginBottom: 12 }}>
        {from} 〜 {to}
      </div>

      {loading && <div>読み込み中...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!loading && !error && (
        <WeekTiles
          weekDates={weekDates}
          kondates={kondates}
          onSelectDate={(ymd) => setSelectedYmd(ymd)}
        />
      )}

<DayDetailModal
  open={selectedYmd !== null}
  ymd={selectedYmd}
  kondates={kondates}
  onClose={() => setSelectedYmd(null)}
  onUpsert={upsertKondate}
/>
    </main>
  );
}
