// src/types/kondate.ts

/**
 * カテゴリは固定値なので union 型で縛る
 * - UIの select の候補にも使える
 * - API側のバリデーションにも使える（後でやる）
 */
export type Category = "朝" | "昼" | "夜" | "弁当";

//材料の型定義
export type Ingredient = {
  name: string;      // 例: "鶏もも"
  amount: string;    // 例: "200g" / "1/2丁" / "大さじ1"
};

/**
 * kondates テーブルの1行を表す型
 * created_at は Supabase から string（ISO文字列）で返る想定
 */
export type KondateRow = {
  id: number;
  title: string;
  category: "朝" | "昼" | "夜" | "弁当";
  meal_date: string; // "YYYY-MM-DD"
  created_at: string;
  ingredients?: Ingredient[]; // ★追加（DBはdefault []）
  recipe_id?: string | null;
};

//export type AddKondateInput = {
// title: string;
// category: Category;
// meal_date: string; // "YYYY-MM-DD"
//};
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

