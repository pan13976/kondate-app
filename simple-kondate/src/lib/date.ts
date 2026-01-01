// src/lib/date.ts
/**
 * YYYY-MM-DD 文字列を作る（タイムゾーン事故を避けるためUTCで組む）
 */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 週の開始日を返す（月曜開始）
 * 例：水曜なら、その週の月曜に戻す
 */
export function startOfWeekMonday(base: Date): Date {
  const d = new Date(base);
  const day = d.getDay(); // 0:日 1:月 ... 6:土
  const diff = (day === 0 ? -6 : 1 - day); // 日曜なら -6 で月曜へ
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * start（週の月曜）から7日分のDate配列を返す
 */
export function getWeekDates(startMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startMonday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * 表示用（例：1/3(水) みたいな）
 */
export function formatJpShort(d: Date): string {
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
}
