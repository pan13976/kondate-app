"use client";

import { useMemo, useState } from "react";
import { toYmd } from "../lib/date";
import { apiCalcNutrition, type NutritionResult } from "../lib/nutritionApi";
import type { KondateRow } from "../types/kondate";

/**
 * 栄養計算UIを page.tsx から切り出したコンポーネント
 * - page は “週タイル + モーダル + パネル” を並べるだけになる
 */
type Props = {
  weekDates: Date[];
  kondates: KondateRow[];
  defaultYmd: string; // 初期の日付（例：今週の月曜）
};

export default function NutritionPanel({ weekDates, kondates, defaultYmd }: Props) {
  // 対象日
  const [nutriYmd, setNutriYmd] = useState(defaultYmd);

  // 対象の時間帯（アプリ仕様）
  const [nutriCat, setNutriCat] = useState<"朝" | "昼" | "夜" | "弁当">("夜");

  // 計算結果＆状態
  const [nutrition, setNutrition] = useState<NutritionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * 選択された「日付＋時間帯」に一致する献立を探す
   * - 一覧から find するだけなので useMemo でOK
   */
  const picked = useMemo(() => {
    return kondates.find((k) => k.meal_date === nutriYmd && k.category === nutriCat) ?? null;
  }, [kondates, nutriYmd, nutriCat]);

  const onClickCalc = async () => {
    try {
      setLoading(true);
      setError("");
      setNutrition(null);

      // 1) 献立が無いなら計算できない
      if (!picked) {
        setError("この日・この時間帯の献立が未登録です");
        return;
      }

      // 2) 材料が無いなら計算しない（あなたの方針：材料（分量）まで入れる）
      const ingredients = (picked as any).ingredients as { name: string; amount: string }[] | undefined;
      if (!ingredients || ingredients.length === 0) {
        setError("材料が未登録です（詳細モーダルで材料を入れてね）");
        return;
      }

      // 3) APIへ送って結果表示（USDA版 / ダミー版 どちらでもOK）
      const result = await apiCalcNutrition({
        title: picked.title,
        ingredients,
      });

      setNutrition(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "栄養計算に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        background: "white",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>栄養計算</div>

      {/* 入力：日付＋時間帯 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          日付：
          <select value={nutriYmd} onChange={(e) => setNutriYmd(e.target.value)} style={{ marginLeft: 6, padding: 8 }}>
            {weekDates.map((d) => {
              const ymd = toYmd(d);
              return (
                <option key={ymd} value={ymd}>
                  {ymd}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          時間帯：
          <select
            value={nutriCat}
            onChange={(e) => setNutriCat(e.target.value as any)}
            style={{ marginLeft: 6, padding: 8 }}
          >
            <option value="朝">朝</option>
            <option value="昼">昼</option>
            <option value="夜">夜</option>
            <option value="弁当">弁当</option>
          </select>
        </label>

        <button
          onClick={onClickCalc}
          disabled={loading}
          style={{ padding: "8px 12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "計算中..." : "栄養を計算"}
        </button>
      </div>

      {/* 対象献立の表示（計算対象が合ってるかの確認用） */}
      <div style={{ marginTop: 10 }}>
        <div style={{ color: "#666", fontSize: 12 }}>対象の献立：</div>
        <div style={{ fontWeight: 700 }}>{picked ? picked.title : "（この日・この時間帯は未登録）"}</div>
      </div>

      {/* エラー表示 */}
      {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}

      {/* 結果表示 */}
      {nutrition && (
        <div style={{ marginTop: 10, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>推定栄養（1食）</div>
          <div>エネルギー：{nutrition.energy_kcal} kcal</div>
          <div>たんぱく質：{nutrition.protein_g} g</div>
          <div>脂質：{nutrition.fat_g} g</div>
          <div>炭水化物：{nutrition.carbs_g} g</div>

          {/* USDA版で note/matched を返している場合もあるので、あれば出す */}
          {(nutrition as any).note && (
            <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>{(nutrition as any).note}</div>
          )}
        </div>
      )}
    </section>
  );
}
