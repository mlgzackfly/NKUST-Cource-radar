import { Metadata } from "next";
import FavoriteList from "@/components/FavoriteList";

export const metadata: Metadata = {
  title: "我的收藏 - 高科選課雷達",
  description: "查看與管理您收藏的課程",
};

export default function FavoritesPage() {
  return (
    <div className="ts-container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* 頁面標題 */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            className="ts-header is-large"
            style={{
              marginBottom: "0.5rem",
              color: "var(--app-text)",
            }}
          >
            我的收藏
          </h1>
          <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
            管理您收藏的課程，方便規劃選課
          </div>
        </div>

        {/* 收藏列表 */}
        <FavoriteList />
      </div>
    </div>
  );
}
