"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function BottomNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
    {
      href: session ? "/profile" : "/auth/signin",
      label: "我的",
      icon: session ? "👤" : "🔐"
    },
  ];

  return (
    <div className="ts-app-navbar is-bottom is-fluid">
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
