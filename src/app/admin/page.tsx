import { TrendsCharts } from "./TrendsCharts";

export default async function AdminDashboard() {
  // 呼叫 stats API 取得統計資料
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/stats`, {
    cache: "no-store",
  });

  const stats = res.ok
    ? await res.json()
    : {
        users: { total: 0, active: 0, banned: 0 },
        reviews: { total: 0, active: 0, hidden: 0, removed: 0 },
        reports: { open: 0, total: 0 },
      };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>儀表板</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* 使用者統計 */}
        <StatCard
          title="使用者"
          items={[
            { label: "總計", value: stats.users.total },
            { label: "活躍", value: stats.users.active, color: "var(--ts-positive-500)" },
            { label: "已封禁", value: stats.users.banned, color: "var(--ts-negative-500)" },
          ]}
        />

        {/* 評論統計 */}
        <StatCard
          title="評論"
          items={[
            { label: "總計", value: stats.reviews.total },
            { label: "顯示中", value: stats.reviews.active, color: "var(--ts-positive-500)" },
            { label: "已隱藏", value: stats.reviews.hidden, color: "var(--ts-warning-500)" },
            { label: "已移除", value: stats.reviews.removed, color: "var(--ts-negative-500)" },
          ]}
        />

        {/* 檢舉統計 */}
        <StatCard
          title="檢舉"
          items={[
            { label: "待處理", value: stats.reports.open, color: "var(--ts-negative-500)" },
            { label: "總計", value: stats.reports.total },
          ]}
        />
      </div>

      {/* 趨勢圖表 */}
      <TrendsCharts />
    </div>
  );
}

function StatCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number; color?: string }>;
}) {
  return (
    <div className="ts-box is-raised" style={{ backgroundColor: "var(--ts-gray-50)" }}>
      <div className="ts-content" style={{ padding: "1.5rem" }}>
        <div
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "1rem",
            color: "var(--ts-gray-700)",
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontSize: "0.938rem", color: "var(--app-muted)" }}>{item.label}</span>
              <span
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: item.color || "var(--ts-gray-800)",
                }}
              >
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
