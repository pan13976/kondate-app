"use client";

import { useMemo, useState } from "react";

// ★ ここは @/ ではなく相対パス（../）にするルール
import { MonthCalendar } from "../../components/kondate/MonthCalendar";
import DayDetailModal from "../../components/kondate/DayDetailModal";
import NutritionPanel from "../../components/kondate/NutritionPanel";

import { useWeekKondates } from "../../hooks/kondates/useWeekKondates";

/**
 * YYYY-MM-DD に整形（Supabase の meal_date と同形式）
 */
function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * month（任意日付）から、その月の開始日/終了日（YYYY-MM-DD）を返す
 */
function getMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0); // 月末日
  return { from: formatYmd(start), to: formatYmd(end) };
}

/**
 * kondates から、日付ごとの「埋まり具合」を作る
 * - filledCount: 0〜4（朝/昼/夜/弁当）
 * - hasEmpty: 4未満なら true
 *
 * MonthCalendar の ●●● 表示の元データになる
 */
function buildDayMeta(kondates: any[]) {
  const map: Record<string, { filledCount: number; hasEmpty: boolean }> = {};

  for (const k of kondates) {
    const ymd = k.meal_date;
    if (!ymd) continue;

    // その日のカテゴリを重複なしで数える（同カテゴリ複数登録を許してるならここは調整）
    if (!map[ymd]) map[ymd] = { filledCount: 0, hasEmpty: true };

    // ざっくり：1レコード=1枠として数える想定（今の構造が「朝/昼/夜/弁当ごとに1件」ならこれで合う）
    map[ymd].filledCount += 1;
  }

  // 0〜4に丸めて hasEmpty を確定
  for (const ymd of Object.keys(map)) {
    const filled = Math.min(4, Math.max(0, map[ymd].filledCount));
    map[ymd] = { filledCount: filled, hasEmpty: filled < 4 };
  }

  return map;
}

export default function Page() {
  // 表示中の月（ヘッダーの前月/次月で切り替える）
  const [month, setMonth] = useState(() => new Date());

  // 選択中の日付（DayDetailModal に渡す）
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  // 月の範囲（YYYY-MM-DD）
  const { from, to } = useMemo(() => getMonthRange(month), [month]);

  // 既存フックを “期間取得” として流用（名前は useWeekKondates だけど中身が期間ならOK）
  const { kondates, loading, error, upsertKondate } = useWeekKondates(from, to);

  // MonthCalendar の ● 表示用
  const dayMeta = useMemo(() => buildDayMeta(kondates ?? []), [kondates]);

  const title = useMemo(
    () => month.toLocaleDateString("ja-JP", { year: "numeric", month: "long" }),
    [month]
  );

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ヘッダー（月移動つき） */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            献立（{title}）
          </h1>
          <div style={{ color: "#666", marginTop: 6 }}>
            {from} 〜 {to}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ← 前月
          </button>

          <button
            type="button"
            onClick={() => setMonth(new Date())}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            今月
          </button>

          <button
            type="button"
            onClick={() =>
              setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            次月 →
          </button>
        </div>
      </div>

      {/* ローディング・エラー */}
      {loading && <div>読み込み中...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {/* 月カレンダー（タップで日別モーダル） */}
      {!loading && !error && (
        <>
          <MonthCalendar
            month={month}
            dayMeta={dayMeta}
            onSelectDate={(date) => setSelectedYmd(formatYmd(date))}
          />

          {/* 栄養パネルは一旦残すなら、デフォルト日付は from でOK
              （最終的には “日モーダル内に栄養サマリー” がスマホ向き） */}
          <div style={{ marginTop: 14 }}>
            <NutritionPanel
              weekDates={[]} // ★ 今の NutritionPanel の props が週前提なら、次で “月/日” 対応に整理しよう
              kondates={kondates}
              defaultYmd={from}
            />
          </div>
        </>
      )}

      {/* 日別詳細モーダル（既存のまま流用） */}
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
