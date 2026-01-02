"use client";

import { useState } from "react";
import WeekTiles from "../components/WeekTiles";
import DayDetailModal from "../components/DayDetailModal";
import NutritionPanel from "../components/NutritionPanel";
import { useWeekRange } from "../hooks/useWeekRange";
import { useWeekKondates } from "../hooks/useWeekKondates";

/**
 * page.tsx は “画面を組み立てるだけ” にするのが目標
 * - 週計算：useWeekRange
 * - 週データ取得：useWeekKondates
 * - 栄養UI：NutritionPanel
 */
export default function Page() {
  // 1) 今週（月〜日）を決める
  const { weekDates, from, to } = useWeekRange();

  // 2) 今週の献立データを取得する
  const { kondates, loading, error, upsertKondate } = useWeekKondates(from, to);

  // 3) 詳細モーダル表示用（選択中の日付）
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>献立（今週）</h1>

      {/* 週の範囲 */}
      <div style={{ color: "#666", marginBottom: 12 }}>
        {from} 〜 {to}
      </div>

      {/* ローディング・エラー */}
      {loading && <div>読み込み中...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {/* 週タイル */}
      {!loading && !error && (
        <>
          <WeekTiles weekDates={weekDates} kondates={kondates} onSelectDate={(ymd) => setSelectedYmd(ymd)} />

          {/* 栄養計算パネル（page.tsx から切り出し） */}
          <NutritionPanel weekDates={weekDates} kondates={kondates} defaultYmd={from} />
        </>
      )}

      {/* 日別詳細モーダル */}
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
