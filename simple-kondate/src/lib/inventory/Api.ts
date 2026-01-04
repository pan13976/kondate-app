// src/lib/inventory/Api.ts

import type { InventoryItem, InventoryKind } from "../../types/inventory";

type ListResult = { items: InventoryItem[]; message?: string };
type OneResult = { item?: InventoryItem; message?: string };

export async function apiFetchInventoryItems(): Promise<InventoryItem[]> {
  const res = await fetch("/api/inventory_items", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as ListResult | null;
  if (!res.ok) {
    throw new Error(json?.message ?? `fetch failed: ${res.status}`);
  }
  return json?.items ?? [];
}

export async function apiCreateInventoryItem(input: {
  kind: InventoryKind;
  category: string | null;
  name: string;
  quantity_num: number;
  unit: string | null;
  expires_on: string | null;
}): Promise<InventoryItem> {
  const res = await fetch("/api/inventory_items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => null)) as OneResult | null;
  if (!res.ok) {
    throw new Error(json?.message ?? `create failed: ${res.status}`);
  }
  if (!json?.item) throw new Error("create succeeded but item missing");
  return json.item;
}

export async function apiUpdateInventoryItem(
  id: string,
  patch: Partial<Pick<InventoryItem, "kind" | "category" | "name" | "quantity_num" | "unit" | "expires_on">>
): Promise<InventoryItem> {
  const res = await fetch(`/api/inventory_items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json().catch(() => null)) as OneResult | null;
  if (!res.ok) {
    throw new Error(json?.message ?? `update failed: ${res.status}`);
  }
  if (!json?.item) throw new Error("update succeeded but item missing");
  return json.item;
}

export async function apiDeleteInventoryItem(id: string): Promise<void> {
  const res = await fetch(`/api/inventory_items/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    throw new Error(json?.message ?? `delete failed: ${res.status}`);
  }
}

/**
 * 消費（-1）
 * - quantity_num が 0 以下になったらサーバ側で delete
 */
export async function apiConsumeInventoryItem(id: string, delta = 1): Promise<{ deleted: boolean; item?: InventoryItem }> {
  const res = await fetch(`/api/inventory_items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "consume", delta }),
  });
  const json = (await res.json().catch(() => null)) as
    | { deleted: boolean; item?: InventoryItem; message?: string }
    | null;

  if (!res.ok) {
    throw new Error(json?.message ?? `consume failed: ${res.status}`);
  }

  return { deleted: !!json?.deleted, item: json?.item };
}
