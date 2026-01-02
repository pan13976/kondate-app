"use client";

import React, { useMemo } from "react";

/**
 * MonthCalendar（表示専用）
 * - 「月のカレンダー（6週ぶん固定）」を表示するだけ
 * - クリック時の挙動、献立データの反映は “次のステップ” で追加する前提
 *
 * なぜ 6週固定？
 * - 月の始まり曜日と月末により、4〜6行にブレるとレイアウトがガタつく
 * - スマホでの視線移動が安定する（毎回同じ高さ）
 */
type Props = {
  /** 表示したい年月（例：new Date()） */
  month: Date;

  /**
   * 予定：その日に「登録があるか」を示すマーカー用
   * 今は “表示だけ” なので optional にしておく（後で useKondates とつなぐ）
   *
   * key: "YYYY-MM-DD"
   * value: 登録の有無や、朝昼夜弁当の埋まり具合など何でもOK
   */
  dayMeta?: Record<
    string,
    {
      // 登録済み数（例：朝昼夜弁当で 0〜4）
      filledCount?: number;
      // 未設定が残っているか
      hasEmpty?: boolean;
    }
  >;

  /** 予定：日セルを押した時のコールバック（次ステップで DayDetailModal を開く） */
  onSelectDate?: (date: Date) => void;
};

/** 曜日表示（日本のカレンダーは日曜始まりが多い） */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** YYYY-MM-DD へ整形（Supabase の meal_date 形式に揃える） */
function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 同日判定（時刻は無視） */
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * month（任意日付）から「その月のカレンダー開始日（= 表示グリッドの左上）」を計算
 * - 例：月初が水曜なら、前の日曜まで巻き戻す
 */
function getCalendarStart(month: Date) {
  // その月の1日
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // 0=日, 1=月, ... 6=土
  const dow = first.getDay();
  // 日曜始まりなので、dow 分だけ戻す
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

/**
 * month（任意日付）から「6週×7日=42マス」の Date 配列を作る
 * - 見た目が常に一定
 * - 後でメタ情報（献立登録状況）を流し込むのが楽
 */
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

export function MonthCalendar({ month, dayMeta, onSelectDate }: Props) {
  // 今日（強調表示用）
  const today = useMemo(() => new Date(), []);

  // 42マスの Date 配列を生成（month が変わったら作り直す）
  const gridDates = useMemo(() => buildGridDates(month), [month]);

  // 表示用タイトル
  const title = useMemo(() => {
    return month.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  }, [month]);

  return (
    <section
      style={{
        // 既存の全体背景（globals.css のグラデ）に合う、薄いカード感
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* ヘッダー：今は “表示だけ” なので月移動ボタンは付けない。
          次ステップで「前月/次月」をここに置くと自然。 */}
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
            日付をタップして詳細を開く（※次ステップで有効化）
          </div>
        </div>
      </div>

      {/* 曜日行：固定7列 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 6,
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

      {/* 日付グリッド：42マス */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 6,
          padding: "0 6px 6px",
        }}
      >
        {gridDates.map((d) => {
          const inCurrentMonth = d.getMonth() === month.getMonth();

          // “今日” かどうか（視線誘導として最重要）
          const isToday = isSameDay(d, today);

          // Supabase の meal_date（YYYY-MM-DD）と同形式で引く
          const key = formatYmd(d);
          const meta = dayMeta?.[key];

          // 予定：朝昼夜弁当の埋まり具合を 0〜4 として扱う
          // 表示だけなので「●の数」みたいな軽い表現にするのが月表示のコツ
          const filled = Math.min(4, Math.max(0, meta?.filledCount ?? 0));

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate?.(d)}
              style={{
                // ボタンを “カード” に見せる（スマホで押しやすいタップ領域）
                width: "100%",
                textAlign: "left",
                borderRadius: 12,
                padding: 10,
                border: isToday
                  ? "2px solid rgba(77,163,255,0.9)" // 今日を露骨に強調
                  : "1px solid rgba(0,0,0,0.08)",
                background: isToday
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.85)",
                boxShadow: isToday ? "0 10px 24px rgba(0,0,0,0.10)" : "none",

                // 今月外（前月/翌月のはみ出し）を薄くする
                opacity: inCurrentMonth ? 1 : 0.45,

                // スマホ：余計なデフォルト見た目を消す
                cursor: "pointer",
                outline: "none",
              }}
              aria-label={`${key} を開く`}
            >
              {/* 上段：日付 + 今日ラベル */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 900 }}>
                  {d.getDate()}
                </div>

                {/* 今日バッジ：月表示だと迷子防止に効く */}
                {isToday && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(77,163,255,0.6)",
                      background: "rgba(77,163,255,0.12)",
                      color: "#1f5fa5",
                    }}
                  >
                    今日
                  </span>
                )}
              </div>

              {/* 下段：登録状況のミニインジケータ
                  月マスに情報を詰めすぎないのが鉄則。
                  文字で「朝/昼/夜…」は書かない（週表示の失敗を繰り返さない） */}
              <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                {Array.from({ length: 4 }).map((_, idx) => {
                  const active = idx < filled;
                  return (
                    <span
                      key={idx}
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.15)",
                        background: active
                          ? "rgba(0,0,0,0.55)" // 色指定を極力避けてモノトーンで（背景に馴染む）
                          : "rgba(0,0,0,0.08)",
                        display: "inline-block",
                      }}
                    />
                  );
                })}
              </div>

              {/* 余白：タップしやすさ優先で “高さ” を少し確保
                  月表示は最終的に「親指でポンポン押せる」が勝ち */}
              <div style={{ height: 6 }} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
