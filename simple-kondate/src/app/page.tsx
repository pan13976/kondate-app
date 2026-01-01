// src/app/page.tsx
"use client";

import { KondateFilter } from "../components/kondate/KondateFilter";
import { KondateForm } from "../components/kondate/KondateForm";
import { KondateList } from "../components/kondate/KondateList";
import { useKondates } from "../hooks/useKondates";
import { KondateDatePicker } from "../components/kondate/KondateDatePicker";

/**
 * page.tsx は「画面の組み立て」だけにする。
 * - 状態や処理は useKondates に逃がす
 * - UIパーツは components に逃がす
 */
export default function HomePage() {
  const {
  visibleKondates,
  loading,

  selectedDate,
  setSelectedDate,

  title,
  setTitle,
  category,
  setCategory,

  filterCategory,
  setFilterCategory,

  reload,
  add,
  remove,
} = useKondates();



  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>献立アプリ（分割版）</h1>

      <KondateForm
        title={title}
        onChangeTitle={setTitle}
        category={category}
        onChangeCategory={setCategory}
        loading={loading}
        onAdd={async () => {
          // hook側は throw する設計なので、ここで catch して表示を統一
          try {
            await add();
          } catch (e) {
            alert((e as Error).message);
          }
        }}
        onReload={async () => {
          try {
            await reload();
          } catch (e) {
            alert((e as Error).message);
          }
        }}
      />

      <KondateFilter
        filterCategory={filterCategory}
        onChangeFilterCategory={setFilterCategory}
        loading={loading}
        count={visibleKondates.length}
      />
<KondateDatePicker
  selectedDate={selectedDate}
  onChangeSelectedDate={setSelectedDate}
  loading={loading}
/>
      <KondateList
        items={visibleKondates}
        loading={loading}
        onDelete={async (id) => {
          const ok = confirm("この献立を削除しますか？");
          if (!ok) return;

          try {
            await remove(id);
          } catch (e) {
            alert((e as Error).message);
          }
        }}
      />
    </main>
  );
}
