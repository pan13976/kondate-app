// src/lib/shoppingLists/Api.ts

export async function apiDeleteShoppingList(id: string): Promise<void> {
  const res = await fetch(`/api/shopping_lists/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message ?? `delete failed: ${res.status}`);
  }
}