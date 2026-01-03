// src/hooks/kondates/useWeekKondates.ts
"use client";

import { useEffect, useState } from "react";
import type { KondateRow } from "../../types/kondate";
import { apiFetchKondatesByRange } from "../../lib/kondates/Api";

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

    return () => {
      cancelled = true;
    };
  }, [from, to]);

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

  // ★追加：削除反映
  const removeKondate = (id: number) => {
    setKondates((prev) => prev.filter((x) => x.id !== id));
  };

  return { kondates, setKondates, loading, error, upsertKondate, removeKondate };
}
