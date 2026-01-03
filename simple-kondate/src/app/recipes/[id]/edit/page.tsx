// src/app/recipes/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type RecipeIngredient = {
  name: string;
  amount: string;
};

type RecipeEditForm = {
  title: string;
  description: string;
  timeMinutes: string; // 入力は文字列でOK（保存時に number/null にする）
  servings: string;
  mainCategory: string;
  tagsText: string; // "定番, 子ども向け" みたいに入力
  ingredients: RecipeIngredient[];
  stepsText: string; // textarea（改行=1ステップ）
  notes: string;
};

// APIが返す形（snake_case）
type ApiRecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  time_minutes?: number | null;
  servings?: number | null;
  steps?: string[] | null;
  notes?: string | null;
  main_category?: string | null;
  tags?: string[] | null;
  ingredients?: { name: string; amount: string }[] | null;
};

const MAIN_CATEGORIES = [
  "主菜",
  "副菜",
  "主食",
  "汁物",
  "麺",
  "サラダ",
  "おやつ",
  "作り置き",
  "その他",
] as const;

function splitTags(tagsText: string) {
  return tagsText
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function RecipeEditPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<RecipeEditForm>({
    title: "",
    description: "",
    timeMinutes: "",
    servings: "",
    mainCategory: "その他",
    tagsText: "",
    ingredients: [{ name: "", amount: "" }],
    stepsText: "",
    notes: "",
  });

  const canSave = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.mainCategory.trim()) return false;
    return true;
  }, [form.title, form.mainCategory]);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setNotFound(false);

        const res = await fetch(`/api/recipes/${id}`, { cache: "no-store" });
        const data = (await res.json()) as any;

        if (!alive) return;

        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error(data?.error ?? `failed (status=${res.status})`);
        }

        const api = data as ApiRecipeDetail;

        setForm({
          title: api.title ?? "",
          description: (api.description ?? "") as string,
          timeMinutes: api.time_minutes == null ? "" : String(api.time_minutes),
          servings: api.servings == null ? "" : String(api.servings),
          mainCategory: (api.main_category ?? "その他").trim() || "その他",
          tagsText: (api.tags ?? []).join(", "),
          ingredients:
            (api.ingredients ?? []).length > 0
              ? (api.ingredients ?? []).map((i) => ({
                  name: i.name ?? "",
                  amount: i.amount ?? "",
                }))
              : [{ name: "", amount: "" }],
          stepsText: (api.steps ?? []).join("\n"),
          notes: (api.notes ?? "") as string,
        });
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(String(e?.message ?? e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.9)",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 110,
    resize: "vertical",
    lineHeight: 1.6,
  };

  const smallInputStyle: React.CSSProperties = {
    ...inputStyle,
    padding: "9px 10px",
  };

  async function onSave() {
    if (!id) return;
    if (!canSave) return;

    try {
      setSaving(true);
      setErrorMsg(null);

      const timeMinutesNum =
        form.timeMinutes.trim() === "" ? null : Number(form.timeMinutes);
      const servingsNum = form.servings.trim() === "" ? null : Number(form.servings);

      if (timeMinutesNum != null && !Number.isFinite(timeMinutesNum)) {
        throw new Error("調理時間は数値で入力してください");
      }
      if (servingsNum != null && !Number.isFinite(servingsNum)) {
        throw new Error("人数は数値で入力してください");
      }

      if (!MAIN_CATEGORIES.includes(form.mainCategory as any)) {
        throw new Error("主カテゴリが不正です");
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        timeMinutes: timeMinutesNum,
        servings: servingsNum,
        mainCategory: form.mainCategory,
        tags: splitTags(form.tagsText),
        ingredients: form.ingredients
          .map((i) => ({ name: i.name.trim(), amount: i.amount.trim() }))
          .filter((i) => i.name || i.amount),
        steps: form.stepsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: form.notes.trim() ? form.notes.trim() : null,
      };

      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        throw new Error(data?.error ?? `failed (status=${res.status})`);
      }

      // 保存後は詳細へ戻す
      location.href = `/recipes/${id}`;
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(idx: number, patch: Partial<RecipeIngredient>) {
    setForm((prev) => {
      const next = [...prev.ingredients];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, ingredients: next };
    });
  }

  function addIngredientRow() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", amount: "" }],
    }));
  }

  function removeIngredientRow(idx: number) {
    setForm((prev) => {
      const next = prev.ingredients.filter((_, i) => i !== idx);
      return { ...prev, ingredients: next.length > 0 ? next : [{ name: "", amount: "" }] };
    });
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
        <p>レシピが見つかりません。</p>
        <a href="/recipes">← レシピ一覧へ戻る</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>レシピを編集</h1>
        <p style={{ color: "#555", marginTop: 6 }}>内容を更新して保存できます。</p>
      </header>

      {errorMsg && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 12,
            border: "1px solid rgba(170,0,0,0.18)",
            background: "rgba(255,230,230,0.75)",
          }}
        >
          <p style={{ margin: 0, color: "#a11", fontWeight: 800 }}>エラー：{errorMsg}</p>
        </div>
      )}

      {/* 基本情報 */}
      <section style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>タイトル（必須）</div>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            style={inputStyle}
            placeholder="例：野菜たっぷりカレー"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>説明</div>
          <input
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            style={inputStyle}
            placeholder="例：作り置きできる万能カレー。"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={labelStyle}>調理時間（分）</div>
            <input
              value={form.timeMinutes}
              onChange={(e) => setForm((p) => ({ ...p, timeMinutes: e.target.value }))}
              style={smallInputStyle}
              inputMode="numeric"
              placeholder="例：30"
            />
          </div>

          <div>
            <div style={labelStyle}>人数（人分）</div>
            <input
              value={form.servings}
              onChange={(e) => setForm((p) => ({ ...p, servings: e.target.value }))}
              style={smallInputStyle}
              inputMode="numeric"
              placeholder="例：4"
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={labelStyle}>主カテゴリ（必須）</div>
          <select
            value={form.mainCategory}
            onChange={(e) => setForm((p) => ({ ...p, mainCategory: e.target.value }))}
            style={inputStyle}
          >
            {MAIN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={labelStyle}>タグ（カンマ区切り）</div>
          <input
            value={form.tagsText}
            onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
            style={inputStyle}
            placeholder="例：定番, 子ども向け, 野菜"
          />
        </div>
      </section>

      {/* 材料 */}
      <section style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>材料</h2>
          <button
            type="button"
            onClick={addIngredientRow}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(179,229,255,0.45)",
              fontWeight: 900,
            }}
          >
            ＋ 追加
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {form.ingredients.map((ing, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                style={smallInputStyle}
                placeholder="材料名（例：玉ねぎ）"
              />
              <input
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, { amount: e.target.value })}
                style={smallInputStyle}
                placeholder="分量（例：2個）"
              />
              <button
                type="button"
                onClick={() => removeIngredientRow(idx)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(255,230,230,0.8)",
                  color: "#a11",
                  fontWeight: 900,
                }}
                aria-label="材料行を削除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 作り方 */}
      <section style={{ ...cardStyle, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 0 }}>作り方</h2>
        <p style={{ color: "#555", marginTop: 6 }}>
          1行 = 1ステップ（改行するとステップが増えます）
        </p>
        <textarea
          value={form.stepsText}
          onChange={(e) => setForm((p) => ({ ...p, stepsText: e.target.value }))}
          style={textareaStyle}
          placeholder={`例：
野菜を食べやすく切る
鍋で炒めて水を加える
火が通ったらルーを入れる`}
        />
      </section>

      {/* メモ */}
      <section style={{ ...cardStyle, marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 0 }}>メモ</h2>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          style={{ ...textareaStyle, minHeight: 80 }}
          placeholder="例：翌日は少し水を足して温めると良い"
        />
      </section>

      {/* 操作 */}
      <section style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.10)",
            background: saving ? "rgba(0,0,0,0.06)" : "rgba(200,247,220,0.65)",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "保存中…" : "保存"}
        </button>

        <a
          href={`/recipes/${id}`}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.7)",
            fontWeight: 900,
            textDecoration: "none",
            color: "#1f5fa5",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          キャンセル
        </a>
      </section>

      <footer>
        <a href="/recipes" style={{ color: "#1f5fa5", fontWeight: 800 }}>
          ← レシピ一覧へ戻る
        </a>
      </footer>
    </main>
  );
}
