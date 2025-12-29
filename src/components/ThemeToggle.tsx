"use client";

import { useEffect, useState, useCallback } from "react";

type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "nkust-theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("is-dark", "is-light");

  const effectiveMode = mode === "auto" ? getSystemPreference() : mode;
  if (effectiveMode === "dark") root.classList.add("is-dark");
  if (effectiveMode === "light") root.classList.add("is-light");
}

function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === "auto") return "light";
  if (mode === "light") return "dark";
  return "auto";
}

const THEME_ICONS: Record<ThemeMode, string> = {
  auto: "🔄",
  light: "☀️",
  dark: "🌙",
};

const THEME_LABELS: Record<ThemeMode, string> = {
  auto: "自動",
  light: "淺色",
  dark: "深色",
};

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  const handleSystemThemeChange = useCallback(() => {
    if (mode === "auto") {
      applyTheme("auto");
    }
  }, [mode]);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "light";
    setMode(saved);
    applyTheme(saved);
  }, []);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [handleSystemThemeChange]);

  const handleClick = () => {
    const m = nextMode(mode);
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
    applyTheme(m);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button type="button" className="ts-button is-ghost is-short" style={{ minWidth: "70px" }}>
        <span style={{ opacity: 0 }}>載入中</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="ts-button is-ghost is-short"
      onClick={handleClick}
      aria-label={`主題：${THEME_LABELS[mode]}`}
      title={`點擊切換主題（目前：${THEME_LABELS[mode]}）`}
      style={{ minWidth: "70px" }}
    >
      <span style={{ marginRight: "0.25rem" }}>{THEME_ICONS[mode]}</span>
      {THEME_LABELS[mode]}
    </button>
  );
}
