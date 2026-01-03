"use client";

import { useEffect, useState } from "react";
import type { KondateRow } from "../../types/kondate";
import { apiFetchKondatesByRange } from "../../lib/kondates/Api";

/**
 * from/to が変わったら、その期間の献立を取得する
 * - loading/error を含めて返す
 * - upsert（モーダル保存反映）もここで提供すると page がさらに薄くなる
 */
export function useWeekKondates(from: string, to: string) {
  const [kondates, setKondates] = useState<KondateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetchKondatesByRange(from, to);
        if (cancelled) return;

        setKondates(data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // 画面遷移/アンマウント時に state 更新しない保険
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  /**
   * 保存（追加/更新）の結果を週一覧 state に反映
   * - 同じidがあれば置換
   * - 無ければ追加
   */
  const upsertKondate = (row: KondateRow) => {
    setKondates((prev) => {
      const idx = prev.findIndex((x) => x.id === row.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      return [row, ...prev];
    });
  };

  return { kondates, setKondates, loading, error, upsertKondate };
}
