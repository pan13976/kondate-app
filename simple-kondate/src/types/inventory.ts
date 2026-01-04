// src/types/inventory.ts

/**
 * 在庫アイテム（Supabase: inventory_items）
 * - snake_case の DB 行をそのまま使う（ViewModel変換は後で分離してもOK）
 */

export type InventoryKind = "食材" | "日用品";

export type InventoryItem = {
  id: string;
  kind: InventoryKind;
  category: string | null;
  name: string;
  quantity_num: number;
  unit: string | null;
  expires_on: string | null; // YYYY-MM-DD
  created_at?: string;
};
