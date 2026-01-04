// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchKondatesByRange } from "../lib/kondates/Api";
import type { KondateRow, Category } from "../types/kondate";

/**
 * Date -> "YYYY-MM-DD"
 * 献立テーブルの meal_date（yyyy-mm-dd）と合わせるための文字列化
 */
function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Home() {
  // ✅ Hooksは必ずコンポーネント内
  const [todayKondates, setTodayKondates] = useState<KondateRow[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  /**
   * 本日の献立を取得
   * - apiFetchKondatesByRange(today, today) で今日だけを取得
   */
  useEffect(() => {
    const fetchToday = async () => {
      try {
        setLoadingToday(true);
        const today = toYmd(new Date());
        const rows = await apiFetchKondatesByRange(today, today);
        setTodayKondates(rows);
      } finally {
        setLoadingToday(false);
      }
    };

    fetchToday();
  }, []);

  /**
   * 表示用：カテゴリ（朝/昼/夜/弁当）ごとにまとめる
   */
  const byCategory = useMemo(() => {
    const map: Record<Category, KondateRow[]> = {
      朝: [],
      昼: [],
      夜: [],
      弁当: [],
    };

    for (const k of todayKondates) {
      map[k.category].push(k);
    }
    return map;
  }, [todayKondates]);

  // 表示用の日付（日本語）
  const today = new Date();
  const ymd = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      {/* ヒーロー */}
      <header
        style={{
          borderRadius: 16,
          padding: 18,
          background: "rgba(255,255,255,0.75)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          backdropFilter: "blur(8px)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #b3e5ff 0%, #c8f7dc 100%)",
              fontSize: 22,
            }}
          >
            🏠
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: "#555", fontSize: 13 }}>{ymd}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "4px 0 0" }}>
              家族アプリ
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: "#555",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              献立とレシピをまとめて管理。材料と栄養もさっと確認できます。
            </p>
          </div>
        </div>
      </header>

      {/* メニューカード */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {/* 献立 */}
        <a
          href="/kondates"
          style={{
            textDecoration: "none",
            color: "inherit",
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.85)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "block",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              aria-hidden
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #ffd6a5 0%, #bde0fe 100%)",
                fontSize: 22,
              }}
            >
              🍱
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>献立</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
                月表示・材料入力・栄養計算
              </div>
            </div>

            <div aria-hidden style={{ color: "#777", fontSize: 18 }}>
              →
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {["朝/昼/夜/弁当", "カテゴリ選択", "USDA栄養"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  color: "#345",
                  background: "rgba(179,229,255,0.5)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </a>

        {/* レシピ */}
        <a
          href="/recipes"
          style={{
            textDecoration: "none",
            color: "inherit",
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.85)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "block",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              aria-hidden
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #c8f7dc 0%, #ffe29a 100%)",
                fontSize: 22,
              }}
            >
              🍳
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>レシピ</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
                レシピ登録・検索
              </div>
            </div>

            <div aria-hidden style={{ color: "#777", fontSize: 18 }}>
              →
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {["お気に入り", "材料メモ", "献立に流用"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  color: "#345",
                  background: "rgba(200,247,220,0.55)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </a>

        {/* 在庫 */}
        <a
          href="/inventory"
          style={{
            textDecoration: "none",
            color: "inherit",
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.85)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "block",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              aria-hidden
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #d0f4de 0%, #bde0fe 100%)",
                fontSize: 22,
              }}
            >
              🧊
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>在庫</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
                食材・日用品をカテゴリ別に記録
              </div>
            </div>

            <div aria-hidden style={{ color: "#777", fontSize: 18 }}>
              →
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {["消費ボタン", "賞味期限", "不足分だけ買う"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  color: "#345",
                  background: "rgba(208,244,222,0.55)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </a>

        {/* 買い物リスト */}
        <a
          href="/shopping"
          style={{
            textDecoration: "none",
            color: "inherit",
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.85)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "block",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              aria-hidden
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #ffd1dc 0%, #d0f4de 100%)",
                fontSize: 22,
              }}
            >
              🛒
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>買い物リスト</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
                献立から材料を自動集計
              </div>
            </div>

            <div aria-hidden style={{ color: "#777", fontSize: 18 }}>
              →
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {["自動集計", "チェック管理", "週・月対応"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  color: "#345",
                  background: "rgba(255,209,220,0.6)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </a>

        {/* ✅ 本日の献立 */}
{/* 本日の献立（タイル） */}
<div
  style={{
    borderRadius: 16,
    padding: 16,
    background: "rgba(255,255,255,0.85)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)",
  }}
>
  {/* ヘッダー */}
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <div
      aria-hidden
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #ffe29a 0%, #ffd6a5 100%)",
        fontSize: 22,
      }}
    >
      🍽
    </div>

    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 900 }}>本日の献立</div>
      <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
        今日の朝・昼・夜・弁当
      </div>
    </div>
  </div>

  {/* 中身 */}
  <div style={{ marginTop: 12 }}>
    {loadingToday && (
      <div style={{ color: "#777", fontSize: 14 }}>読み込み中…</div>
    )}

    {!loadingToday && todayKondates.length === 0 && (
      <div style={{ color: "#777", fontSize: 14 }}>
        今日の献立はまだ登録されていません
      </div>
    )}

    {!loadingToday &&
      (["朝", "昼", "夜", "弁当"] as const).map((cat) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#555",
              marginBottom: 4,
            }}
          >
            {cat}
          </div>

          {byCategory[cat].length === 0 ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>—</div>
          ) : (
            byCategory[cat].map((k) => (
              <div
                key={k.id}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "#f5f5f5",
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                {k.title}
              </div>
            ))
          )}
        </div>
      ))}
  </div>
</div>


        {/* 将来の拡張用 */}
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            background: "rgba(255,255,255,0.6)",
            border: "1px dashed rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>今後追加</div>
          <div
            style={{
              color: "#555",
              fontSize: 13,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            例：冷蔵庫メモ、家族タスクなど。
          </div>
        </div>
      </section>
    </main>
  );
}
