"use client";

import { useMemo } from "react";
import { getWeekDates, startOfWeekMonday, toYmd } from "../lib/date";

/**
 * 「今週（月〜日）」の Date配列と from/to を返す
 * - page.tsx から週計算の責務を外に出す
 */
export function useWeekRange() {
  // 初回レンダで今日を固定（再レンダで日付がズレないように）
  const today = useMemo(() => new Date(), []);

  // 月曜はじまりの週開始日
  const start = useMemo(() => startOfWeekMonday(today), [today]);

  // 今週7日分（Date[]）
  const weekDates = useMemo(() => getWeekDates(start), [start]);

  // 今週の from/to（YYYY-MM-DD）
  const from = useMemo(() => toYmd(weekDates[0]), [weekDates]);
  const to = useMemo(() => toYmd(weekDates[6]), [weekDates]);

  return { weekDates, from, to };
}
