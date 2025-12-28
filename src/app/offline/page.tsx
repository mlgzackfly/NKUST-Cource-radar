"use client";

export default function OfflinePage() {
  return (
    <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div className="ts-box is-raised" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📡</div>
          <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
            離線中
          </div>
          <div className="app-muted" style={{ marginBottom: "2rem", lineHeight: 1.7 }}>
            目前沒有網路連線，部分功能可能無法使用。
            <br />
            請檢查您的網路設定後再試一次。
          </div>
          <button
            onClick={() => window.location.reload()}
            className="ts-button is-primary is-large"
          >
            重新載入
          </button>
        </div>
      </div>
    </div>
  );
}
