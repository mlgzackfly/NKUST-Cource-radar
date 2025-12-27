"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/", label: "首頁" },
    { href: "/courses", label: "課程" },
    { href: "/mock-schedule", label: "模擬選課" },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="mobile-menu-button ts-button is-icon is-ghost"
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: "none" }}
        aria-label="開啟選單"
      >
        <span style={{ fontSize: "1.25rem" }}>☰</span>
      </button>

      {/* Mobile Menu Overlay - Rendered via Portal */}
      {mounted && isOpen && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              backgroundColor: "var(--app-surface)",
              boxShadow: "4px 0 12px rgba(0,0,0,0.15)",
              padding: "1.5rem",
              overflowY: "auto",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button
                className="ts-button is-icon is-ghost"
                onClick={() => setIsOpen(false)}
                aria-label="關閉選單"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ts-button is-fluid ${pathname === item.href ? "is-secondary" : "is-ghost"}`}
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
