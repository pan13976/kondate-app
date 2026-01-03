"use client";

import { useRouter } from "next/navigation";

import { AddToKondateModal } from "../../components/recipes/AddToKondateModal";
import { RecipeGroup } from "../../components/recipes/RecipeGroup";
import { TagChips } from "../../components/recipes/TagChips";
import { useRecipes } from "../../hooks/recipes/useRecipes";

export default function RecipesPage() {
  const router = useRouter();

  const {
    loading,
    errorMsg,
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    allTags,
    filtered,
    grouped,
    openTags,
    toggleGroup,

    openAdd,
    setOpenAdd,
    mealDate,
    setMealDate,
    category,
    setCategory,
    selectedRecipe,
    adding,
    actionErrorMsg,
    openAddModalByRecipeId,
    addSelectedRecipeToKondate,
  } = useRecipes();

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>レシピ</h1>
        <p style={{ color: "#555", fontSize: 14 }}>主カテゴリでグルーピングして探しやすくします。</p>
      </header>

      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => router.push("/recipes/new")}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(179,229,255,0.85)",
            fontWeight: 900,
            textAlign: "center",
            color: "#222",
          }}
        >
          ＋ レシピを追加
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（例：唐揚げ / 作り置き / 野菜）"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <TagChips tags={allTags} selectedTag={selectedTag} onSelect={setSelectedTag} />
      </div>

      {loading ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#555",
            marginBottom: 12,
          }}
        >
          読み込み中…
        </div>
      ) : null}

      {errorMsg ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(255,230,230,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            color: "#a11",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          取得エラー：{errorMsg}
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: "rgba(255,255,255,0.75)",
            border: "1px dashed rgba(0,0,0,0.2)",
            color: "#555",
          }}
        >
          条件に一致するレシピがありません。
        </div>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {Array.from(grouped.entries()).map(([tag, items]) => {
            const collapsible = selectedTag === "すべて";
            const isOpen = collapsible ? !!openTags[tag] : true;
            return (
              <RecipeGroup
                key={tag}
                tag={tag}
                items={items}
                onUse={openAddModalByRecipeId}
                collapsible={collapsible}
                isOpen={isOpen}
                onToggle={() => toggleGroup(tag)}
              />
            );
          })}
        </section>
      )}

      <footer style={{ marginTop: 20 }}>
        <a href="/main" style={{ color: "#1f5fa5", fontWeight: 800 }}>
          ← メインメニューへ戻る
        </a>
      </footer>

      <AddToKondateModal
        open={openAdd}
        recipe={selectedRecipe}
        mealDate={mealDate}
        setMealDate={setMealDate}
        category={category}
        setCategory={setCategory}
        adding={adding}
        errorMsg={actionErrorMsg}
        onClose={() => setOpenAdd(false)}
        onSubmit={addSelectedRecipeToKondate}
      />
    </main>
  );
}
