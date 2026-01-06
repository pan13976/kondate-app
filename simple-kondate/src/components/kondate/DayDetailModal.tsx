// src/components/kondate/DayDetailModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { KondateRow } from "../../types/kondate";
import { apiCreateKondate, apiUpdateKondate } from "../../lib/kondates/Api";
import { apiFetchIngredients, type IngredientMaster } from "../../lib/ingredientsApi";

/**
 * 1行分の材料（分量）
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
  onUpsert: (row: KondateRow) => void;
};

/** 献立カテゴリ */
const CATS = ["朝", "昼", "夜", "弁当"] as const;
type KondateCat = (typeof CATS)[number];

/** 食材カテゴリ（マスタ側の分類） */
const ING_CATEGORIES = ["肉", "魚", "野菜", "卵・乳", "豆", "穀物", "調味料", "その他"] as const;
type IngCategory = (typeof ING_CATEGORIES)[number];

/**
 * draftKey の設計
 * - 既存： "id-<number>"
 * - 新規： "new-<cat>-<seq>"
 */
function makeNewKey(cat: KondateCat, seq: number) {
  return `new-${cat}-${seq}`;
}
function isIdKey(key: string) {
  return key.startsWith("id-");
}
function parseIdFromKey(key: string) {
  if (!isIdKey(key)) return null;
  const n = Number(key.replace("id-", ""));
  return Number.isFinite(n) ? n : null;
}

export default function DayDetailModal({ open, ymd, kondates, onClose, onUpsert }: Props) {
  const isOpen = open && !!ymd;
  const safeYmd = ymd ?? "";

  /**
   * 選択日の献立だけ抽出
   */
  const rowsOfDay = useMemo(() => {
    if (!isOpen) return [];
    return kondates.filter((r) => r.meal_date === safeYmd);
  }, [isOpen, kondates, safeYmd]);

  /**
   * category -> rows[] に分ける（複数対応）
   */
  const rowsByCat = useMemo(() => {
    const map = new Map<KondateCat, KondateRow[]>();
    CATS.forEach((c) => map.set(c, []));
    for (const r of rowsOfDay) {
      const cat = (r.category as KondateCat) ?? "夜";
      if (cat === "朝" || cat === "昼" || cat === "夜" || cat === "弁当") {
        map.get(cat)!.push(r);
      }
    }
    for (const cat of CATS) {
      map.set(
        cat,
        (map.get(cat) ?? []).slice().sort((a, b) => a.id - b.id)
      );
    }
    return map;
  }, [rowsOfDay]);

  // ----------------------------
  // 食材マスタ
  // ----------------------------
  const [masterItems, setMasterItems] = useState<IngredientMaster[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  // ----------------------------
  // 入力 state
  // ----------------------------

  const [draft, setDraft] = useState<
    Record<
      string,
      {
        cat: KondateCat;
        title: string;
        ingredients: Ingredient[];
        isNew: boolean;
      }
    >
  >({});

  /**
   * 「材料行ごとの食材カテゴリ」： key = `${draftKey}-${idx}`
   */
  const [ingCategoryByRowKey, setIngCategoryByRowKey] = useState<Record<string, IngCategory>>({});

  /**
   * ★追加：材料欄の開閉状態（デフォルトは閉）
   * key: draftKey
   */
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  /**
   * open したら
   * - rowsOfDay から draft を作る
   * - マスタを取る
   * - 材料欄はデフォルト閉（ただし「材料がある献立」は好みで開いてもOK。ここでは一律閉）
   */
  useEffect(() => {
    if (!isOpen) return;

    const nextDraft: Record<
      string,
      { cat: KondateCat; title: string; ingredients: Ingredient[]; isNew: boolean }
    > = {};
    const nextIngCat: Record<string, IngCategory> = {};
    const nextExpanded: Record<string, boolean> = {};

    for (const cat of CATS) {
      const rows = rowsByCat.get(cat) ?? [];
      for (const r of rows) {
        const k = `id-${r.id}`;
        const ings = ((r as any)?.ingredients ?? []) as Ingredient[];
        nextDraft[k] = {
          cat,
          title: r.title ?? "",
          ingredients: Array.isArray(ings) ? ings : [],
          isNew: false,
        };

        // ★材料はデフォルト閉
        nextExpanded[k] = false;

        (nextDraft[k].ingredients ?? []).forEach((_, idx) => {
          nextIngCat[`${k}-${idx}`] = "その他";
        });
      }
    }

    setDraft(nextDraft);
    setIngCategoryByRowKey(nextIngCat);
    setExpandedIngredients(nextExpanded);
    setMsg("");

    (async () => {
      try {
        setMasterLoading(true);
        setMasterError("");
        const items = await apiFetchIngredients();
        setMasterItems(items);
      } catch (e) {
        setMasterError(e instanceof Error ? e.message : "食材マスタ取得に失敗しました");
      } finally {
        setMasterLoading(false);
      }
    })();
  }, [isOpen, rowsByCat]);

  if (!isOpen) return null;

  // ----------------------------
  // 操作関数
  // ----------------------------

  const toggleIngredients = (key: string) => {
    setExpandedIngredients((p) => ({ ...p, [key]: !p[key] }));
  };

  const addDish = (cat: KondateCat) => {
    const seq = Object.keys(draft).filter((k) => k.startsWith(`new-${cat}-`)).length + 1;
    const key = makeNewKey(cat, seq);

    setDraft((p) => ({
      ...p,
      [key]: { cat, title: "", ingredients: [], isNew: true },
    }));

    // ★新規も材料は閉で開始
    setExpandedIngredients((p) => ({ ...p, [key]: false }));

    setMsg("");
  };

  const updateTitle = (key: string, value: string) => {
    setDraft((p) => ({
      ...p,
      [key]: { ...p[key], title: value },
    }));
  };

  const addIngRow = (key: string) => {
    setDraft((p) => {
      const cur = p[key];
      const next = [...(cur.ingredients ?? []), { name: "", amount: "" }];
      return { ...p, [key]: { ...cur, ingredients: next } };
    });

    const nextIndex = (draft[key]?.ingredients?.length ?? 0);
    setIngCategoryByRowKey((p) => ({
      ...p,
      [`${key}-${nextIndex}`]: "その他",
    }));
  };

  const updateIngRow = (key: string, idx: number, field: "name" | "amount", value: string) => {
    setDraft((p) => {
      const cur = p[key];
      const arr = [...(cur.ingredients ?? [])];
      const old = arr[idx] ?? { name: "", amount: "" };
      arr[idx] = { ...old, [field]: value };
      return { ...p, [key]: { ...cur, ingredients: arr } };
    });
  };

  const removeIngRow = (key: string, idx: number) => {
    setDraft((p) => {
      const cur = p[key];
      const arr = [...(cur.ingredients ?? [])];
      arr.splice(idx, 1);
      return { ...p, [key]: { ...cur, ingredients: arr } };
    });
  };

  const saveDish = async (key: string) => {
    const cur = draft[key];
    if (!cur) return;

    const title = (cur.title ?? "").trim();
    if (!title) {
      setMsg(`${cur.cat}：献立名を入れてね`);
      return;
    }

    const ingredients = (cur.ingredients ?? [])
      .map((x) => ({ name: (x.name ?? "").trim(), amount: (x.amount ?? "").trim() }))
      .filter((x) => x.name !== "" || x.amount !== "");

    try {
      setSavingKey(key);
      setMsg("");

      const id = parseIdFromKey(key);

      const saved: KondateRow =
        id != null
          ? await apiUpdateKondate(id, { title, ingredients })
          : await apiCreateKondate({
              title,
              category: cur.cat,
              meal_date: safeYmd,
              ingredients,
            });

      onUpsert(saved);

      // 新規キー → idキーに差し替え
      if (id == null) {
        const newKey = `id-${saved.id}`;
        setDraft((p) => {
          const copy = { ...p };
          delete copy[key];
          copy[newKey] = {
            cat: cur.cat,
            title: saved.title ?? "",
            ingredients: (saved as any)?.ingredients ?? ingredients,
            isNew: false,
          };
          return copy;
        });

        // ★開閉状態も引き継ぐ
        setExpandedIngredients((p) => {
          const copy = { ...p };
          const wasOpen = !!copy[key];
          delete copy[key];
          copy[newKey] = wasOpen;
          return copy;
        });
      }

      setMsg(`${cur.cat}：保存しました`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingKey(null);
    }
  };

  // 表示順：カテゴリ内で draftKey を並べる（既存→新規）
  const keysOfCat = (cat: KondateCat) => {
    const keys = Object.keys(draft).filter((k) => draft[k]?.cat === cat);
    const exist = keys
      .filter((k) => k.startsWith("id-"))
      .sort((a, b) => (parseIdFromKey(a)! - parseIdFromKey(b)!));
    const news = keys.filter((k) => k.startsWith("new-")).sort();
    return [...exist, ...news];
  };

  const countIngredients = (key: string) => (draft[key]?.ingredients?.length ?? 0);

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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 100%)",
          background: "white",
          borderRadius: 12,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          padding: 16,
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800 }}>{safeYmd} の献立（複数追加OK）</div>
          <button onClick={onClose} style={{ padding: "6px 10px" }}>
            閉じる
          </button>
        </div>

        {/* メッセージ */}
        {msg ? (
          <div style={{ marginBottom: 12, color: msg.includes("失敗") ? "crimson" : "#666" }}>{msg}</div>
        ) : null}

        {/* 食材マスタ */}
        <div style={{ marginBottom: 12, fontSize: 12, color: "#666" }}>
          食材候補：{masterLoading ? "読み込み中..." : `${masterItems.length}件`}
          {masterError && <span style={{ color: "crimson" }}>（{masterError}）</span>}
        </div>

        {/* カテゴリごとのブロック */}
        <div style={{ display: "grid", gap: 12 }}>
          {CATS.map((cat) => {
            const keys = keysOfCat(cat);

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>{cat}</div>

                  <button onClick={() => addDish(cat)} style={{ padding: "8px 12px", cursor: "pointer" }}>
                    ＋献立を追加
                  </button>
                </div>

                {keys.length === 0 ? (
                  <div style={{ marginTop: 10, color: "#999", fontSize: 12 }}>
                    （まだありません。「＋献立を追加」から追加できます）
                  </div>
                ) : null}

                {/* 献立カード（複数） */}
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {keys.map((key) => {
                    const cur = draft[key];
                    const ings = cur?.ingredients ?? [];
                    const isSavingThis = savingKey === key;
                    const isExpanded = !!expandedIngredients[key];

                    return (
                      <div
                        key={key}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 12,
                          padding: 12,
                          background: "rgba(255,255,255,0.98)",
                        }}
                      >
                        {/* タイトル + 保存 */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>
                            {isIdKey(key) ? `ID: ${parseIdFromKey(key)}` : "新規"}
                          </div>

                          <button
                            onClick={() => saveDish(key)}
                            disabled={savingKey !== null}
                            style={{
                              padding: "8px 12px",
                              cursor: savingKey !== null ? "not-allowed" : "pointer",
                              fontWeight: 900,
                            }}
                          >
                            {isSavingThis ? "保存中…" : "保存"}
                          </button>
                        </div>

                        {/* 献立名 */}
                        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 8, marginTop: 10 }}>
                          <div style={{ color: "#666", paddingTop: 8, fontSize: 12 }}>献立名</div>
                          <input
                            value={cur?.title ?? ""}
                            onChange={(e) => updateTitle(key, e.target.value)}
                            placeholder="例：厚揚げ麻婆丼"
                            disabled={savingKey !== null}
                            style={{ padding: 8 }}
                          />
                        </div>

                        {/* ★材料（折りたたみ） */}
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => toggleIngredients(key)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.10)",
                              background: "rgba(0,0,0,0.03)",
                              cursor: "pointer",
                              fontWeight: 900,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                            }}
                            aria-expanded={isExpanded}
                          >
                            <span>材料（{countIngredients(key)}件）</span>
                            <span style={{ fontWeight: 900 }}>{isExpanded ? "▲" : "▼"}</span>
                          </button>

                          {isExpanded ? (
                            <div
                              style={{
                                marginTop: 10,
                                border: "1px solid rgba(0,0,0,0.08)",
                                borderRadius: 12,
                                padding: 12,
                                background: "rgba(255,255,255,0.98)",
                              }}
                            >
                              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>材料（分量）</div>

                              {ings.length === 0 ? (
                                <div style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>
                                  （材料なし。「材料を追加」から入れられます）
                                </div>
                              ) : null}

                              {ings.map((ing, idx) => {
                                const rowKey = `${key}-${idx}`;
                                const rowCategory = ingCategoryByRowKey[rowKey] ?? "その他";
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
                                        disabled={savingKey !== null || masterLoading}
                                        style={{ padding: 8 }}
                                      >
                                        {ING_CATEGORIES.map((c) => (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        ))}
                                      </select>

                                      <select
                                        value=""
                                        onChange={(e) => {
                                          const pickedName = e.target.value;
                                          if (!pickedName) return;
                                          updateIngRow(key, idx, "name", pickedName);
                                        }}
                                        disabled={savingKey !== null || masterLoading || options.length === 0}
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
                                        onClick={() => removeIngRow(key, idx)}
                                        disabled={savingKey !== null}
                                        style={{
                                          padding: "8px 10px",
                                          cursor: savingKey !== null ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        削除
                                      </button>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                      <input
                                        value={ing.name}
                                        onChange={(e) => updateIngRow(key, idx, "name", e.target.value)}
                                        placeholder="例：鶏もも"
                                        disabled={savingKey !== null}
                                        style={{ padding: 8 }}
                                      />
                                      <input
                                        value={ing.amount}
                                        onChange={(e) => updateIngRow(key, idx, "amount", e.target.value)}
                                        placeholder="例：200g / 大さじ1"
                                        disabled={savingKey !== null}
                                        style={{ padding: 8 }}
                                      />
                                    </div>

                                    <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                                      ※ 食材は「選択」でも「手入力」でもOK
                                    </div>
                                  </div>
                                );
                              })}

                              <button
                                onClick={() => addIngRow(key)}
                                disabled={savingKey !== null}
                                style={{
                                  padding: "8px 12px",
                                  cursor: savingKey !== null ? "not-allowed" : "pointer",
                                }}
                              >
                                材料を追加
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
