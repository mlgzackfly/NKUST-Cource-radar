"use client";

import { useEffect, useMemo, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "nkust-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  // Follow Tocas UI convention: is-dark / is-light
  root.classList.remove("is-dark", "is-light");
  if (mode === "dark") root.classList.add("is-dark");
  if (mode === "light") root.classList.add("is-light");
}

function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === "auto") return "light";
  if (mode === "light") return "dark";
  return "auto";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "light";
    setMode(saved);
    applyTheme(saved);
  }, []);

  const label = useMemo(() => {
    if (mode === "auto") return "自動";
    if (mode === "light") return "淺色";
    return "深色";
  }, [mode]);

  return (
    <button
      type="button"
      className="ts-button is-outlined is-short"
      onClick={() => {
        const m = nextMode(mode);
        setMode(m);
        localStorage.setItem(STORAGE_KEY, m);
        applyTheme(m);
      }}
      aria-label={`主題：${label}`}
      title={`主題：${label}`}
    >
      {label}
    </button>
  );
}


