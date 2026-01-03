// src/components/recipes/RecipeDetailView.tsx
// コメント多め：表示（ゆるふわ）だけ担当。データ取得や変換はしない。
// - page.tsx は「取得・状態管理」だけにして行数を減らす
// - DTO(snake_case)→ViewModel(camelCase) は lib 側で変換してからここへ渡す

import type { RecipeDetail } from "../../lib/recipes/View";

/**
 * ぷにっとしたチップ（時間/人数などのメタ情報表示用）
 * - rounded-full で丸く
 * - 白半透明 + うっすら枠 + 影で「ゆるふわ」感
 */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-sm shadow-sm ring-1 ring-black/5">
      {children}
    </span>
  );
}

/**
 * レシピ詳細の“見た目だけ”を担当するコンポーネント
 * - recipe は UI 用に整形済み（camelCase）を受け取る前提
 */
export default function RecipeDetailView({ recipe }: { recipe: RecipeDetail }) {
  return (
    // ✅ ゆるふわ背景：淡い水色 → 淡いピンクのグラデ
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-rose-50">
      {/* ✅ スマホ前提：左右余白は px-4、中央寄せ max-w で読みやすく */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* ✅ ガラス風カード（白半透明 + blur + うっすら枠） */}
        <section className="rounded-3xl bg-white/75 backdrop-blur shadow-sm ring-1 ring-black/5 p-5">
          {/* ===== ヘッダー ===== */}
          <header>
            {/* タイトル：太すぎず、少し上品に */}
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {recipe.title}
            </h1>

            {/* 説明：あれば表示。本文より薄い色でやさしく */}
            {recipe.description ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {recipe.description}
              </p>
            ) : null}

            {/* 時間・人数：ぷにっとチップで表示 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* null の可能性があるのでガード */}
              {recipe.timeMinutes != null ? (
                <Badge>⏱ {recipe.timeMinutes}分</Badge>
              ) : null}

              {recipe.servings != null ? (
                <Badge>👥 {recipe.servings}人分</Badge>
              ) : null}
            </div>

            {/* ✅ 「献立に使う」ボタン：将来は有効化して、モーダル等を開く */}
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium
                         shadow-sm ring-1 ring-black/5
                         transition disabled:opacity-70"
              title="今後実装予定"
            >
              🍱 献立に使う <span className="text-xs text-black/40">（準備中）</span>
            </button>
          </header>

          {/* セクション区切り：濃い線より、薄い境界のほうがゆるふわに合う */}
          <div className="my-5 border-t border-black/5" />

          {/* ===== 材料 ===== */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">材料</h2>

            {/* 材料がない場合の表示 */}
            {recipe.ingredients.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">材料データが未登録です。</p>
            ) : (
              // 材料行：左右で材料名と分量を分けるとスマホで見やすい
              <ul className="mt-3 space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li
                    key={`${ing.name}-${idx}`}
                    className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2 ring-1 ring-black/5"
                  >
                    <span className="text-sm text-slate-900">{ing.name}</span>
                    <span className="text-sm text-slate-500">{ing.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="my-5 border-t border-black/5" />

          {/* ===== 作り方 ===== */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900">作り方</h2>

            {recipe.steps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">手順データが未登録です。</p>
            ) : (
              // 手順：番号を丸で表示すると可愛く＆視線誘導になる
              <ol className="mt-3 space-y-2">
                {recipe.steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-black/5"
                  >
                    {/* 丸番号：薄い水色が“ゆるふわ”に合う */}
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-slate-700">
                      {idx + 1}
                    </span>

                    <p className="text-sm leading-relaxed text-slate-800">{step}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ===== メモ（任意） ===== */}
          {recipe.notes ? (
            <>
              <div className="my-5 border-t border-black/5" />
              <section>
                <h2 className="text-lg font-semibold text-slate-900">メモ</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {recipe.notes}
                </p>
              </section>
            </>
          ) : null}

          {/* ===== フッター ===== */}
          <div className="mt-6">
            <a
              href="/recipes"
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              ← レシピ一覧へ戻る
            </a>
          </div>
        </section>

        {/* カード下の余白：詰めすぎない方が“ゆるふわ”に見える */}
        <div className="h-6" />
      </div>
    </main>
  );
}
