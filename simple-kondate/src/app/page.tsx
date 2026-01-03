// src/app/main/page.tsx
"use client";

export default function MainMenuPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      {/* ===== タイトル ===== */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>メインメニュー</h1>
        <p style={{ color: "#555", marginTop: 6 }}>
          使いたい機能を選んでください
        </p>
      </header>

      {/* ===== メニューカード ===== */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* 🍱 献立 */}
        <a
          href="/kondates"
          style={cardStyle}
        >
          <div style={{ fontSize: 34 }}>🍱</div>
          <div>
            <div style={cardTitleStyle}>献立</div>
            <div style={cardDescStyle}>
              月カレンダーで献立を管理
            </div>
          </div>
        </a>

        {/* 📖 レシピ */}
        <a
          href="/recipes"
          style={cardStyle}
        >
          <div style={{ fontSize: 34 }}>📖</div>
          <div>
            <div style={cardTitleStyle}>レシピ</div>
            <div style={cardDescStyle}>
              レシピの登録・編集・検索
            </div>
          </div>
        </a>
      </section>
    </main>
  );
}

/* ===== 共通スタイル ===== */

const cardStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  padding: "18px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.8)",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
  backdropFilter: "blur(6px)",
  textDecoration: "none",
  color: "#111",
  fontWeight: 900,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#555",
  marginTop: 4,
};
