"use client";

/**
 * レシピ一覧ページ（Step①）
 *
 * 目的：
 * - レシピアプリの「入口」を作る
 * - 一覧UIと操作感を先に固める
 * - 後で Supabase / API に差し替えられる構造にする
 *
 * 今は：
 * - ローカル配列（ダミーデータ）
 * - CRUD は未実装（表示のみ）
 *
 * 将来：
 * - Supabase の recipes テーブルに置き換え
 * - 献立（kondates）へ「このレシピを使う」導線を追加
 */

/**
 * レシピの型
 * ※ 将来 DB にするときも、ほぼこのまま使える想定
 */
type Recipe = {
    id: string;
    title: string;
    description?: string;
    // 調理時間（分）
    timeMinutes?: number;
    // メモ用途（子ども向け / 作り置き 等）
    tags?: string[];
};

/**
 * 仮のレシピ一覧
 * - UI確認用
 * - 空配列にしても壊れないようにしておく
 */
const MOCK_RECIPES: Recipe[] = [
    {
        id: "1",
        title: "鶏の唐揚げ",
        description: "定番メニュー。冷めても美味しい。",
        timeMinutes: 30,
        tags: ["定番", "子ども向け"],
    },
    {
        id: "2",
        title: "野菜たっぷりカレー",
        description: "作り置きOK。翌日が美味しい。",
        timeMinutes: 60,
        tags: ["作り置き", "野菜"],
    },
    {
        id: "3",
        title: "鮭のホイル焼き",
        description: "フライパン不要で楽。",
        timeMinutes: 20,
        tags: ["簡単", "魚"],
    },
];

export default function RecipesPage() {
    /**
     * 本来は useState + useEffect で API / DB から取得するが、
     * Step①では「UIだけ」を見るため固定データでOK。
     */
    const recipes = MOCK_RECIPES;

    return (
        <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
            {/* ===== ヘッダー ===== */}
            <header style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                    レシピ
                </h1>
                <p style={{ color: "#555", fontSize: 14 }}>
                    よく作る料理をレシピとしてまとめておけます。
                </p>
            </header>

            {/* ===== アクションバー（将来拡張用） =====
          - スマホ前提なので、上に大きな追加ボタン
          - 今はダミー（押しても何もしない） */}
            <div style={{ marginBottom: 16 }}>
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
                        fontSize: 14,
                        color: "#555",
                    }}
                >
                    ＋ レシピを追加（準備中）
                </button>
            </div>

            {/* ===== レシピ一覧 ===== */}
            {recipes.length === 0 ? (
                /**
                 * レシピが1件もない状態
                 * → 初回体験で必ず通るので、ちゃんとメッセージを出す
                 */
                <div
                    style={{
                        padding: 20,
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.75)",
                        border: "1px dashed rgba(0,0,0,0.2)",
                        color: "#555",
                    }}
                >
                    まだレシピがありません。<br />
                    よく作る料理をレシピとして登録してみましょう。
                </div>
            ) : (
                /**
                 * レシピがある場合の一覧
                 * - スマホ：1カラム
                 * - 将来：タップ → レシピ詳細ページ
                 */
                <section
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 12,
                    }}
                >
                    {recipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            style={{
                                borderRadius: 16,
                                padding: 14,
                                background: "rgba(255,255,255,0.85)",
                                border: "1px solid rgba(0,0,0,0.06)",
                                boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                            }}
                        >
                            {/* タイトル */}
                            <div style={{ fontSize: 16, fontWeight: 900 }}>
                                {recipe.title}
                            </div>

                            {/* 説明 */}
                            {recipe.description && (
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "#555",
                                        marginTop: 4,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {recipe.description}
                                </div>
                            )}

                            {/* 補足情報 */}
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    marginTop: 8,
                                }}
                            >
                                {recipe.timeMinutes && (
                                    <span
                                        style={{
                                            fontSize: 12,
                                            padding: "4px 8px",
                                            borderRadius: 999,
                                            background: "rgba(200,247,220,0.6)",
                                            border: "1px solid rgba(0,0,0,0.08)",
                                        }}
                                    >
                                        ⏱ {recipe.timeMinutes}分
                                    </span>
                                )}

                                {recipe.tags?.map((tag) => (
                                    <span
                                        key={tag}
                                        style={{
                                            fontSize: 12,
                                            padding: "4px 8px",
                                            borderRadius: 999,
                                            background: "rgba(179,229,255,0.6)",
                                            border: "1px solid rgba(0,0,0,0.08)",
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div
                                style={{
                                    marginTop: 10,
                                    display: "flex",
                                    gap: 16,
                                    fontSize: 13,
                                }}
                            >
                                {/* 詳細ページへのリンク */}
                                <a
                                    href={`/recipes/${recipe.id}`}
                                    style={{
                                        color: "#1f5fa5",
                                        fontWeight: 800,
                                        textDecoration: "none",
                                    }}
                                >
                                    詳細を見る →
                                </a>

                                {/* 将来用（今はダミー） */}
                                <span style={{ color: "#999" }}>
                                    献立に使う
                                </span>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* ===== フッター ===== */}
            <footer style={{ marginTop: 20 }}>
                <a href="/main" style={{ color: "#1f5fa5", fontWeight: 800 }}>
                    ← メインメニューへ戻る
                </a>
            </footer>
        </main>
    );
}