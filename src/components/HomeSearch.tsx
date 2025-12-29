"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  type: "course" | "instructor" | "department";
  value: string;
  label: string;
  department?: string | null;
  id?: string;
};

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);

    // 根據建議類型導航到不同頁面
    if (suggestion.type === "instructor" && suggestion.id) {
      // 點擊教師建議 -> 直接進入教師檔案頁面
      router.push(`/instructors/${suggestion.id}`);
    } else if (suggestion.type === "course" && suggestion.id) {
      // 點擊課程建議 -> 直接進入課程詳情頁面
      router.push(`/courses/${suggestion.id}`);
    } else {
      // 其他類型（系所等）-> 進入課程搜尋頁面
      router.push(`/courses?q=${encodeURIComponent(suggestion.value)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="首頁快速查課">
      <div style={{ maxWidth: 600, margin: "0 auto 1.5rem", position: "relative" }}>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            padding: "0.5rem",
            background: "white",
            borderRadius: "12px",
            border: "1px solid var(--ts-gray-200)",
            boxShadow:
              showSuggestions && suggestions.length > 0
                ? "0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)"
                : "0 4px 12px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.02)",
            transition: "box-shadow 0.2s, border-color 0.2s",
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜尋課程、教師或系所..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "1rem",
              padding: "0.75rem 1rem",
              background: "transparent",
              color: "var(--ts-gray-800)",
            }}
          />
          <button
            type="submit"
            className="ts-button is-primary"
            style={{
              borderRadius: "8px",
              padding: "0.75rem 2rem",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            搜尋
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "0.5rem",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)",
              border: "1px solid var(--ts-gray-200)",
              maxHeight: "320px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.value}-${index}`}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "none",
                  background: selectedIndex === index ? "var(--app-table-hover-bg)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "background-color 0.15s",
                  borderBottom:
                    index < suggestions.length - 1 ? "1px solid var(--app-border)" : "none",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "6px",
                    backgroundColor:
                      suggestion.type === "course"
                        ? "color-mix(in srgb, var(--ts-primary-500) 15%, transparent)"
                        : suggestion.type === "instructor"
                          ? "color-mix(in srgb, var(--ts-info-500) 15%, transparent)"
                          : "color-mix(in srgb, var(--ts-warning-500) 15%, transparent)",
                    color:
                      suggestion.type === "course"
                        ? "var(--ts-primary-600)"
                        : suggestion.type === "instructor"
                          ? "var(--ts-info-600)"
                          : "var(--ts-warning-600)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {suggestion.type === "course"
                    ? "課程"
                    : suggestion.type === "instructor"
                      ? "教師"
                      : "系所"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "var(--app-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {suggestion.label}
                  </div>
                  {suggestion.department && (
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--app-muted)",
                        marginTop: "0.25rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {suggestion.department}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
