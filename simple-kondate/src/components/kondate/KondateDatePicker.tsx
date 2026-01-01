// src/components/kondate/KondateDatePicker.tsx
"use client";

type Props = {
  selectedDate: string; // "YYYY-MM-DD"
  onChangeSelectedDate: (v: string) => void;
  loading: boolean;
};

export function KondateDatePicker(props: Props) {
  const { selectedDate, onChangeSelectedDate, loading } = props;

  return (
    <section style={{ marginBottom: 12 }}>
      <label style={{ marginRight: 8 }}>日付：</label>

      {/* HTMLの date input は "YYYY-MM-DD" 形式 */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onChangeSelectedDate(e.target.value)}
        disabled={loading}
        style={{ padding: 8 }}
      />

      <span style={{ marginLeft: 12, color: "#666" }}>
        この日の献立を表示・追加します
      </span>
    </section>
  );
}
