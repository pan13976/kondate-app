// src/app/kondates/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import DayDetailModal from "../../components/kondate/DayDetailModal";
import type { KondateRow } from "../../types/kondate";
import { apiFetchKondatesByRange } from "../../lib/kondates/Api";

/**
 * YYYY-MM-DD 形式にする
 */
function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 月の先頭（1日）
 */
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * 月末（最終日）
 */
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * 月カレンダーの表示用：月の表示範囲（週の先頭=月曜、末尾=日曜）に拡張
 * ※「月表示」でも常に週が揃うので、レイアウトが安定する
 */
function getCalendarRange(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  // JS: 0=日,1=月,...6=土
  const startDow = start.getDay();
  const mondayBased = (startDow + 6) % 7; // 月曜=0, 日曜=6
  const rangeStart = new Date(start);
  rangeStart.setDate(start.getDate() - mondayBased);

  const endDow = end.getDay();
  const sundayBased = (7 - endDow) % 7; // 日曜になるまで進める
  const rangeEnd = new Date(end);
  rangeEnd.setDate(end.getDate() + sundayBased);

  return { rangeStart, rangeEnd };
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * スマホ判定（JSでやる派：inline style が多いので @media より手っ取り早い）
 * - iPhone想定なら 430px 前後が分岐として使いやすい
 */
function useIsMobile(maxWidth = 430) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${maxWidth}px)`);

    const onChange = () => setIsMobile(mq.matches);
    onChange();

    // iOS Safari 対応：addEventListener が無い場合がある
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

export default function KondatesPage() {
  const isMobile = useIsMobile(430);

  // 表示中の月
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // その月の献立一覧（DBから）
  const [kondates, setKondates] = useState<KondateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // モーダル
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  const { fromYmd, toYmdExclusive, days } = useMemo(() => {
    const { rangeStart, rangeEnd } = getCalendarRange(month);
    const from = toYmd(rangeStart);

    // API は [from, to) で扱うのが安全（toは翌日）
    const toExclusive = toYmd(addDays(rangeEnd, 1));

    // カレンダー表示用の各日リスト（rangeStart〜rangeEnd）
    const list: Date[] = [];
    for (let d = new Date(rangeStart); d <= rangeEnd; d = addDays(d, 1)) {
      list.push(new Date(d));
    }

    return { fromYmd: from, toYmdExclusive: toExclusive, days: list };
  }, [month]);

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

  // 今日（強調表示用）
  const todayYmd = useMemo(() => toYmd(new Date()), []);

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

  // スマホ向けの「密度」調整（ここを触ると一気に見やすさが変わる）
  const gap = isMobile ? 6 : 8;
  const cellPadding = isMobile ? 7 : 10;
  const cellMinHeight = isMobile ? 58 : 74;
  const dateFontSize = isMobile ? 13 : 14;
  const weekdayFontSize = isMobile ? 11 : 12;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: isMobile ? 12 : 16 }}>
      {/* ===== ヘッダー ===== */}
      <header
        style={{
          borderRadius: 16,
          padding: isMobile ? 12 : 14,
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
              padding: isMobile ? "9px 10px" : "10px 12px",
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

          <div style={{ fontSize: isMobile ? 17 : 18, fontWeight: 900 }}>{monthLabel}</div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            style={{
              padding: isMobile ? "9px 10px" : "10px 12px",
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

      {/* ===== 状態表示 ===== */}
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

      {/* ===== 曜日（スマホでは少し小さく） ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
          marginBottom: 8,
          fontSize: weekdayFontSize,
          fontWeight: 900,
          color: "#666",
        }}
      >
        <div style={{ textAlign: "center" }}>月</div>
        <div style={{ textAlign: "center" }}>火</div>
        <div style={{ textAlign: "center" }}>水</div>
        <div style={{ textAlign: "center" }}>木</div>
        <div style={{ textAlign: "center" }}>金</div>
        <div style={{ textAlign: "center" }}>土</div>
        <div style={{ textAlign: "center" }}>日</div>
      </div>

      {/* ===== カレンダー =====
         スマホで見づらい最大原因は「文字を入れすぎ」なので、
         スマホは “日付 + 点（登録数）” に寄せる。 */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap }}>
        {days.map((d) => {
          const ymd = toYmd(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = ymd === todayYmd;

          const rows = byDate.get(ymd) ?? [];
          const hasAny = rows.length > 0;
          const dots = Math.min(4, rows.length); // 点は最大4個まで

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => setSelectedYmd(ymd)}
              style={{
                textAlign: "left",
                padding: cellPadding,
                borderRadius: 14,

                // 今日：枠だけだとスマホで気づきにくい → 薄い背景も付ける
                border: isToday ? "2px solid rgba(31,95,165,0.90)" : "1px solid rgba(0,0,0,0.10)",
                background: isToday
                  ? "rgba(31,95,165,0.08)"
                  : inMonth
                    ? "rgba(255,255,255,0.82)"
                    : "rgba(255,255,255,0.55)",

                boxShadow: isToday ? "0 10px 22px rgba(0,0,0,0.08)" : "0 8px 18px rgba(0,0,0,0.05)",
                cursor: "pointer",
                minHeight: cellMinHeight,
                opacity: inMonth ? 1 : 0.55,

                // iOSのタップ時の見た目を安定させる
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label={`${ymd} を開く`}
            >
              {/* 上段：日付 + 登録点 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 900, fontSize: dateFontSize }}>{d.getDate()}</div>

                {hasAny ? (
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: dots }).map((_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        style={{
                          width: isMobile ? 7 : 8,
                          height: isMobile ? 7 : 8,
                          borderRadius: 999,
                          background: "rgba(31,95,165,0.88)",
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {/* 下段：スマホは文字を出さない（詰まって逆に見えないため）
                 ※PC/タブレットでは軽く出す */}
              {!isMobile ? (
                hasAny ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#555", fontWeight: 800, lineHeight: 1.25 }}>
                    {rows[0].title.length > 14 ? `${rows[0].title.slice(0, 14)}…` : rows[0].title}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888", fontWeight: 800 }}>未登録</div>
                )
              ) : null}
            </button>
          );
        })}
      </section>

      {/* 詳細モーダル（ここで料理名や材料を見る） */}
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
