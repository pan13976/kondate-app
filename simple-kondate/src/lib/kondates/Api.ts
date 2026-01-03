// src/lib/kondatesApi.ts

import type { ApiErrorResponse, DeleteKondatesResponse, GetKondatesResponse, KondateRow, Category } from "../../types/kondate";

// 追加：材料型（kondates.ingredients のスナップショット用）
export type Ingredient = { name: string; amount: string };

/**
 * API呼び出しはここに集約する
 * - 失敗時は throw
 * - 成功時の型を固定
 */
async function readJsonOrEmpty<T>(res: Response): Promise<T | {}> {
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

/**
 * POST /api/kondates
 * - recipe_id は「レシピ由来」なら入る。手入力は null / undefined でOK。
 * - ingredients はスナップショット保存用（任意）
 */
export async function apiCreateKondate(input: {
  title: string;
  category: Category;
  meal_date: string;
  ingredients?: Ingredient[]; // 任意
  recipe_id?: string | null;  // ★任意（null可）
}): Promise<KondateRow> {
  const res = await fetch("/api/kondates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      ingredients: input.ingredients ?? [],
      recipe_id: input.recipe_id ?? null,
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(json?.message ?? "追加に失敗しました");

  return (json.kondate ?? json) as KondateRow;
}

/**
 * PUT /api/kondates/:id
 * - 画面側（DayDetailModal）が渡す形に合わせる
 * - recipe_id は維持したい場合に渡す（未指定ならサーバ側で現状維持にするのが理想）
 */
export async function apiUpdateKondate(
  id: number,
  input: {
    title: string;
    category?: Category;
    meal_date?: string;
    ingredients?: Ingredient[];
    recipe_id?: string | null;
  }
): Promise<KondateRow> {
  const res = await fetch(`/api/kondates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      ingredients: input.ingredients ?? [],
      // recipe_id は「送らない」=維持したいケースがあるので、ここでは勝手に null を入れない
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(json?.message ?? "更新に失敗しました");

  return (json.kondate ?? json) as KondateRow;
}

/**
 * 互換：以前の apiAddKondate を使ってる箇所があっても壊れないように残す
 * （内部で apiCreateKondate を呼ぶ）
 */
export async function apiAddKondate(input: {
  title: string;
  category: Category;
  meal_date: string;
}): Promise<KondateRow> {
  return apiCreateKondate(input);
}

/** DELETE /api/kondates/:id */
export async function apiDeleteKondate(id: number): Promise<void> {
  const res = await fetch(`/api/kondates/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const body = (await readJsonOrEmpty<ApiErrorResponse>(res)) as Partial<ApiErrorResponse>;
    throw new Error(body.message ?? "API error (DELETE /api/kondates/:id)");
  }

  await res.json().catch(() => ({} as DeleteKondatesResponse));
}
