// src/lib/shopping/build.ts

export type ApiKondateIngredient = {
  name?: string | null;
  amount?: string | null;
};

export type ShoppingItemInsert = {
  name: string; // text not null
  amount: string | null;
  checked: boolean;
  sort_order: number;
};

/**
 * 材料リストを name でまとめて、amount は " / " で連結する（最初はシンプル運用）
 * - 同名材料は1行に集約
 * - 分量は数値計算しない（文字列のまま）
 */
export function buildShoppingItemsFromIngredients(
  allIngredients: ApiKondateIngredient[]
): ShoppingItemInsert[] {
  const map = new Map<string, { amounts: string[] }>();

  for (const ing of allIngredients) {
    const rawName = (ing.name ?? "").trim();
    if (!rawName) continue;

    const amount = (ing.amount ?? "").trim();

    const key = rawName; // 完全一致（後で正規化したくなったらここ）
    if (!map.has(key)) map.set(key, { amounts: [] });

    if (amount) map.get(key)!.amounts.push(amount);
  }

  // 表示順は五十音でもいいが、まずは入力順ベース（Mapの順序）でOK
  const items: ShoppingItemInsert[] = [];
  let i = 0;
  for (const [name, v] of map.entries()) {
    const merged = v.amounts.length ? Array.from(new Set(v.amounts)).join(" / ") : null;
    items.push({ name, amount: merged, checked: false, sort_order: i++ });
  }

  return items;
}
