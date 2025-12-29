"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type FavoriteButtonProps = {
  courseId: string;
  initialFavorited?: boolean;
  size?: "small" | "medium" | "large";
  onToggle?: (isFavorited: boolean) => void;
};

export function FavoriteButton({
  courseId,
  initialFavorited = false,
  size = "medium",
  onToggle,
}: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 檢查收藏狀態
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (status !== "authenticated") {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`/api/courses/${courseId}/favorite-status`);
        const data = await res.json();

        if (res.ok) {
          setIsFavorited(data.isFavorited);
          setFavoriteId(data.favoriteId);
        }
      } catch (error) {
        console.error("Error checking favorite status:", error);
      } finally {
        setChecking(false);
      }
    };

    checkFavoriteStatus();
  }, [courseId, status]);

  // 切換收藏狀態
  const handleToggle = async () => {
    if (!session) {
      alert("需要登入才能收藏課程");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isFavorited && favoriteId) {
        // 取消收藏
        const res = await fetch(`/api/favorites/${favoriteId}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "取消收藏失敗");
        }

        setIsFavorited(false);
        setFavoriteId(null);
        onToggle?.(false);
      } else {
        // 新增收藏
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "收藏失敗");
        }

        setIsFavorited(true);
        setFavoriteId(data.favoriteId);
        onToggle?.(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 未登入時顯示灰色按鈕
  if (status === "unauthenticated") {
    return (
      <button
        className={`ts-button is-outlined ${size === "small" ? "is-small" : ""}`}
        onClick={() => alert("需要登入才能收藏課程")}
        disabled
        style={{
          color: "var(--app-muted)",
          borderColor: "var(--app-border)",
        }}
      >
        <i className="icon is-regular is-star" />
        {size !== "small" && <span style={{ marginLeft: "0.5rem" }}>收藏</span>}
      </button>
    );
  }

  // 檢查中
  if (checking) {
    return (
      <button className={`ts-button is-outlined ${size === "small" ? "is-small" : ""}`} disabled>
        <i className="icon is-regular is-spinner-third is-spinning" />
      </button>
    );
  }

  return (
    <button
      className={`ts-button ${isFavorited ? "is-primary" : "is-outlined"} ${
        size === "small" ? "is-small" : ""
      }`}
      onClick={handleToggle}
      disabled={loading}
      style={{
        transition: "all 200ms",
      }}
    >
      <i
        className={`icon ${isFavorited ? "is-solid" : "is-regular"} is-star`}
        style={{
          color: isFavorited ? "#fbbf24" : "var(--app-muted)",
        }}
      />
      {size !== "small" && (
        <span style={{ marginLeft: "0.5rem" }}>
          {loading ? "處理中..." : isFavorited ? "已收藏" : "收藏"}
        </span>
      )}
    </button>
  );
}
