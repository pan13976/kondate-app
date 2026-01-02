"use client";

import { useParams } from "next/navigation";

/**
 * レシピ詳細ページ（Step②）
 *
 * 目的：
 * - レシピ一覧 → 詳細を見る流れを完成させる
 * - 材料・手順・メモを「献立に使える形」で表示
 *
 * 今は：
 * - ダミーデータから ID で取得
 *
 * 将来：
 * - Supabase recipes / recipe_ingredients テーブルに差し替え
 * - 「献立に使う」ボタンで kondates へ流し込み
 */

/**
 * レシピ材料の型
 * ※ kondates.ingredients にそのまま近い形にしておく
 */
type RecipeIngredient = {
  name: string;
  amount: string;
};

/**
 * レシピ詳細の型
 */
type RecipeDetail = {
  id: string;
  title: string;
  description?: string;
  timeMinutes?: number;
  servings?: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string;
};

/**
 * 仮データ（本当は API / DB）
 * Step① の一覧と ID を揃えている
 */
const MOCK_RECIPE_DETAILS: RecipeDetail[] = [
  {
    id: "1",
    title: "鶏の唐揚げ",
    description: "家族みんなが好きな定番メニュー。",
    timeMinutes: 30,
    servings: 3,
    ingredients: [
      { name: "鶏もも肉", amount: "300g" },
      { name: "醤油", amount: "大さじ2" },
      { name: "酒", amount: "大さじ1" },
      { name: "にんにく", amount: "1片" },
    ],
    steps: [
      "鶏肉を一口大に切る",
      "調味料をもみ込んで10分置く",
      "油でカラッと揚げる",
    ],
    notes: "下味をつけすぎない方が子ども向け。",
  },
  {
    id: "2",
    title: "野菜たっぷりカレー",
    description: "作り置きできる万能カレー。",
    timeMinutes: 60,
    servings: 4,
    ingredients: [
      { name: "玉ねぎ", amount: "2個" },
      { name: "にんじん", amount: "1本" },
      { name: "じゃがいも", amount: "2個" },
      { name: "カレールー", amount: "1/2箱" },
    ],
    steps: [
      "野菜を食べやすく切る",
      "鍋で炒めて水を加える",
      "火が通ったらルーを入れる",
    ],
  },
];

export default function RecipeDetailPage() {
  /**
   * URL の [id] を取得
   * 例：/recipes/1 → id = "1"
   */
  const params = useParams();
  const id = params?.id as string;

  /**
   * 本来は useEffect + fetch だが、
   * Step②では「画面構造」が目的なので同期で OK
   */
  const recipe = MOCK_RECIPE_DETAILS.find((r) => r.id === id);

  if (!recipe) {
    // 不正 ID / 削除済みなど
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <p>レシピが見つかりません。</p>
        <a href="/recipes">← レシピ一覧へ戻る</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ===== ヘッダー ===== */}
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          {recipe.title}
        </h1>

        {recipe.description && (
          <p style={{ color: "#555", marginTop: 6 }}>
            {recipe.description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          {recipe.timeMinutes && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(200,247,220,0.6)",
              }}
            >
              ⏱ {recipe.timeMinutes}分
            </span>
          )}

          {recipe.servings && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(179,229,255,0.6)",
              }}
            >
              🍽 {recipe.servings}人分
            </span>
          )}
        </div>
      </header>

      {/* ===== 献立に使う（将来の主役） ===== */}
      <section style={{ marginBottom: 20 }}>
        <button
          type="button"
          disabled
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px dashed rgba(0,0,0,0.3)",
            background: "rgba(255,255,255,0.7)",
            fontWeight: 900,
          }}
        >
          献立に使う（準備中）
        </button>
      </section>

      {/* ===== 材料 ===== */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
          材料
        </h2>

        <ul style={{ paddingLeft: 16 }}>
          {recipe.ingredients.map((ing, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              {ing.name}（{ing.amount}）
            </li>
          ))}
        </ul>
      </section>

      {/* ===== 作り方 ===== */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
          作り方
        </h2>

        <ol style={{ paddingLeft: 18 }}>
          {recipe.steps.map((step, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* ===== メモ ===== */}
      {recipe.notes && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
            メモ
          </h2>
          <p style={{ color: "#555" }}>{recipe.notes}</p>
        </section>
      )}

      {/* ===== フッター ===== */}
      <footer>
        <a href="/recipes" style={{ color: "#1f5fa5", fontWeight: 800 }}>
          ← レシピ一覧へ戻る
        </a>
      </footer>
    </main>
  );
}
