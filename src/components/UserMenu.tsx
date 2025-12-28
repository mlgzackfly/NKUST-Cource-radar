"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="ts-button is-ghost is-short is-loading">載入中...</div>;
  }

  if (!session) {
    return (
      <Link href="/auth/signin" className="ts-button is-primary is-short">
        登入
      </Link>
    );
  }

  const email = session.user?.email || "";
  const emailPrefix = email.split("@")[0] || "User";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        className="ts-button is-outlined is-short"
        onClick={() => setShowMenu(!showMenu)}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <span>{emailPrefix}</span>
        <span style={{ opacity: 0.7 }}>▾</span>
      </button>

      {showMenu && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            minWidth: "200px",
            backgroundColor: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 100,
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--app-border)" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{emailPrefix}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--app-muted)", marginTop: "0.25rem" }}>
              {email}
            </div>
          </div>

          <Link
            href="/favorites"
            onClick={() => setShowMenu(false)}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              textAlign: "left",
              textDecoration: "none",
              fontSize: "0.9375rem",
              color: "var(--app-text)",
              transition: "background-color 0.15s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            ⭐ 我的收藏
          </Link>

          {session.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setShowMenu(false)}
              style={{
                display: "block",
                width: "100%",
                padding: "0.75rem 1rem",
                textAlign: "left",
                textDecoration: "none",
                fontSize: "0.9375rem",
                color: "var(--ts-primary-500)",
                fontWeight: 500,
                transition: "background-color 0.15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              ⚙️ 管理員控制台
            </Link>
          )}

          <button
            onClick={() => {
              signOut({ callbackUrl: "/" });
              setShowMenu(false);
            }}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              textAlign: "left",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.9375rem",
              color: "var(--ts-negative-500)",
              borderTop: "1px solid var(--app-border)",
              transition: "background-color 0.15s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}
