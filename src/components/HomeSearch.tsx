"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  type: 'course' | 'department';
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
        console.error('Failed to fetch suggestions:', error);
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
    router.push(`/courses?q=${encodeURIComponent(suggestion.value)}`);
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
            boxShadow: showSuggestions && suggestions.length > 0
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
            placeholder="搜尋課程或系所..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "1rem",
              padding: "0.75rem 1rem",
              background: "transparent",
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
              top: "calc(100% - 0.5rem)",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: "0 0 12px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
              border: "1px solid var(--ts-gray-200)",
              borderTop: "1px solid var(--ts-gray-100)",
              maxHeight: "400px",
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
                  padding: "0.875rem 1.25rem",
                  border: "none",
                  background: selectedIndex === index ? "var(--ts-gray-50)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "background-color 0.15s",
                  borderBottom: index < suggestions.length - 1 ? "1px solid var(--ts-gray-100)" : "none",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span
                  style={{
                    fontSize: "1.125rem",
                    flexShrink: 0,
                  }}
                >
                  {suggestion.type === 'course' ? '📚' : '🏫'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "var(--ts-gray-900)",
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
                        color: "var(--ts-gray-500)",
                        marginTop: "0.125rem",
                      }}
                    >
                      {suggestion.department}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--ts-gray-400)",
                    flexShrink: 0,
                  }}
                >
                  {suggestion.type === 'course' ? '課程' : '系所'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
