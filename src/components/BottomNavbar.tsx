"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "首頁",
      icon: "🏠"
    },
    {
      href: "/courses",
      label: "課程",
      icon: "📚"
    },
    {
      href: "/mock-schedule",
      label: "模擬選課",
      icon: "📅"
    },
  ];

  return (
    <div className="ts-app-navbar is-bottom">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`item ${pathname === item.href ? "is-active" : ""}`}
        >
          <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
          <div className="label">{item.label}</div>
        </Link>
      ))}
    </div>
  );
}
