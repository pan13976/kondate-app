// src/app/shopping/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ShoppingList = {
    id: string;
    start_date: string;
    end_date: string;
    title?: string | null;
};

type ShoppingItem = {
    id: string;
    name: string;
    amount?: string | null;
    checked: boolean;
    sort_order: number;
};

type ApiResponse = {
    shopping_list: ShoppingList;
    items: ShoppingItem[];
};

type AddItemResponse = {
    item?: ShoppingItem;
    message?: string;
};

export default function ShoppingDetailPage() {
    const params = useParams() as { id?: string };
    const listId = params?.id;

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [list, setList] = useState<ShoppingList | null>(null);
    const [items, setItems] = useState<ShoppingItem[]>([]);

    // ★品目追加フォーム
    const [newName, setNewName] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [adding, setAdding] = useState(false);
    const router = useRouter();
    const unchecked = useMemo(() => items.filter((x) => !x.checked), [items]);
    const checked = useMemo(() => items.filter((x) => x.checked), [items]);
    const [deleting, setDeleting] = useState(false);

    async function deleteList() {
        if (!listId) return;

        const title = list?.title?.trim() ? `「${list.title}」` : "このリスト";
        const ok = window.confirm(`${title}を削除しますか？\n※品目もすべて消えます。`);
        if (!ok) return;

        setDeleting(true);
        setError(null);

        try {
            const res = await fetch(`/api/shopping_lists/${listId}`, { method: "DELETE" });
            const json = (await res.json().catch(() => null)) as { message?: string } | null;

            if (!res.ok) {
                setError(json?.message || `削除に失敗しました（HTTP ${res.status}）`);
                return;
            }

            // 削除成功 → 一覧へ戻す
            router.push("/shopping");
            router.refresh?.();
        } catch {
            setError("通信エラーが発生しました");
        } finally {
            setDeleting(false);
        }
    }
    async function fetchDetail() {
        if (!listId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/shopping_lists/${listId}`, { cache: "no-store" });
            const json = (await res.json().catch(() => null)) as ApiResponse | { message?: string } | null;

            if (!res.ok) {
                setError((json as any)?.message || `取得に失敗しました（HTTP ${res.status}）`);
                return;
            }

            const ok = json as ApiResponse;
            setList(ok.shopping_list);
            setItems(ok.items ?? []);
        } catch {
            setError("通信エラーが発生しました");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listId]);

    async function toggleChecked(item: ShoppingItem) {
        const nextChecked = !item.checked;

        // optimistic
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: nextChecked } : x)));

        setSavingId(item.id);
        setError(null);

        try {
            const res = await fetch(`/api/shopping_items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checked: nextChecked }),
            });

            const json = (await res.json().catch(() => null)) as { message?: string } | null;

            if (!res.ok) {
                // rollback
                setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: item.checked } : x)));
                setError(json?.message || `更新に失敗しました（HTTP ${res.status}）`);
            }
        } catch {
            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: item.checked } : x)));
            setError("通信エラーが発生しました");
        } finally {
            setSavingId(null);
        }
    }

    async function addItem() {
        if (!listId) return;

        const name = newName.trim();
        const amount = newAmount.trim();

        if (!name) {
            setError("品目名を入力してください");
            return;
        }

        setAdding(true);
        setError(null);

        try {
            const res = await fetch("/api/shopping_items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shopping_list_id: listId,
                    name,
                    amount: amount || null,
                }),
            });

            const json = (await res.json().catch(() => null)) as AddItemResponse | null;

            if (!res.ok) {
                setError(json?.message || `追加に失敗しました（HTTP ${res.status}）`);
                return;
            }

            const item = json?.item;
            if (!item?.id) {
                setError("追加は成功しましたが、item が取得できませんでした");
                return;
            }

            // 追加 → 未チェック側の末尾に入れる
            setItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order));

            // 入力欄クリア（スマホで快適）
            setNewName("");
            setNewAmount("");
        } catch {
            setError("通信エラーが発生しました");
        } finally {
            setAdding(false);
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
                        🧺
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>
                            {list?.title?.trim() ? list.title : "買い物リスト"}
                        </h1>
                        <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                            {list ? `${list.start_date} 〜 ${list.end_date}` : "読み込み中..."}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={deleteList}
                        disabled={deleting || loading}
                        style={{
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(255, 230, 230, 0.8)",
                            color: "#700",
                            fontSize: 13,
                            fontWeight: 900,
                            padding: "8px 10px",
                            borderRadius: 999,
                            cursor: deleting ? "not-allowed" : "pointer",
                        }}
                    >
                        {deleting ? "削除中..." : "🗑 削除"}
                    </button>
                    <Link
                        href="/shopping"
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
                        ← 戻る
                    </Link>
                </div>
            </header>

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

            {/* ★品目追加 */}
            <section
                style={{
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.85)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    marginBottom: 12,
                }}
            >
                <div style={{ fontWeight: 900, fontSize: 15 }}>品目を追加</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 12, color: "#555" }}>品目名</div>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="例：牛乳 / 玉ねぎ / 卵"
                            style={{
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.12)",
                                padding: "10px 12px",
                                fontSize: 14,
                            }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 12, color: "#555" }}>分量（任意）</div>
                        <input
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            placeholder="例：1本 / 200g / 2個"
                            style={{
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.12)",
                                padding: "10px 12px",
                                fontSize: 14,
                            }}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={addItem}
                        disabled={adding || loading || !listId}
                        style={{
                            width: "100%",
                            border: "none",
                            borderRadius: 14,
                            padding: "12px 14px",
                            fontWeight: 900,
                            fontSize: 15,
                            background: adding
                                ? "rgba(0,0,0,0.08)"
                                : "linear-gradient(135deg, #b3e5ff 0%, #c8f7dc 100%)",
                            color: "#123",
                            boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
                            cursor: adding ? "not-allowed" : "pointer",
                        }}
                    >
                        {adding ? "追加中..." : "＋ 追加する"}
                    </button>
                </div>
            </section>

            {/* 未チェック */}
            <section
                style={{
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.85)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    marginBottom: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>未チェック</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{unchecked.length}件</div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {loading ? (
                        <div style={{ color: "#555", fontSize: 13 }}>読み込み中...</div>
                    ) : unchecked.length === 0 ? (
                        <div style={{ color: "#555", fontSize: 13 }}>未チェックはありません</div>
                    ) : (
                        unchecked.map((it) => (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => toggleChecked(it)}
                                disabled={savingId === it.id}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    borderRadius: 14,
                                    padding: "12px 12px",
                                    background: "rgba(255,255,255,0.9)",
                                    border: "1px solid rgba(0,0,0,0.06)",
                                    boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                                    cursor: savingId === it.id ? "not-allowed" : "pointer",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span aria-hidden style={{ fontSize: 18 }}>
                                        ⬜
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 900, fontSize: 14 }}>{it.name}</div>
                                        {it.amount ? (
                                            <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{it.amount}</div>
                                        ) : null}
                                    </div>
                                    <span aria-hidden style={{ color: "#777" }}>
                                        →
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </section>

            {/* チェック済み */}
            <section
                style={{
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.6)",
                    border: "1px dashed rgba(0,0,0,0.15)",
                }}
            >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>チェック済み</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{checked.length}件</div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {loading ? (
                        <div style={{ color: "#555", fontSize: 13 }}>読み込み中...</div>
                    ) : checked.length === 0 ? (
                        <div style={{ color: "#555", fontSize: 13 }}>まだチェック済みはありません</div>
                    ) : (
                        checked.map((it) => (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => toggleChecked(it)}
                                disabled={savingId === it.id}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    borderRadius: 14,
                                    padding: "12px 12px",
                                    background: "rgba(255,255,255,0.7)",
                                    border: "1px solid rgba(0,0,0,0.06)",
                                    cursor: savingId === it.id ? "not-allowed" : "pointer",
                                    opacity: 0.9,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span aria-hidden style={{ fontSize: 18 }}>
                                        ✅
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 900, fontSize: 14, textDecoration: "line-through" }}>
                                            {it.name}
                                        </div>
                                        {it.amount ? (
                                            <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{it.amount}</div>
                                        ) : null}
                                    </div>
                                    <span aria-hidden style={{ color: "#777" }}>
                                        →
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </section>
        </main>
    );
}
