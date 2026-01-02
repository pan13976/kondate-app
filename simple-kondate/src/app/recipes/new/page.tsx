"use client";

import { useMemo, useState } from "react";

const MAIN_CATEGORIES = [
  "主菜","副菜","主食","汁物","麺","サラダ","おやつ","作り置き","その他",
];

type IngredientRow = { name: string; amount: string };

export default function NewRecipePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeMinutes, setTimeMinutes] = useState<string>("");
  const [mainCategory, setMainCategory] = useState("主菜");
  const [tagsText, setTagsText] = useState(""); // カンマ区切り
  const [servings, setServings] = useState<string>("");
  const [stepsText, setStepsText] = useState(""); // 改行区切り
  const [notes, setNotes] = useState("");

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: "", amount: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tags = useMemo(() => {
    const arr = tagsText
      .split(/[,\u3001]/) // , または 、 でもOK
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : [];
  }, [tagsText]);

  async function onSubmit() {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("タイトルは必須です");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() ? description : null,
          timeMinutes: timeMinutes ? Number(timeMinutes) : null,
          tags,
          mainCategory,
          servings: servings ? Number(servings) : null,
          steps: stepsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          notes: notes.trim() ? notes : null,
          ingredients,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");

      // 作成した詳細へ
      window.location.href = `/recipes/${data.id}`;
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(idx: number, key: "name" | "amount", value: string) {
    setIngredients((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function addRow() {
    setIngredients((prev) => [...prev, { name: "", amount: "" }]);
  }

  function removeRow(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>レシピ追加</h1>
      </header>

      {errorMsg && (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,230,230,0.75)", color: "#a11", fontWeight: 800, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>タイトル（必須）</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>主カテゴリ</span>
          <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
            {MAIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>説明</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>時間（分）</span>
            <input inputMode="numeric" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>何人分</span>
            <input inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>タグ（カンマ区切り）</span>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="例：定番, 子ども向け" style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
        </label>

        <section style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.75)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 900 }}>材料</span>
            <button type="button" onClick={addRow} style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", background: "white", fontWeight: 900 }}>
              ＋ 追加
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {ingredients.map((row, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input
                  value={row.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  placeholder="材料名"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
                />
                <input
                  value={row.amount}
                  onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                  placeholder="分量"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={ingredients.length === 1}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "white", fontWeight: 900, opacity: ingredients.length === 1 ? 0.5 : 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>作り方（1行=1ステップ）</span>
          <textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={6} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>メモ</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }} />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(179,229,255,0.85)",
            fontWeight: 900,
            fontSize: 15,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "保存中…" : "保存する"}
        </button>

        <a href="/recipes" style={{ color: "#1f5fa5", fontWeight: 800, textDecoration: "none", textAlign: "center" }}>
          ← レシピ一覧へ戻る
        </a>
      </div>
    </main>
  );
}
