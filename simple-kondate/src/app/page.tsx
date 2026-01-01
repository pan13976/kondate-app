// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import WeekTiles from "../components/WeekTiles";
import DayDetailModal from "../components/DayDetailModal";

import { apiFetchKondatesByRange } from "../lib/kondatesApi";
import { apiCalcNutrition } from "../lib/nutritionApi";

import { getWeekDates, startOfWeekMonday, toYmd } from "../lib/date";
import type { KondateRow } from "../types/kondate";

// 栄養計算に送る材料の型（最小）
// ※ types/kondate.ts に Ingredient があるなら import でもOK
type Ingredient = { name: string; amount: string };

// 栄養計算（ダミー）の結果型（nutritionApi.ts に合わせる）
type NutritionResult = {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  note?: string;
  echo?: { title: string; ingredientsCount: number };
};

export default function Page() {
  // ----------------------------
  // 1) 今週の期間（Mon〜Sun）を作る
  // ----------------------------

  // 週の基準日（初回レンダ時の“今日”を固定）
  const today = useMemo(() => new Date(), []);

  // 月曜日始まりの週の開始日
  const start = useMemo(() => startOfWeekMonday(today), [today]);

  // 今週7日分（Date配列）
  const weekDates = useMemo(() => getWeekDates(start), [start]);

  // 今週の from/to（YYYY-MM-DD）
  const from = useMemo(() => toYmd(weekDates[0]), [weekDates]);
  const to = useMemo(() => toYmd(weekDates[6]), [weekDates]);

  // ----------------------------
  // 2) 今週の献立データ（サーバAPIから取得）
  // ----------------------------
  const [kondates, setKondates] = useState<KondateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // 日別詳細モーダルの状態（選択中の日付）
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  // 週データをロード
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        // /api/kondates?from=...&to=... のような想定
        const data = await apiFetchKondatesByRange(from, to);
        setKondates(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  // ----------------------------
  // 3) モーダルで保存した内容を “週一覧 state” に即反映する関数
  // ----------------------------
  const upsertKondate = (row: KondateRow) => {
    setKondates((prev) => {
      // 既に同じidがあれば置換（更新）
      const idx = prev.findIndex((x) => x.id === row.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      // 無ければ追加（新規）
      return [row, ...prev];
    });
  };

  // ----------------------------
  // 4) 栄養計算（ステップC：ダミーAPI）
  //    日付＋時間帯を選んで、その献立の材料を送って結果を表示する
  // ----------------------------

  // 栄養計算の対象：日付（初期は週の月曜）
  const [nutriYmd, setNutriYmd] = useState(from);

  // 栄養計算の対象：時間帯（カテゴリ）
  const [nutriCat, setNutriCat] = useState<"朝" | "昼" | "夜" | "弁当">("夜");

  // 栄養計算結果
  const [nutrition, setNutrition] = useState<NutritionResult | null>(null);
  const [nutriLoading, setNutriLoading] = useState(false);
  const [nutriError, setNutriError] = useState("");

  // 選択された「日付＋時間帯」の献立を1件拾う
  const picked = useMemo(() => {
    return kondates.find((k) => k.meal_date === nutriYmd && k.category === nutriCat) ?? null;
  }, [kondates, nutriYmd, nutriCat]);

  // 栄養計算ボタン押下
  const onClickCalc = async () => {
    try {
      setNutriLoading(true);
      setNutriError("");
      setNutrition(null);

      // 対象の献立が無い場合は計算できない
      if (!picked) {
        setNutriError("この日・この時間帯の献立が未登録です");
        return;
      }

      // 材料が空だと計算しにくいので、いったん弾く
      const ingredients = (picked as any).ingredients as Ingredient[] | undefined;
      if (!ingredients || ingredients.length === 0) {
        setNutriError("材料が未登録です（詳細モーダルで材料を入れてね）");
        return;
      }

      // ダミー栄養APIへ送る（今は固定値が返る）
      const result = await apiCalcNutrition({
        title: picked.title,
        ingredients,
      });

      setNutrition(result);
    } catch (e) {
      setNutriError(e instanceof Error ? e.message : "栄養計算に失敗しました");
    } finally {
      setNutriLoading(false);
    }
  };

  // ----------------------------
  // 5) 画面描画
  // ----------------------------
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>献立（今週）</h1>

      {/* 週の範囲（YYYY-MM-DD） */}
      <div style={{ color: "#666", marginBottom: 12 }}>
        {from} 〜 {to}
      </div>

      {/* ローディング・エラー */}
      {loading && <div>読み込み中...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {/* 週タイル */}
      {!loading && !error && (
        <WeekTiles
          weekDates={weekDates}
          kondates={kondates}
          onSelectDate={(ymd) => setSelectedYmd(ymd)}
        />
      )}

      {/* 栄養計算（ステップC：入力 → API → 結果表示） */}
      {!loading && !error && (
        <section
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>栄養計算（ダミー）</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* 日付：今週の7日から選ぶ */}
            <label>
              日付：
              <select
                value={nutriYmd}
                onChange={(e) => setNutriYmd(e.target.value)}
                style={{ marginLeft: 6, padding: 8 }}
              >
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

            {/* 時間帯（カテゴリ） */}
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
              disabled={nutriLoading}
              style={{ padding: "8px 12px", cursor: nutriLoading ? "not-allowed" : "pointer" }}
            >
              {nutriLoading ? "計算中..." : "栄養を計算（ダミー）"}
            </button>
          </div>

          {/* 選択されている献立を表示（デバッグ兼UI） */}
          <div style={{ marginTop: 10 }}>
            <div style={{ color: "#666", fontSize: 12 }}>対象の献立：</div>
            <div style={{ fontWeight: 700 }}>{picked ? picked.title : "（この日・この時間帯は未登録）"}</div>
          </div>

          {/* エラー */}
          {nutriError && <div style={{ marginTop: 8, color: "crimson" }}>{nutriError}</div>}

          {/* 結果表示（ダミー） */}
          {nutrition && (
            <div style={{ marginTop: 10, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>推定栄養（1食）</div>
              <div>エネルギー：{nutrition.energy_kcal} kcal</div>
              <div>たんぱく質：{nutrition.protein_g} g</div>
              <div>脂質：{nutrition.fat_g} g</div>
              <div>炭水化物：{nutrition.carbs_g} g</div>

              {nutrition.note && (
                <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>{nutrition.note}</div>
              )}
              {nutrition.echo && (
                <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                  （debug）ingredientsCount: {nutrition.echo.ingredientsCount}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 日別詳細モーダル：保存したら upsertKondate で週一覧にも反映 */}
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
