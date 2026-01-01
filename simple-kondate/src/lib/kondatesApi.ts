// src/lib/kondatesApi.ts

import type {
  ApiErrorResponse,
  DeleteKondatesResponse,
  GetKondatesResponse,
  KondateRow,
  PostKondatesResponse,
  Category,
} from "../types/kondate";

/**
 * API呼び出しはここに集約する。
 * - page.tsx や hook から fetch を消せる
 * - エラーハンドリングの形を統一できる
 *
 * ポイント：
 * - 失敗時は throw する（呼び出し側で try/catch しやすい）
 * - 成功時の型を固定する（レスポンス崩れを検知しやすい）
 */
async function readJsonOrEmpty<T>(res: Response): Promise<T | {}> {
  // JSONが返らないケースでも落ちないようにする保険
  return (await res.json().catch(() => ({}))) as T | {};
}


/**
 * 指定した日付範囲（from〜to）の献立を取得する
 * - from/to は "YYYY-MM-DD" を想定
 * - API: GET /api/kondates?from=...&to=...
 */
export async function apiFetchKondatesByRange(from: string, to: string): Promise<KondateRow[]> {
  const res = await fetch(
    `/api/kondates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: "GET", cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET /api/kondates failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { kondates: KondateRow[] };
  return json.kondates ?? [];
}



/** GET /api/kondates */
export async function apiGetKondates(): Promise<KondateRow[]> {
  const res = await fetch("/api/kondates", { cache: "no-store" });

  if (!res.ok) {
    const body = (await readJsonOrEmpty<ApiErrorResponse>(res)) as Partial<ApiErrorResponse>;
    throw new Error(body.message ?? "API error (GET /api/kondates)");
  }

  const body = (await res.json()) as GetKondatesResponse;
  return body.kondates;
}

/** POST /api/kondates */
/**
 * 新規追加API
 * - meal_date は "YYYY-MM-DD" を想定（HTML date input の値）
 */
export async function apiAddKondate(input: {
  title: string;
  category: Category;
  meal_date: string; // ★追加
}): Promise<KondateRow> {
  const res = await fetch("/api/kondates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /api/kondates failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { kondate: KondateRow };
  return json.kondate;
}
/** DELETE /api/kondates/:id */
export async function apiDeleteKondate(id: number): Promise<void> {
  const res = await fetch(`/api/kondates/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const body = (await readJsonOrEmpty<ApiErrorResponse>(res)) as Partial<ApiErrorResponse>;
    throw new Error(body.message ?? "API error (DELETE /api/kondates/:id)");
  }

  // 返却は { ok: true } だが、呼び出し側は結果を使わないので void でOK
  await res.json().catch(() => ({} as DeleteKondatesResponse));
}
