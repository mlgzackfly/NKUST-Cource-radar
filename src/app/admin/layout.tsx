// @ts-expect-error - Next.js 15 type definition issue with redirect
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { AdminNavLink } from "./AdminNavLink";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 權限檢查：非管理員導向首頁
  if (!user || user.role !== "ADMIN" || user.bannedAt) {
    redirect("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--ts-gray-100)" }}>
      {/* 側邊欄 */}
      <aside style={{
        width: "260px",
        backgroundColor: "var(--ts-gray-50)",
        borderRight: "1px solid var(--ts-gray-200)",
        padding: "2rem 0",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto"
      }}>
        <div style={{ padding: "0 1.5rem", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            管理員控制台
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
            {user.email}
          </p>
        </div>

        <nav>
          <AdminNavLink href="/admin" icon="📊">儀表板</AdminNavLink>
          <AdminNavLink href="/admin/reports" icon="🚩">檢舉管理</AdminNavLink>
          <AdminNavLink href="/admin/reviews" icon="💬">評論管理</AdminNavLink>
          <AdminNavLink href="/admin/users" icon="👥">使用者管理</AdminNavLink>
          <AdminNavLink href="/admin/actions" icon="📝">操作記錄</AdminNavLink>

          <div style={{ padding: "1rem 1.5rem", marginTop: "1rem", borderTop: "1px solid var(--ts-gray-200)" }}>
            <Link href="/" className="ts-button is-outlined is-fluid" style={{ fontSize: "0.875rem" }}>
              返回首頁
            </Link>
          </div>
        </nav>
      </aside>

      {/* 主內容區 */}
      <main style={{ flex: 1, padding: "2rem" }}>
        {children}
      </main>
    </div>
  );
}
