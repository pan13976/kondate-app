// src/types/kondate.ts

/**
 * カテゴリは固定値なので union 型で縛る
 * - UIの select の候補にも使える
 * - API側のバリデーションにも使える（後でやる）
 */
export type Category = "朝" | "昼" | "夜" | "弁当";

/**
 * kondates テーブルの1行を表す型
 * created_at は Supabase から string（ISO文字列）で返る想定
 */
export type KondateRow = {
  id: number;
  title: string;
  category: Category | string; // DBは text なので念のため string も許容
  created_at: string;
  // ★追加：日付（DATE型は Supabase/JSON で "YYYY-MM-DD" の文字列として来る想定）
  meal_date: string;  
};

export type AddKondateInput = {
  title: string;
  category: Category;
  meal_date: string; // "YYYY-MM-DD"
};
/**
 * UIやバリデーションで使う「カテゴリ一覧」
 * as const を付けると「読み取り専用の固定配列」になる
 */
export const CATEGORIES: Category[] = ["朝", "昼", "夜", "弁当"];

/**
 * APIレスポンス型（GET）
 * - /api/kondates が返す形を型として固定する
 */
export type GetKondatesResponse = {
  kondates: KondateRow[];
};

/**
 * APIレスポンス型（POST）
 * - /api/kondates が返す形を型として固定する
 */
export type PostKondatesResponse = {
  kondate: KondateRow;
};

/**
 * APIレスポンス型（DELETE）
 */
export type DeleteKondatesResponse = {
  ok: true;
};

/**
 * APIエラー型（統一）
 * - どのAPIでも { message } を返すルールにしておくと扱いやすい
 */
export type ApiErrorResponse = {
  message: string;
};

