// src/app/shopping/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiDeleteShoppingList } from "../../lib/shopping/Api"; // ★追加（相対）

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day + 6) % 7;

  const start = new Date(now);
  start.setDate(now.getDate() - diffToMon);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

type ShoppingListRow = {
  id: string;
  start_date: string;
  end_date: string;
  title?: string | null;
  created_at?: string;
};

type CreateResult = {
  shopping_list?: ShoppingListRow;
  items_count?: number;
  message?: string;
};

type ListResult = {
  shopping_lists: ShoppingListRow[];
  message?: string;
};

export default function ShoppingPage() {
  const { start, end } = useMemo(() => getThisWeekRange(), []);
  const thisWeekStart = useMemo(() => toYmd(start), [start]);
  const thisWeekEnd = useMemo(() => toYmd(end), [end]);

  const [error, setError] = useState<string | null>(null);

  // 一覧
  const [listLoading, setListLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingListRow[]>([]);

  // 自動作成
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingCreateMinusInv, setLoadingCreateMinusInv] = useState(false);

  // ★手動作成
  const [manualTitle, setManualTitle] = useState("");
  const [manualStart, setManualStart] = useState(thisWeekStart);
  const [manualEnd, setManualEnd] = useState(thisWeekEnd);
  const [manualCreating, setManualCreating] = useState(false);

  // ★削除中ID（連打・二重削除防止）
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchLists() {
    setListLoading(true);
    try {
      const res = await fetch("/api/shopping_lists?limit=20", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ListResult | null;

      if (!res.ok) {
        setError(json?.message || `一覧取得に失敗しました（HTTP ${res.status}）`);
        setLists([]);
        return;
      }

      setLists(json?.shopping_lists ?? []);
    } catch {
      setError("通信エラーが発生しました");
      setLists([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    // 初期日付を今週に合わせる
    setManualStart(thisWeekStart);
    setManualEnd(thisWeekEnd);
    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateFromThisWeek() {
    setLoadingCreate(true);
    setError(null);

    try {
      const res = await fetch("/api/shopping_lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: thisWeekStart,
          end_date: thisWeekEnd,
          mode: "kondates",
        }),
      });

      const json = (await res.json().catch(() => null)) as CreateResult | null;

      if (!res.ok) {
        setError(json?.message || `作成に失敗しました（HTTP ${res.status}）`);
        return;
      }

      await fetchLists();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoadingCreate(false);
    }
  }

  // ★在庫を差し引いて作成（不足分だけ）
  async function handleCreateFromThisWeekMinusInventory() {
    setLoadingCreateMinusInv(true);
    setError(null);

    try {
      const res = await fetch("/api/shopping_lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: thisWeekStart,
          end_date: thisWeekEnd,
          mode: "kondates_minus_inventory",
        }),
      });

      const json = (await res.json().catch(() => null)) as CreateResult | null;
      if (!res.ok) {
        setError(json?.message || `作成に失敗しました（HTTP ${res.status}）`);
        return;
      }

      await fetchLists();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoadingCreateMinusInv(false);
    }
  }

  async function handleManualCreate() {
    setManualCreating(true);
    setError(null);

    const title = manualTitle.trim() || null;

    try {
      const res = await fetch("/api/shopping_lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: manualStart,
          end_date: manualEnd,
          title,
          mode: "manual", // ★空で作る
        }),
      });

      const json = (await res.json().catch(() => null)) as CreateResult | null;

      if (!res.ok) {
        setError(json?.message || `手動作成に失敗しました（HTTP ${res.status}）`);
        return;
      }

      // 作成後：タイトルは残してもいいが、基本は空に戻す
      setManualTitle("");
      await fetchLists();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setManualCreating(false);
    }
  }

  // ★一覧から削除
  async function handleDeleteFromList(id: string) {
    if (deletingId) return;

    const ok = window.confirm("この買い物リストを削除しますか？\n（元に戻せません）");
    if (!ok) return;

    setDeletingId(id);
    setError(null);

    try {
      await apiDeleteShoppingList(id);

      // ✅ 成功したら一覧から即消す（再fetch不要）
      setLists((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
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
              background: "linear-gradient(135deg, #ffd1dc 0%, #d0f4de 100%)",
              fontSize: 22,
            }}
          >
            🛒
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>買い物リスト</h1>
            <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              {thisWeekStart} 〜 {thisWeekEnd}（今週）
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

      {/* 自動作成 */}
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
        <div style={{ fontSize: 16, fontWeight: 900 }}>今週の献立から作成</div>
        <div style={{ color: "#555", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          今週の献立に入っている材料を集計して、買い物リストを作ります。
        </div>

        <button
          type="button"
          onClick={handleCreateFromThisWeek}
          disabled={loadingCreate}
          style={{
            marginTop: 12,
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: "12px 14px",
            fontWeight: 900,
            fontSize: 15,
            background: loadingCreate
              ? "rgba(0,0,0,0.08)"
              : "linear-gradient(135deg, #b3e5ff 0%, #c8f7dc 100%)",
            color: "#123",
            boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
            cursor: loadingCreate ? "not-allowed" : "pointer",
          }}
        >
          {loadingCreate ? "作成中..." : "🧺 今週の買い物リストを作る"}
        </button>

        <button
          type="button"
          onClick={handleCreateFromThisWeekMinusInventory}
          disabled={loadingCreateMinusInv}
          style={{
            marginTop: 10,
            width: "100%",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: "12px 14px",
            fontWeight: 900,
            fontSize: 15,
            background: loadingCreateMinusInv ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.9)",
            color: "#123",
            boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
            cursor: loadingCreateMinusInv ? "not-allowed" : "pointer",
          }}
        >
          {loadingCreateMinusInv ? "作成中..." : "🧊 在庫を差し引いて不足分だけ作る"}
        </button>
      </section>

      {/* ★手動作成 */}
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
        <div style={{ fontSize: 16, fontWeight: 900 }}>手動で作成</div>
        <div style={{ color: "#555", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          空の買い物リストを作ります（品目は後で追加）。
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#555" }}>タイトル（任意）</div>
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="例：今週の買い物 / お正月用"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#555" }}>開始日</div>
              <input
                type="date"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#555" }}>終了日</div>
              <input
                type="date"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleManualCreate}
            disabled={manualCreating}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 14,
              padding: "12px 14px",
              fontWeight: 900,
              fontSize: 15,
              background: manualCreating
                ? "rgba(0,0,0,0.08)"
                : "linear-gradient(135deg, #ffd1dc 0%, #d0f4de 100%)",
              color: "#123",
              boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
              cursor: manualCreating ? "not-allowed" : "pointer",
            }}
          >
            {manualCreating ? "作成中..." : "＋ 空の買い物リストを作る"}
          </button>
        </div>
      </section>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            background: "rgba(255, 220, 220, 0.7)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#700",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      )}

      {/* 一覧 */}
      <section
        style={{
          borderRadius: 16,
          padding: 14,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>最近のリスト</div>
          <div style={{ fontSize: 12, color: "#555" }}>{lists.length}件</div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {listLoading ? (
            <div style={{ color: "#555", fontSize: 13 }}>読み込み中...</div>
          ) : lists.length === 0 ? (
            <div style={{ color: "#555", fontSize: 13 }}>
              まだリストがありません。上で作成してください。
            </div>
          ) : (
            lists.map((l) => {
              const isDeleting = deletingId === l.id;

              return (
                <div
                  key={l.id}
                  style={{
                    borderRadius: 14,
                    padding: "12px 12px",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* ✅ Linkはここだけ（削除ボタンと混ぜない） */}
                  <Link
                    href={`/shopping/${l.id}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        aria-hidden
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,209,220,0.6)",
                          fontSize: 18,
                        }}
                      >
                        🧺
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14 }}>
                          {l.title?.trim() ? l.title : "買い物リスト"}
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                          {l.start_date} 〜 {l.end_date}
                        </div>
                      </div>

                      <div aria-hidden style={{ color: "#777", fontSize: 18 }}>
                        →
                      </div>
                    </div>
                  </Link>

                  {/* ✅ 操作行（ここはLinkの外） */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteFromList(l.id)}
                      disabled={!!deletingId}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        padding: "8px 10px",
                        background: isDeleting ? "rgba(0,0,0,0.08)" : "white",
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: deletingId ? "not-allowed" : "pointer",
                      }}
                    >
                      {isDeleting ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
