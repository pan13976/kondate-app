// src/components/DayDetailModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { KondateRow } from "../types/kondate";
import { apiCreateKondate, apiUpdateKondate } from "../lib/kondatesApi";

/**
 * 材料（分量）1行分の型
 * - name: 食材名（例：鶏もも）
 * - amount: 分量（例：200g / 1/2丁 / 大さじ1）
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
   * 保存後に親の state(kondates) を更新するためのコールバック
   * - 追加のとき：新規rowを親に足す
   * - 更新のとき：該当rowを差し替える
   */
  onUpsert: (row: KondateRow) => void;
};

const CATS = ["朝", "昼", "夜", "弁当"] as const;
type Cat = (typeof CATS)[number];

export default function DayDetailModal({ open, ymd, kondates, onClose, onUpsert }: Props) {
  /**
   * ★重要：Hooksは「条件分岐の前」に必ず呼ぶ
   * open/ymd が無いときも hooks は動くようにするため、
   * isOpen と safeYmd を作ってガードする。
   */
  const isOpen = open && !!ymd;
  const safeYmd = ymd ?? "";

  /**
   * 選択日のデータだけを抽出
   * - isOpen=false の時は空配列にしておく（hooks順序を守るため）
   */
  const rowsOfDay = useMemo(() => {
    if (!isOpen) return [];
    return kondates.filter((r) => r.meal_date === safeYmd);
  }, [isOpen, kondates, safeYmd]);

  /**
   * category -> row のMapを作る（朝/昼/夜/弁当の既存データを即参照できる）
   */
  const rowByCat = useMemo(() => {
    const map = new Map<string, KondateRow>();
    rowsOfDay.forEach((r) => map.set(r.category, r));
    return map;
  }, [rowsOfDay]);

  /**
   * 入力中の献立名（カテゴリごと）
   * 例：draftTitle["夜"] = "厚揚げ麻婆丼"
   */
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});

  /**
   * 入力中の材料（カテゴリごと）
   * 例：draftIng["夜"] = [{name:"鶏もも", amount:"200g"}]
   */
  const [draftIng, setDraftIng] = useState<Record<string, Ingredient[]>>({});

  // 保存中フラグ（連打防止）
  const [saving, setSaving] = useState(false);

  // 画面下に出すメッセージ
  const [msg, setMsg] = useState("");

  /**
   * モーダルを開いた（or 日付が切り替わった）タイミングで
   * 既存値をフォームに流し込む。
   *
   * - 既存 row があればその値を入れる
   * - 無ければ空文字/空配列にする（未登録カテゴリ）
   */
  useEffect(() => {
    if (!isOpen) return;

    const initTitle: Record<string, string> = {};
    const initIng: Record<string, Ingredient[]> = {};

    CATS.forEach((cat) => {
      const row = rowByCat.get(cat);

      initTitle[cat] = row?.title ?? "";

      // ingredients はDBでは [] default にしている想定
      // ただし、型や過去データで undefined の可能性もあるので ?? [] で安全にする
      const ings = (row as any)?.ingredients ?? [];
      initIng[cat] = Array.isArray(ings) ? (ings as Ingredient[]) : [];
    });

    setDraftTitle(initTitle);
    setDraftIng(initIng);
    setMsg("");
  }, [isOpen, safeYmd, rowByCat]);

  /**
   * ここで return null するのはOK（hooksの後ならOK）
   * open=false の時は描画しない
   */
  if (!isOpen) return null;

  // ----------------------------
  // 材料編集用の操作関数
  // ----------------------------

  // 材料行を追加
  const addIngRow = (cat: Cat) => {
    setDraftIng((p) => ({
      ...p,
      [cat]: [...(p[cat] ?? []), { name: "", amount: "" }],
    }));
  };

  // 材料行を更新（name/amount）
  const updateIngRow = (cat: Cat, idx: number, key: "name" | "amount", value: string) => {
    setDraftIng((p) => {
      const arr = [...(p[cat] ?? [])];
      const old = arr[idx] ?? { name: "", amount: "" };
      arr[idx] = { ...old, [key]: value };
      return { ...p, [cat]: arr };
    });
  };

  // 材料行を削除
  const removeIngRow = (cat: Cat, idx: number) => {
    setDraftIng((p) => {
      const arr = [...(p[cat] ?? [])];
      arr.splice(idx, 1);
      return { ...p, [cat]: arr };
    });
  };

  /**
   * 1カテゴリ分を保存（朝/昼/夜/弁当）
   * - 既にrowがあれば UPDATE
   * - 無ければ CREATE
   */
  const saveOne = async (cat: Cat) => {
    const title = (draftTitle[cat] ?? "").trim();

    // タイトルは必須（空は保存しない）
    if (!title) {
      setMsg(`${cat}：献立名を入れてね`);
      return;
    }

    // 材料は「空行」を落として保存する
    const ingredients = (draftIng[cat] ?? [])
      .map((x) => ({ name: (x.name ?? "").trim(), amount: (x.amount ?? "").trim() }))
      .filter((x) => x.name !== "" || x.amount !== "");

    try {
      setSaving(true);
      setMsg("");

      const existing = rowByCat.get(cat);

      // 既存があれば更新、無ければ新規作成
      const saved: KondateRow = existing
        ? await apiUpdateKondate(existing.id, { title, ingredients })
        : await apiCreateKondate({
            title,
            category: cat,
            meal_date: safeYmd,
            ingredients,
          });

      // 親のstateに反映（週タイルや表示が即更新される）
      onUpsert(saved);

      setMsg(`${cat}：保存しました`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

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
      {/* 背景クリックで閉じるが、中身クリックでは閉じない */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          background: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* ヘッダ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800 }}>{safeYmd} の献立（追加・編集）</div>
          <button onClick={onClose} style={{ padding: "6px 10px" }}>
            閉じる
          </button>
        </div>

        {/* 参考：現在登録されている一覧を軽く表示 */}
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

                {/* 材料 */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>材料（分量）</div>

                  {ings.length === 0 && (
                    <div style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>
                      （材料がまだありません。下の「材料を追加」から入れられます）
                    </div>
                  )}

                  {ings.map((ing, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto",
                        gap: 8,
                        marginBottom: 6,
                        alignItems: "center",
                      }}
                    >
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
                        placeholder="例：200g / 1/2丁 / 大さじ1"
                        disabled={saving}
                        style={{ padding: 8 }}
                      />
                      <button
                        onClick={() => removeIngRow(cat, idx)}
                        disabled={saving}
                        style={{ padding: "8px 10px", cursor: saving ? "not-allowed" : "pointer" }}
                      >
                        削除
                      </button>
                    </div>
                  ))}

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
