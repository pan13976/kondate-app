// src/app/recipes/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getRecipeById } from "../../../lib/recipes/Api";
import type { RecipeDetail } from "../../../lib/recipes/Api";
import type { Category } from "../../../types/kondate";

/**
 * レシピ詳細ページ
 * - Supabase直呼び（getRecipeById）で詳細を取得して表示
 * - 材料：2列（左：材料名 / 右：分量）
 * - 作り方：①②③... のチップ表示
 * - 「献立に追加」：日付・区分を選んで /api/kondates に POST（recipe_id付き）
 *
 * 注意：
 * - あなたのプロジェクトでは @/ エイリアス禁止 → 相対importのみ
 * - DTO snake_case / UI camelCase は view.ts 集約が理想だが、
 *   現状 getRecipeById は既に camelCase に整形して返しているのでここはそのまま使う
 */
export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- 献立に追加（モーダル） ----
  const [openAddToKondate, setOpenAddToKondate] = useState(false);

  // 初期値：今日（YYYY-MM-DD）
  const todayYmd = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [mealDate, setMealDate] = useState(todayYmd);
  const [category, setCategory] = useState<Category>("夜");
  const [adding, setAdding] = useState(false);

  // ---- data fetch ----
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setRecipe(null);
          setError("id が不正です");
          return;
        }

        const detail = await getRecipeById(id);
        if (!detail) {
          if (!cancelled) {
            setRecipe(null);
            setError("レシピが見つかりませんでした");
          }
          return;
        }

        if (!cancelled) setRecipe(detail);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "取得に失敗しました";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---- actions ----
  async function onAddToKondate() {
    if (!recipe) return;

    try {
      setAdding(true);

      // ✅ route.ts があるなら、ここは fetch で叩けば確実に動く
      // （献立側の lib 関数名がまだ確定していないため）
      const res = await fetch("/api/kondates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          category, // "朝" | "昼" | "夜" | "弁当"
          meal_date: mealDate, // snake_case で送る（API側ルール）
          recipe_id: recipe.id, // ★追加したカラム
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "献立への追加に失敗しました");
      }

      // 追加できたら献立画面へ
      router.push("/kondates");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "献立への追加に失敗しました";
      alert(msg);
    } finally {
      setAdding(false);
      setOpenAddToKondate(false);
    }
  }

  // 作り方チップ（①②③…）
  function toCircledNumber(n: number) {
    const circled = [
      "①",
      "②",
      "③",
      "④",
      "⑤",
      "⑥",
      "⑦",
      "⑧",
      "⑨",
      "⑩",
      "⑪",
      "⑫",
      "⑬",
      "⑭",
      "⑮",
      "⑯",
      "⑰",
      "⑱",
      "⑲",
      "⑳",
    ];
    return circled[n - 1] ?? `${n}.`;
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm">読み込み中…</div>
      </main>
    );
  }

  if (error || !recipe) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
          <div className="text-sm text-red-600">{error ?? "データがありません"}</div>
          <button
            className="mt-3 rounded-xl border px-3 py-2 text-sm"
            onClick={() => router.push("/recipes")}
          >
            一覧に戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* ヘッダー */}
      <header className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold leading-tight">{recipe.title}</h1>

            {recipe.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                {recipe.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
              {typeof recipe.timeMinutes === "number" ? (
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  ⏱ {recipe.timeMinutes}分
                </span>
              ) : null}
              {typeof recipe.servings === "number" ? (
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  🍽 {recipe.servings}人分
                </span>
              ) : null}
              {recipe.mainCategory ? (
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  📌 {recipe.mainCategory}
                </span>
              ) : null}
            </div>
          </div>

          {/* 右上ボタン群 */}
          <div className="flex shrink-0 flex-col gap-2">
            <button
              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white"
              onClick={() => setOpenAddToKondate(true)}
            >
              🍱 献立に追加
            </button>

            <button
              className="rounded-xl border px-3 py-2 text-sm"
              onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
            >
              編集
            </button>

            {/* 削除は既存実装に合わせて接続（ここではボタンだけ） */}
            <button
              className="rounded-xl border px-3 py-2 text-sm text-red-600"
              onClick={() => alert("削除処理は既存実装に合わせて接続してください")}
            >
              削除
            </button>
          </div>
        </div>
      </header>

      {/* 材料 */}
      <section className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="text-base font-semibold">材料</h2>

        {recipe.ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">材料が登録されていません</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              <div className="col-span-8">材料</div>
              <div className="col-span-4 text-right">分量</div>
            </div>

            <ul className="divide-y">
              {recipe.ingredients.map((ing, idx) => (
                <li key={`${ing.name}-${idx}`} className="grid grid-cols-12 px-3 py-2">
                  <div className="col-span-8 text-sm">{ing.name}</div>
                  <div className="col-span-4 text-right text-sm text-gray-700">
                    {ing.amount}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 作り方 */}
      <section className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="text-base font-semibold">作り方</h2>

        {recipe.steps.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">手順が登録されていません</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {recipe.steps.map((s, i) => (
              <li key={`${i}-${s}`} className="flex gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold">
                  {toCircledNumber(i + 1)}
                </span>
                <div className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap leading-relaxed">{s}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* メモ */}
      {recipe.notes ? (
        <section className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold">メモ</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{recipe.notes}</p>
        </section>
      ) : null}

      {/* 下部：戻る */}
      <div className="mt-6">
        <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => router.back()}>
          戻る
        </button>
      </div>

      {/* 献立に追加モーダル */}
      {openAddToKondate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setOpenAddToKondate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">献立に追加</h3>
              <button
                className="rounded-lg px-2 py-1 text-sm"
                onClick={() => setOpenAddToKondate(false)}
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-600">「{recipe.title}」を献立に追加します</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-gray-600">日付</div>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">区分</div>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  <option value="朝">朝</option>
                  <option value="昼">昼</option>
                  <option value="夜">夜</option>
                  <option value="弁当">弁当</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
                onClick={() => setOpenAddToKondate(false)}
                disabled={adding}
              >
                キャンセル
              </button>
              <button
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={onAddToKondate}
                disabled={adding || !mealDate}
              >
                {adding ? "追加中…" : "追加する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
