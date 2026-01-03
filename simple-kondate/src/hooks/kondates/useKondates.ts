// src/hooks/useKondates.ts

import { useEffect, useMemo, useState } from "react";
import type { Category, KondateRow } from "../../types/kondate";
import { apiAddKondate, apiDeleteKondate, apiGetKondates } from "../../lib/kondates/Api";

/**
 * 画面の「状態」と「処理」をまとめるカスタムフック
 * - page.tsx を UI の組み立てだけにできる
 * - 後で別画面を作ってもこの hook を再利用できる
 */
export function useKondates() {
  // 一覧データ
  const [kondates, setKondates] = useState<KondateRow[]>([]);
  // 共通ローディング
  const [loading, setLoading] = useState(false);

  // フォーム入力
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("夜");

  // 表示フィルタ
  const [filterCategory, setFilterCategory] = useState<"全て" | Category>("全て");
// ★ 今日（YYYY-MM-DD）を初期値にする
const today = new Date().toISOString().slice(0, 10);

// ★ 選択中の日付（この日の献立を表示する）
const [selectedDate, setSelectedDate] = useState<string>(today);
  /** 初回の一覧取得 */
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 一覧の再取得（APIのGET） */
  async function reload() {
    setLoading(true);
    try {
      const rows = await apiGetKondates();
      setKondates(rows);
    } finally {
      // 失敗時の alert は page.tsx 側に寄せたいならここでは出さない
      // ただ、最小構成ならここで catch して alert してもOK
      setLoading(false);
    }
  }

  /** 追加（APIのPOST） */
async function add() {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("献立名を入力してね");
  }

  setLoading(true);
  try {
    // ★ meal_date に selectedDate を入れる
    const newRow = await apiAddKondate({
      title: trimmed,
      category,
      meal_date: selectedDate,
    });

    setKondates((prev) => [newRow, ...prev]);

    setTitle("");
    setCategory("夜");
  } finally {
    setLoading(false);
  }
}

  /** 削除（APIのDELETE） */
  async function remove(id: number) {
    setLoading(true);
    try {
      await apiDeleteKondate(id);
      // 画面側も即時反映
      setKondates((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setLoading(false);
    }
  }

  /** フィルタ適用後の表示対象 */
const visibleKondates = useMemo(() => {
  // 1) 日付で絞り込み（これがメイン）
  const byDate = kondates.filter((k) => k.meal_date === selectedDate);

  // 2) さらにカテゴリで絞り込み（必要なら）
  if (filterCategory === "全て") return byDate;
  return byDate.filter((k) => k.category === filterCategory);
}, [kondates, selectedDate, filterCategory]);

  return {
    // data
    kondates,
    visibleKondates,
    loading,
    selectedDate,
    setSelectedDate,
    // form state
    title,
    setTitle,
    category,
    setCategory,

    // filter state
    filterCategory,
    setFilterCategory,

    // actions
    reload,
    add,
    remove,
  };
}
