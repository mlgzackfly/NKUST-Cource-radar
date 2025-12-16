"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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

  const emailPrefix = session.user?.email?.split("@")[0] || "User";

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
              {session.user?.email}
            </div>
          </div>

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
