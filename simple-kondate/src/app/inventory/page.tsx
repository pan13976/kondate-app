// src/app/inventory/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiConsumeInventoryItem,
  apiCreateInventoryItem,
  apiDeleteInventoryItem,
  apiFetchInventoryItems,
  apiUpdateInventoryItem,
} from "../../lib/inventory/Api";
import type { InventoryItem, InventoryKind } from "../../types/inventory";

const FOOD_CATS = [
  "肉",
  "魚",
  "野菜",
  "果物",
  "乳製品",
  "卵",
  "豆",
  "穀類",
  "調味料",
  "冷凍",
  "その他",
] as const;

const DAILY_CATS = [
  "洗剤",
  "紙類",
  "衛生",
  "消耗品",
  "医薬",
  "ペット",
  "その他",
] as const;

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isExpiringSoon(expires_on: string | null) {
  if (!expires_on) return false;
  const t = new Date(expires_on + "T00:00:00").getTime();
  const now = new Date().getTime();
  const diff = t - now;
  const days = diff / (1000 * 60 * 60 * 24);
  return days <= 3;
}

/**
 * ★重要：id が undefined/空のときに API を叩かない
 * - invalid input syntax for type uuid: "undefined" 対策
 */
function safeId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const v = id.trim();
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<InventoryItem[]>([]);

  // 追加フォーム
  const [kind, setKind] = useState<InventoryKind>("食材");
  const [category, setCategory] = useState<string>("野菜");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<string>("個");
  const [expires, setExpires] = useState<string>("");

  // 編集中
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    kind: InventoryKind;
    category: string;
    name: string;
    qty: number;
    unit: string;
    expires: string;
  } | null>(null);

  const cats = useMemo(() => (kind === "食材" ? FOOD_CATS : DAILY_CATS), [kind]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const list = await apiFetchInventoryItems();

      // ★保険：id が無いレコードが混ざったら弾く（画面で事故らない）
      const cleaned = (list ?? []).filter((x) => safeId((x as any).id));
      if (cleaned.length !== (list ?? []).length) {
        setError("一部の在庫データに id が無く、表示から除外しました（APIがidを返しているか確認してください）");
      }

      setItems(cleaned);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // kind を切り替えたらカテゴリの初期値もそれっぽく
  useEffect(() => {
    setCategory(kind === "食材" ? "野菜" : "消耗品");
    setUnit(kind === "食材" ? "個" : "個");
    if (kind !== "食材") setExpires("");
  }, [kind]);

  const grouped = useMemo(() => {
    // kind -> category -> items
    const map = new Map<string, Map<string, InventoryItem[]>>();

    for (const it of items) {
      const k = it.kind ?? "食材";
      const c = (it.category ?? "未分類").trim() || "未分類";
      if (!map.has(k)) map.set(k, new Map());
      const m = map.get(k)!;
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(it);
    }

    // それぞれ created_at desc なのでカテゴリ内はそのまま
    return map;
  }, [items]);

  async function addItem() {
    if (saving) return;

    const n = name.trim();
    if (!n) {
      setError("品名を入力してください");
      return;
    }
    const q = Math.max(0, Math.floor(Number(qty) || 0));
    if (q <= 0) {
      setError("数量は 1 以上にしてください");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const item = await apiCreateInventoryItem({
        kind,
        category: category.trim() || null,
        name: n,
        quantity_num: q,
        unit: unit.trim() || null,
        expires_on: kind === "食材" ? (expires || null) : null,
      });

      // ★保険：作成後に id が無いなら反映しない
      const id = safeId((item as any).id);
      if (!id) {
        setError("追加は成功しましたが、返却データに id がありません（APIの返却項目を確認してください）");
        await fetchAll();
        return;
      }

      setItems((prev) => [item, ...prev]);

      // 入力欄クリア（スマホ向け）
      setName("");
      setQty(1);
      setUnit(kind === "食材" ? "個" : "個");
      setExpires("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(it: InventoryItem) {
    const id = safeId((it as any).id);
    if (!id) {
      setError("id が取得できません（APIが id を返しているか確認してください）");
      return;
    }

    setEditingId(id);
    setEditDraft({
      kind: it.kind,
      category: (it.category ?? "").trim() || (it.kind === "食材" ? "野菜" : "消耗品"),
      name: it.name,
      qty: it.quantity_num,
      unit: (it.unit ?? "").trim() || "個",
      expires: it.expires_on ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(rawId: string) {
    const id = safeId(rawId);
    if (!id) {
      setError("id が取得できません（APIが id を返しているか確認してください）");
      return;
    }
    if (!editDraft) return;
    if (saving) return;

    const n = editDraft.name.trim();
    if (!n) {
      setError("品名を入力してください");
      return;
    }
    const q = Math.max(0, Math.floor(Number(editDraft.qty) || 0));
    if (q <= 0) {
      setError("数量は 1 以上にしてください（0にしたいなら削除）");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateInventoryItem(id, {
        kind: editDraft.kind,
        category: editDraft.category.trim() || null,
        name: n,
        quantity_num: q,
        unit: editDraft.unit.trim() || null,
        expires_on: editDraft.kind === "食材" ? (editDraft.expires || null) : null,
      });

      // ★保険：返却に id が無いと map が壊れるのでフォールバック
      const updatedId = safeId((updated as any).id) ?? id;

      setItems((prev) => prev.map((x) => (x.id === updatedId ? updated : x)));
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function consume(rawId: string) {
    const id = safeId(rawId);
    if (!id) {
      setError("id が取得できません（APIが id を返しているか確認してください）");
      return;
    }

    if (saving) return;
    setSaving(true);
    setError(null);

    // optimistic
    const before = items.find((x) => x.id === id) || null;
    if (before) {
      const next = before.quantity_num - 1;
      if (next <= 0) setItems((prev) => prev.filter((x) => x.id !== id));
      else setItems((prev) => prev.map((x) => (x.id === id ? { ...x, quantity_num: next } : x)));
    }

    try {
      const res = await apiConsumeInventoryItem(id, 1);
      if (!res.deleted && res.item) {
        const resId = safeId((res.item as any).id) ?? id;
        setItems((prev) => prev.map((x) => (x.id === resId ? res.item! : x)));
      }
    } catch (e) {
      // rollback
      if (before) setItems((prev) => [before, ...prev.filter((x) => x.id !== id)]);
      setError(e instanceof Error ? e.message : "消費に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(rawId: string) {
    const id = safeId(rawId);
    if (!id) {
      setError("id が取得できません（APIが id を返しているか確認してください）");
      return;
    }

    const ok = window.confirm("削除しますか？\n（元に戻せません）");
    if (!ok) return;
    if (saving) return;
    setSaving(true);
    setError(null);

    const before = items;
    setItems((prev) => prev.filter((x) => x.id !== id));

    try {
      await apiDeleteInventoryItem(id);
    } catch (e) {
      setItems(before);
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      {/* ヘッダー */}
      <header
        style={{
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.75)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          backdropFilter: "blur(8px)",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #d0f4de 0%, #bde0fe 100%)",
              fontSize: 22,
            }}
          >
            🧊
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>在庫</h1>
            <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              食材・日用品をカテゴリ別に管理（消費/賞味期限/不足抽出）
            </div>
          </div>

          <Link
            href="/main"
            style={{
              textDecoration: "none",
              color: "#234",
              fontSize: 13,
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(0,0,0,0.06)",
              padding: "8px 10px",
              borderRadius: 999,
            }}
          >
            ← メインへ
          </Link>
        </div>
      </header>

      {error && (
        <div
          style={{
            borderRadius: 12,
            padding: 12,
            background: "rgba(255, 230, 230, 0.9)",
            border: "1px solid rgba(0,0,0,0.08)",
            color: "#700",
            marginBottom: 12,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      )}

      {/* 追加フォーム */}
      <section
        style={{
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900 }}>追加</div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, color: "#345" }}>
              種類
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as InventoryKind)}
                style={{
                  marginLeft: 8,
                  borderRadius: 10,
                  padding: "8px 10px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                }}
              >
                <option value="食材">食材</option>
                <option value="日用品">日用品</option>
              </select>
            </label>

            <label style={{ fontSize: 13, color: "#345" }}>
              カテゴリ
              <input
                list={kind === "食材" ? "foodcats" : "dailycats"}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  marginLeft: 8,
                  borderRadius: 10,
                  padding: "8px 10px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  width: 140,
                }}
              />
            </label>

            <datalist id="foodcats">
              {FOOD_CATS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="dailycats">
              {DAILY_CATS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 200, fontSize: 13, color: "#345" }}>
              品名
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={kind === "食材" ? "例：玉ねぎ" : "例：ティッシュ"}
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  marginTop: 6,
                }}
              />
            </label>

            <label style={{ width: 120, fontSize: 13, color: "#345" }}>
              数量
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  marginTop: 6,
                }}
              />
            </label>

            <label style={{ width: 120, fontSize: 13, color: "#345" }}>
              単位
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="例：個"
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  marginTop: 6,
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ fontSize: 13, color: "#345" }}>
              賞味期限（任意）
              <input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                disabled={kind !== "食材"}
                min={ymdToday()}
                style={{
                  display: "block",
                  borderRadius: 10,
                  padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: kind === "食材" ? "white" : "rgba(0,0,0,0.04)",
                  marginTop: 6,
                  width: 180,
                }}
              />
            </label>

            <button
              type="button"
              onClick={addItem}
              disabled={saving}
              style={{
                borderRadius: 12,
                padding: "12px 14px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(208,244,222,0.85)",
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "保存中..." : "＋ 追加"}
            </button>
          </div>
        </div>
      </section>

      {/* 一覧 */}
      <section
        style={{
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>一覧</div>
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            style={{
              marginLeft: "auto",
              borderRadius: 999,
              padding: "8px 10px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.85)",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            ↻ 更新
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 14, color: "#555", fontSize: 13 }}>読み込み中...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 14, color: "#555", fontSize: 13 }}>まだ在庫がありません</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 14 }}>
            {Array.from(grouped.entries()).map(([k, catMap]) => (
              <div key={k} style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{k}</div>

                {Array.from(catMap.entries()).map(([c, list]) => (
                  <div
                    key={`${k}:${c}`}
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#345" }}>{c}</div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {list.map((it) => {
                        const id = safeId((it as any).id); // ★ここで確定させる
                        const editing = !!id && editingId === id;
                        const soon = it.kind === "食材" && isExpiringSoon(it.expires_on);

                        return (
                          <div
                            key={id ?? `${it.name}-${it.created_at}`} // ★idが無い時も落ちない
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 10,
                              alignItems: "center",
                              padding: "10px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: soon ? "rgba(255, 245, 220, 0.9)" : "white",
                              opacity: id ? 1 : 0.7,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              {editing ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  {/* --- 編集UI（元のまま） --- */}
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <select
                                      value={editDraft?.kind ?? "食材"}
                                      onChange={(e) =>
                                        setEditDraft((p) =>
                                          p
                                            ? {
                                                ...p,
                                                kind: e.target.value as InventoryKind,
                                                expires: e.target.value === "食材" ? p.expires : "",
                                              }
                                            : p
                                        )
                                      }
                                      style={{
                                        borderRadius: 10,
                                        padding: "8px 10px",
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        background: "white",
                                      }}
                                    >
                                      <option value="食材">食材</option>
                                      <option value="日用品">日用品</option>
                                    </select>

                                    <input
                                      value={editDraft?.category ?? ""}
                                      onChange={(e) =>
                                        setEditDraft((p) => (p ? { ...p, category: e.target.value } : p))
                                      }
                                      placeholder="カテゴリ"
                                      style={{
                                        borderRadius: 10,
                                        padding: "8px 10px",
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        background: "white",
                                        width: 120,
                                      }}
                                    />
                                  </div>

                                  <input
                                    value={editDraft?.name ?? ""}
                                    onChange={(e) =>
                                      setEditDraft((p) => (p ? { ...p, name: e.target.value } : p))
                                    }
                                    placeholder="品名"
                                    style={{
                                      borderRadius: 10,
                                      padding: "8px 10px",
                                      border: "1px solid rgba(0,0,0,0.12)",
                                      background: "white",
                                      width: "100%",
                                    }}
                                  />

                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={editDraft?.qty ?? 1}
                                      onChange={(e) =>
                                        setEditDraft((p) =>
                                          p
                                            ? { ...p, qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) }
                                            : p
                                        )
                                      }
                                      style={{
                                        borderRadius: 10,
                                        padding: "8px 10px",
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        background: "white",
                                        width: 90,
                                      }}
                                    />
                                    <input
                                      value={editDraft?.unit ?? ""}
                                      onChange={(e) =>
                                        setEditDraft((p) => (p ? { ...p, unit: e.target.value } : p))
                                      }
                                      placeholder="単位"
                                      style={{
                                        borderRadius: 10,
                                        padding: "8px 10px",
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        background: "white",
                                        width: 90,
                                      }}
                                    />

                                    <input
                                      type="date"
                                      value={editDraft?.expires ?? ""}
                                      onChange={(e) =>
                                        setEditDraft((p) => (p ? { ...p, expires: e.target.value } : p))
                                      }
                                      disabled={(editDraft?.kind ?? "食材") !== "食材"}
                                      style={{
                                        borderRadius: 10,
                                        padding: "8px 10px",
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        background:
                                          (editDraft?.kind ?? "食材") === "食材" ? "white" : "rgba(0,0,0,0.04)",
                                        width: 170,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      fontWeight: 900,
                                      fontSize: 14,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {it.name}
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                                    <span
                                      style={{
                                        fontSize: 12,
                                        background: "rgba(0,0,0,0.04)",
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        color: "#345",
                                      }}
                                    >
                                      {it.quantity_num}
                                      {it.unit ?? ""}
                                    </span>

                                    {it.kind === "食材" && it.expires_on && (
                                      <span
                                        style={{
                                          fontSize: 12,
                                          background: soon ? "rgba(255, 230, 170, 0.8)" : "rgba(0,0,0,0.04)",
                                          border: "1px solid rgba(0,0,0,0.08)",
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          color: soon ? "#7a3a00" : "#345",
                                        }}
                                      >
                                        ⏳ {it.expires_on}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 右側ボタン群 */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {editing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!id) {
                                        setError("id が取得できません（APIが id を返しているか確認してください）");
                                        return;
                                      }
                                      saveEdit(id);
                                    }}
                                    disabled={saving}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "rgba(208,244,222,0.85)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      padding: "8px 10px",
                                      borderRadius: 999,
                                      cursor: saving ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "rgba(255,255,255,0.9)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      padding: "8px 10px",
                                      borderRadius: 999,
                                      cursor: saving ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    キャンセル
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!id) {
                                        setError("id が取得できません（APIが id を返しているか確認してください）");
                                        return;
                                      }
                                      consume(id);
                                    }}
                                    disabled={saving}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "rgba(255, 255, 255, 0.9)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      padding: "8px 10px",
                                      borderRadius: 999,
                                      cursor: saving ? "not-allowed" : "pointer",
                                    }}
                                    title="1つ消費（0になったら自動削除）"
                                  >
                                    − 消費
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(it)}
                                    disabled={saving || !id}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "rgba(255,255,255,0.9)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      padding: "8px 10px",
                                      borderRadius: 999,
                                      cursor: saving || !id ? "not-allowed" : "pointer",
                                      opacity: id ? 1 : 0.6,
                                    }}
                                    title={!id ? "id が無いデータのため編集できません（APIの返却項目を確認）" : "編集"}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!id) {
                                        setError("id が取得できません（APIが id を返しているか確認してください）");
                                        return;
                                      }
                                      remove(id);
                                    }}
                                    disabled={saving}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      background: "rgba(255, 230, 230, 0.8)",
                                      color: "#700",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      padding: "8px 10px",
                                      borderRadius: 999,
                                      cursor: saving ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    🗑
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* メモ */}
      <div style={{ marginTop: 12, color: "#555", fontSize: 12, lineHeight: 1.6 }}>
        ・「消費」は数量を 1 減らし、0 になったら自動で削除します。<br />
        ・賞味期限は食材のみ。3日以内は黄色で目立たせます。<br />
        ・「献立→買い物」連動（在庫を差し引き）は、買い物リスト画面の新ボタンから使えます。
      </div>
    </main>
  );
}
