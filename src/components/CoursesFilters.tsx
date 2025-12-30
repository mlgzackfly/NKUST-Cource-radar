"use client";

import { useEffect, useRef, useState } from "react";

type FilterOptions = {
  years: string[];
  terms: string[];
  campuses: string[];
  divisions: string[];
  departments: string[];
};

type Suggestion = {
  type: "course" | "instructor" | "department";
  text: string;
  label: string;
  id?: string;
  meta?: string;
};

type Props = {
  initial: {
    q?: string;
    campus?: string;
    division?: string;
    department?: string;
    sortBy?: string;
    sortOrder?: string;
    minRating?: string;
    maxWorkload?: string;
    minGrading?: string;
    timeSlot?: string;
  };
};

export function CoursesFilters({ initial }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState(initial.q || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 判斷是否有用戶主動設定的篩選條件（排除預設的排序設定）
  const hasAnyFilter = Boolean(
    initial.q ||
    initial.campus ||
    initial.division ||
    initial.department ||
    initial.minRating ||
    initial.maxWorkload ||
    initial.minGrading ||
    initial.timeSlot
  );

  useEffect(() => {
    if (hasAnyFilter) setOpen(true);
  }, [hasAnyFilter]);

  useEffect(() => {
    if (!open || options || loading) return;
    setLoading(true);
    setError(null);

    fetch("/api/courses/filters", { cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        return (await res.json()) as FilterOptions;
      })
      .then((data) => setOptions(data))
      .catch((e: any) => setError(e?.message || "Failed to load filters"))
      .finally(() => setLoading(false));
  }, [open, options, loading]);

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          // Map API response to internal suggestion format
          const mappedSuggestions = (data || []).map((item: any) => ({
            type:
              item.type === "course"
                ? "course"
                : item.type === "department"
                  ? "department"
                  : "instructor",
            text: item.value,
            label: item.label,
            id: item.id,
            meta: item.department,
          }));
          setSuggestions(mappedSuggestions);
          setShowSuggestions(true);
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    // 根據建議類型導航到不同頁面
    if (suggestion.type === "instructor" && suggestion.id) {
      // 點擊教師建議 -> 直接進入教師檔案頁面
      window.location.href = `/instructors/${suggestion.id}`;
    } else if (suggestion.type === "course" && suggestion.id) {
      // 點擊課程建議 -> 直接進入課程詳情頁面
      window.location.href = `/courses/${suggestion.id}`;
    } else {
      // 其他類型（系所等）-> 進入課程搜尋頁面
      const params = new URLSearchParams();
      params.set("q", suggestion.text);
      window.location.href = `/courses?${params.toString()}`;
    }
  };

  return (
    <>
      <form method="get" action="/courses" aria-label="課程搜尋與篩選">
        <div className="ts-grid is-relaxed">
          <div className="column is-fluid">
            <div style={{ position: "relative" }}>
              <div className="ts-input is-solid is-fluid">
                <input
                  ref={searchInputRef}
                  name="q"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="搜尋：課名 / 永久課號 / 選課代號 / 教師 / 系所"
                  autoComplete="off"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "0.5rem",
                    backgroundColor: "var(--app-surface)",
                    border: "1px solid var(--app-border)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)",
                    maxHeight: "320px",
                    overflowY: "auto",
                    zIndex: 100,
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.type}-${suggestion.text}-${index}`}
                      onClick={() => selectSuggestion(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        padding: "0.75rem 1rem",
                        cursor: "pointer",
                        backgroundColor:
                          selectedIndex === index ? "var(--app-table-hover-bg)" : "transparent",
                        borderBottom:
                          index < suggestions.length - 1 ? "1px solid var(--app-border)" : "none",
                        transition: "background-color 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
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
                            color: "var(--app-text)",
                            fontWeight: 500,
                          }}
                        >
                          {suggestion.label}
                        </div>
                        {suggestion.meta && (
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
                            {suggestion.meta}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="column">
            <button type="submit" className="ts-button is-primary is-fluid">
              搜尋
            </button>
          </div>
        </div>

        <div style={{ height: "1.5rem" }} />

        <details
          className="app-filter-details"
          open={open}
          onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="ts-button is-outlined" style={{ padding: "0.75rem 1.25rem" }}>
            進階篩選
          </summary>
          <div style={{ height: "1.25rem" }} />

          {error ? (
            <div className="ts-notice is-negative">
              <div className="title">篩選載入失敗</div>
              <div className="content">{error}</div>
            </div>
          ) : null}

          {loading && !options ? <div className="app-muted">載入篩選選項中…</div> : null}

          {options ? (
            <fieldset className="ts-fieldset">
              <legend>進階篩選</legend>
              <div className="app-filter-grid">
                <div className="ts-control is-stacked is-fluid">
                  <div className="label">校區</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="campus" defaultValue={initial.campus ?? ""}>
                        <option value="">全部</option>
                        {options.campuses.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">學制</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="division" defaultValue={initial.division ?? ""}>
                        <option value="">全部</option>
                        {options.divisions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">系所</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="department" defaultValue={initial.department ?? ""}>
                        <option value="">全部</option>
                        {options.departments.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">排序方式</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="sortBy" defaultValue={initial.sortBy ?? "latest"}>
                        <option value="latest">最新更新</option>
                        <option value="name">課程名稱</option>
                        <option value="credits">學分數</option>
                        <option value="rating">平均評分</option>
                        <option value="reviews">評論數量</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">排序順序</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="sortOrder" defaultValue={initial.sortOrder ?? "desc"}>
                        <option value="desc">遞減</option>
                        <option value="asc">遞增</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">最低評分</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="minRating" defaultValue={initial.minRating ?? ""}>
                        <option value="">不限</option>
                        <option value="1">1 分以上</option>
                        <option value="2">2 分以上</option>
                        <option value="3">3 分以上</option>
                        <option value="4">4 分以上</option>
                        <option value="4.5">4.5 分以上</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">最高作業量</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="maxWorkload" defaultValue={initial.maxWorkload ?? ""}>
                        <option value="">不限</option>
                        <option value="2">2 分以下（輕鬆）</option>
                        <option value="3">3 分以下（適中）</option>
                        <option value="4">4 分以下</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">最低給分甜度</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="minGrading" defaultValue={initial.minGrading ?? ""}>
                        <option value="">不限</option>
                        <option value="3">3 分以上</option>
                        <option value="4">4 分以上（甜課）</option>
                        <option value="4.5">4.5 分以上（超甜）</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">時段篩選</div>
                  <div className="content">
                    <div className="ts-input is-solid is-fluid">
                      <input
                        type="text"
                        name="timeSlot"
                        defaultValue={initial.timeSlot ?? ""}
                        placeholder="例如: 1-2 (星期一 2-3 節)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: "1.5rem" }} />
              <div className="ts-wrap is-compact">
                <button
                  type="submit"
                  className="ts-button is-primary"
                  style={{ padding: "0.75rem 1.5rem" }}
                >
                  套用篩選
                </button>
                {hasAnyFilter ? (
                  <a
                    className="ts-button is-ghost"
                    href="/courses"
                    style={{ padding: "0.75rem 1.5rem" }}
                  >
                    清除全部
                  </a>
                ) : null}
              </div>
            </fieldset>
          ) : null}
        </details>
      </form>
    </>
  );
}
