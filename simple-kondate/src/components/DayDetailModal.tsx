"use client";

import { useEffect, useMemo, useState } from "react";
import type { KondateRow } from "../types/kondate";
import { apiCreateKondate, apiUpdateKondate } from "../lib/kondatesApi";

type Props = {
  open: boolean;
  ymd: string | null;
  kondates: KondateRow[];
  onClose: () => void;
  onUpsert: (row: KondateRow) => void;
};

const CATS = ["朝", "昼", "夜", "弁当"] as const;

export default function DayDetailModal({ open, ymd, kondates, onClose, onUpsert }: Props) {
  const isOpen = open && !!ymd;
  const safeYmd = ymd ?? "";

  const rows = useMemo(() => {
    if (!isOpen) return [];
    return kondates.filter((r) => r.meal_date === safeYmd);
  }, [isOpen, kondates, safeYmd]);

  const rowByCat = useMemo(() => {
    const map = new Map<string, KondateRow>();
    rows.forEach((r) => map.set(r.category, r));
    return map;
  }, [rows]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const init: Record<string, string> = {};
    CATS.forEach((c) => (init[c] = rowByCat.get(c)?.title ?? ""));
    setDraft(init);
    setMsg("");
  }, [isOpen, safeYmd, rowByCat]);

  const saveOne = async (cat: (typeof CATS)[number]) => {
    const title = (draft[cat] ?? "").trim();
    if (!title) {
      setMsg(`${cat}：献立名を入れてね`);
      return;
    }

    try {
      setSaving(true);
      setMsg("");

      const existing = rowByCat.get(cat);
      const saved = existing
        ? await apiUpdateKondate(existing.id, { title })
        : await apiCreateKondate({ title, category: cat, meal_date: safeYmd });

      onUpsert(saved);
      setMsg(`${cat}：保存しました`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ★ hooks の後なら return null OK
  if (!isOpen) return null;

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
        style={{ width: "min(720px, 100%)", background: "white", borderRadius: 12, padding: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{safeYmd} の献立（追加・編集）</div>
          <button onClick={onClose} style={{ padding: "6px 10px" }}>
            閉じる
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {CATS.map((cat) => (
            <div
              key={cat}
              style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 8, alignItems: "center" }}
            >
              <div style={{ color: "#666" }}>{cat}</div>

              <input
                value={draft[cat] ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, [cat]: e.target.value }))}
                placeholder="例：おにぎり"
                disabled={saving}
                style={{ padding: 8 }}
              />

              <button
                onClick={() => saveOne(cat)}
                disabled={saving}
                style={{ padding: "8px 12px", cursor: saving ? "not-allowed" : "pointer" }}
              >
                保存
              </button>
            </div>
          ))}
        </div>

        {msg && <div style={{ marginTop: 12, color: msg.includes("失敗") ? "crimson" : "#666" }}>{msg}</div>}
      </div>
    </div>
  );
}
