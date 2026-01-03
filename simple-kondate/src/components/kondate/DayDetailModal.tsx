// src/components/DayDetailModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { KondateRow } from "../../types/kondate";
import { apiCreateKondate, apiUpdateKondate } from "../../lib/kondates/Api";
import { apiFetchIngredients, type IngredientMaster } from "../../lib/ingredientsApi";

/**
 * 1行分の材料（分量）
 * - name: 画面上で表示する名前（いまは日本語でOK）
 * - amount: 分量（200g / 大さじ1 など）
 */
type Ingredient = {
    name: string;
    amount: string;
};

type Props = {
    open: boolean;
    ymd: string | null;
    kondates: KondateRow[];
    onClose: () => void;

    /**
     * 保存後、親の kondates state を即更新するために呼ぶ
     * - idが同じなら置換
     * - 無ければ追加
     */
    onUpsert: (row: KondateRow) => void;
};

/**
 * 献立カテゴリ（あなたのアプリ仕様）
 */
const CATS = ["朝", "昼", "夜", "弁当"] as const;
type KondateCat = (typeof CATS)[number];

/**
 * 食材カテゴリ（あなたが追加したい分類）
 * 必要に応じて増やしてOK
 */
const ING_CATEGORIES = ["肉", "魚", "野菜", "卵・乳", "豆", "穀物", "調味料", "その他"] as const;
type IngCategory = (typeof ING_CATEGORIES)[number];

export default function DayDetailModal({ open, ymd, kondates, onClose, onUpsert }: Props) {
    /**
     * ✅ Hooks は必ず最初に呼ぶ（条件分岐の前にreturnしない）
     * open/ymd がない時も hooks の順序が崩れないように
     * isOpen と safeYmd を作って後段でガードする。
     */
    const isOpen = open && !!ymd;
    const safeYmd = ymd ?? "";

    /**
     * 選択日の献立だけ抽出（openじゃない時は空配列）
     */
    const rowsOfDay = useMemo(() => {
        if (!isOpen) return [];
        return kondates.filter((r) => r.meal_date === safeYmd);
    }, [isOpen, kondates, safeYmd]);

    /**
     * category(朝/昼/夜/弁当) -> row のMap
     * 既存データをすぐ参照できる
     */
    const rowByCat = useMemo(() => {
        const map = new Map<string, KondateRow>();
        rowsOfDay.forEach((r) => map.set(r.category, r));
        return map;
    }, [rowsOfDay]);

    // ----------------------------
    // 画面入力 state
    // ----------------------------

    /**
     * 献立名（カテゴリごと）
     * 例：draftTitle["夜"] = "厚揚げ麻婆丼"
     */
    const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});

    /**
     * 材料（カテゴリごと）
     * 例：draftIng["夜"] = [{name:"鶏もも", amount:"200g"}]
     */
    const [draftIng, setDraftIng] = useState<Record<string, Ingredient[]>>({});

    /**
     * 食材マスタ（DB: ingredients_master）を保持
     */
    const [masterItems, setMasterItems] = useState<IngredientMaster[]>([]);
    const [masterLoading, setMasterLoading] = useState(false);
    const [masterError, setMasterError] = useState("");

    /**
     * 「材料行ごとの食材カテゴリ」を記憶する
     * - キーは `${kondateCat}-${rowIndex}` にして一意にする
     * - 例： "夜-0" -> "肉"
     *
     * ※ 今はDB保存しない（UI補助）
     *    将来、食材IDを保存するようにすると精度が上がる
     */
    const [ingCategoryByRowKey, setIngCategoryByRowKey] = useState<Record<string, IngCategory>>({});

    // 保存中フラグ（連打防止）
    const [saving, setSaving] = useState(false);

    // 画面に表示するメッセージ
    const [msg, setMsg] = useState("");

    /**
     * モーダルを開いたタイミングで
     * 1) 既存の献立/材料をフォームへ流し込み
     * 2) 食材マスタを取得（初回 or 開くたび、どちらでもOK）
     */
    useEffect(() => {
        if (!isOpen) return;

        // 1) 既存値をフォームへセット
        const initTitle: Record<string, string> = {};
        const initIng: Record<string, Ingredient[]> = {};
        const initRowCat: Record<string, IngCategory> = {};

        CATS.forEach((cat) => {
            const row = rowByCat.get(cat);

            initTitle[cat] = row?.title ?? "";

            const ings = (row as any)?.ingredients ?? [];
            initIng[cat] = Array.isArray(ings) ? (ings as Ingredient[]) : [];

            // 行ごとのカテゴリは「最初はその他」でOK（推測したくなったら後で）
            initIng[cat].forEach((_, idx) => {
                initRowCat[`${cat}-${idx}`] = "その他";
            });
        });

        setDraftTitle(initTitle);
        setDraftIng(initIng);
        setIngCategoryByRowKey(initRowCat);
        setMsg("");

        // 2) 食材マスタ取得（全件）
        (async () => {
            try {
                setMasterLoading(true);
                setMasterError("");
                const items = await apiFetchIngredients(); // category指定なし=全件
                setMasterItems(items);
            } catch (e) {
                setMasterError(e instanceof Error ? e.message : "食材マスタ取得に失敗しました");
            } finally {
                setMasterLoading(false);
            }
        })();
    }, [isOpen, safeYmd, rowByCat]);

    /**
     * ✅ Hooksの後なら return null OK
     */
    if (!isOpen) return null;

    // ----------------------------
    // 材料編集用の操作関数
    // ----------------------------

    /**
     * 材料行を追加
     */
    const addIngRow = (cat: KondateCat) => {
        setDraftIng((p) => ({
            ...p,
            [cat]: [...(p[cat] ?? []), { name: "", amount: "" }],
        }));

        // 追加した行のカテゴリはとりあえず "その他"
        const nextIndex = (draftIng[cat]?.length ?? 0);
        setIngCategoryByRowKey((p) => ({
            ...p,
            [`${cat}-${nextIndex}`]: "その他",
        }));
    };

    /**
     * 材料行を更新（name or amount）
     */
    const updateIngRow = (cat: KondateCat, idx: number, key: "name" | "amount", value: string) => {
        setDraftIng((p) => {
            const arr = [...(p[cat] ?? [])];
            const old = arr[idx] ?? { name: "", amount: "" };
            arr[idx] = { ...old, [key]: value };
            return { ...p, [cat]: arr };
        });
    };

    /**
     * 材料行を削除
     */
    const removeIngRow = (cat: KondateCat, idx: number) => {
        setDraftIng((p) => {
            const arr = [...(p[cat] ?? [])];
            arr.splice(idx, 1);
            return { ...p, [cat]: arr };
        });

        // ここは“ざっくり”でOK：削除後の行番号ズレを完全追従させたいなら後で改善する
        // まずはUIが使えることを優先。
    };

    /**
     * 1カテゴリ分（朝/昼/夜/弁当）を保存
     * - 既存rowがあれば UPDATE
     * - 無ければ CREATE
     */
    const saveOne = async (cat: KondateCat) => {
        const title = (draftTitle[cat] ?? "").trim();

        // タイトルは必須（空なら保存しない）
        if (!title) {
            setMsg(`${cat}：献立名を入れてね`);
            return;
        }

        // 材料の空行は落として保存
        const ingredients = (draftIng[cat] ?? [])
            .map((x) => ({ name: (x.name ?? "").trim(), amount: (x.amount ?? "").trim() }))
            .filter((x) => x.name !== "" || x.amount !== "");

        try {
            setSaving(true);
            setMsg("");

            const existing = rowByCat.get(cat);

            const saved: KondateRow = existing
                ? await apiUpdateKondate(existing.id, { title, ingredients })
                : await apiCreateKondate({
                    title,
                    category: cat,
                    meal_date: safeYmd,
                    ingredients,
                });

            // 親のstateへ反映 → 週タイルも即更新される
            onUpsert(saved);

            setMsg(`${cat}：保存しました`);
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    // ----------------------------
    // 画面
    // ----------------------------
    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                zIndex: 50,
            }}
        >
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    background: "white",
                    paddingBottom: 8,
                    marginBottom: 12,
                    zIndex: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            ></div>
            {/* 背景クリックで閉じるが、中身クリックでは閉じない */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "min(840px, 100%)",
                    background: "white",
                    borderRadius: 12,

                    // ✅ 画面内に収める（スマホで下が切れないようにする）
                    maxHeight: "calc(100dvh - 32px)", // padding(16*2)を引く
                    overflowY: "auto",

                    // ✅ 端末の「下のホームバー」も考慮（対応ブラウザで効く）
                    padding: 16,

                    boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                }}
            >
                {/* ヘッダー */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 800 }}>{safeYmd} の献立（追加・編集）</div>
                    <button onClick={onClose} style={{ padding: "6px 10px" }}>
                        閉じる
                    </button>
                </div>

                {/* 参考：現在登録されている内容（軽く表示） */}
                <div style={{ marginBottom: 12, color: "#666", fontSize: 12 }}>
                    現在の登録：
                    {rowsOfDay.length === 0 ? (
                        <span>（まだありません）</span>
                    ) : (
                        <ul style={{ margin: "6px 0 0 16px" }}>
                            {rowsOfDay.map((r) => (
                                <li key={r.id}>
                                    {r.category}：{r.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 食材マスタの状態 */}
                <div style={{ marginBottom: 12, fontSize: 12, color: "#666" }}>
                    食材候補：{masterLoading ? "読み込み中..." : `${masterItems.length}件`}
                    {masterError && <span style={{ color: "crimson" }}>（{masterError}）</span>}
                </div>

                {/* カテゴリごとの編集ブロック */}
                <div style={{ display: "grid", gap: 12 }}>
                    {CATS.map((cat) => {
                        const ings = draftIng[cat] ?? [];

                        return (
                            <section
                                key={cat}
                                style={{
                                    border: "1px solid #eee",
                                    borderRadius: 12,
                                    padding: 12,
                                    background: "#fff",
                                }}
                            >
                                {/* 見出し＋保存 */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                    <div style={{ fontWeight: 800 }}>{cat}</div>

                                    <button
                                        onClick={() => saveOne(cat)}
                                        disabled={saving}
                                        style={{ padding: "8px 12px", cursor: saving ? "not-allowed" : "pointer" }}
                                    >
                                        保存
                                    </button>
                                </div>

                                {/* 献立名 */}
                                <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 8, marginTop: 10 }}>
                                    <div style={{ color: "#666", paddingTop: 8 }}>献立名</div>
                                    <input
                                        value={draftTitle[cat] ?? ""}
                                        onChange={(e) => setDraftTitle((p) => ({ ...p, [cat]: e.target.value }))}
                                        placeholder="例：厚揚げ麻婆丼"
                                        disabled={saving}
                                        style={{ padding: 8 }}
                                    />
                                </div>

                                {/* 材料（分量） */}
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>材料（分量）</div>

                                    {ings.length === 0 && (
                                        <div style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>
                                            （材料がまだありません。下の「材料を追加」から入れられます）
                                        </div>
                                    )}

                                    {ings.map((ing, idx) => {
                                        // 行ごとのカテゴリを取得（無ければその他）
                                        const rowKey = `${cat}-${idx}`;
                                        const rowCategory = ingCategoryByRowKey[rowKey] ?? "その他";

                                        // 選択カテゴリに属する候補だけ絞り込み
                                        const options = masterItems.filter((m) => m.category === rowCategory);

                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    border: "1px solid #eee",
                                                    borderRadius: 10,
                                                    padding: 10,
                                                    marginBottom: 8,
                                                    background: "#fff",
                                                }}
                                            >
                                                {/* ① カテゴリ選択 + ② 食材選択 + 削除 */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 8,
                                                        flexWrap: "wrap",
                                                        alignItems: "center",
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <div style={{ fontSize: 12, color: "#666", width: 64 }}>カテゴリ</div>

                                                    <select
                                                        value={rowCategory}
                                                        onChange={(e) =>
                                                            setIngCategoryByRowKey((p) => ({
                                                                ...p,
                                                                [rowKey]: e.target.value as IngCategory,
                                                            }))
                                                        }
                                                        disabled={saving || masterLoading}
                                                        style={{ padding: 8 }}
                                                    >
                                                        {ING_CATEGORIES.map((c) => (
                                                            <option key={c} value={c}>
                                                                {c}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {/* 食材選択：選ぶと name に反映 */}
                                                    <select
                                                        value="" // 毎回未選択にして「選んだら反映」する方式
                                                        onChange={(e) => {
                                                            const pickedName = e.target.value;
                                                            if (!pickedName) return;
                                                            updateIngRow(cat, idx, "name", pickedName);
                                                        }}
                                                        disabled={saving || masterLoading || options.length === 0}
                                                        style={{ padding: 8 }}
                                                    >
                                                        <option value="">{options.length ? "食材を選ぶ" : "候補なし"}</option>
                                                        {options.map((m) => (
                                                            <option key={m.id} value={m.name_ja}>
                                                                {m.name_ja}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        onClick={() => removeIngRow(cat, idx)}
                                                        disabled={saving}
                                                        style={{ padding: "8px 10px", cursor: saving ? "not-allowed" : "pointer" }}
                                                    >
                                                        削除
                                                    </button>
                                                </div>

                                                {/* ③ 手入力欄（マスタに無い食材の“逃げ道”として残す） */}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                    <input
                                                        value={ing.name}
                                                        onChange={(e) => updateIngRow(cat, idx, "name", e.target.value)}
                                                        placeholder="例：鶏もも"
                                                        disabled={saving}
                                                        style={{ padding: 8 }}
                                                    />
                                                    <input
                                                        value={ing.amount}
                                                        onChange={(e) => updateIngRow(cat, idx, "amount", e.target.value)}
                                                        placeholder="例：200g / 大さじ1"
                                                        disabled={saving}
                                                        style={{ padding: 8 }}
                                                    />
                                                </div>

                                                <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                                                    ※ 食材は「選択」でも「手入力」でもOK（次の段階で英語マッピングに繋げます）
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <button
                                        onClick={() => addIngRow(cat)}
                                        disabled={saving}
                                        style={{ padding: "8px 12px", cursor: saving ? "not-allowed" : "pointer" }}
                                    >
                                        材料を追加
                                    </button>
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* メッセージ */}
                {msg && (
                    <div style={{ marginTop: 12, color: msg.includes("失敗") ? "crimson" : "#666" }}>
                        {msg}
                    </div>
                )}
            </div>
        </div>
    );
}
