"use client";

export function TagChips({
  tags,
  selectedTag,
  onSelect,
}: {
  tags: string[];
  selectedTag: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", gap: 8, paddingBottom: 6 }}>
        {tags.map((t) => {
          const active = t === selectedTag;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              style={{
                flex: "0 0 auto",
                padding: "8px 10px",
                borderRadius: 999,
                border: active
                  ? "1px solid rgba(31,95,165,0.5)"
                  : "1px solid rgba(0,0,0,0.12)",
                background: active ? "rgba(179,229,255,0.75)" : "rgba(255,255,255,0.8)",
                fontSize: 13,
                fontWeight: 800,
                color: "#222",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
