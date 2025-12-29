"use client";

import Link from "next/link";
import { useState } from "react";

export function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1.5rem",
        fontSize: "0.938rem",
        color: "var(--ts-gray-800)",
        textDecoration: "none",
        transition: "background-color 0.2s",
        backgroundColor: isHovered ? "var(--ts-gray-100)" : "transparent",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
