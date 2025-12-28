"use client";

import { useState, useEffect, useCallback } from "react";

// SVG 比較圖示 (標準天秤)
function CompareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 中間支柱 */}
      <line x1="12" y1="3" x2="12" y2="21" />
      {/* 底座 */}
      <line x1="8" y1="21" x2="16" y2="21" />
      {/* 頂端三角 */}
      <polygon points="12,3 10,6 14,6" fill="currentColor" stroke="none" />
      {/* 橫桿 */}
      <line x1="4" y1="7" x2="20" y2="7" />
      {/* 左秤盤 */}
      <path d="M4 7 L2 14 L6 14 Z" />
      <ellipse cx="4" cy="14" rx="3" ry="1" />
      {/* 右秤盤 */}
      <path d="M20 7 L18 14 L22 14 Z" />
      <ellipse cx="20" cy="14" rx="3" ry="1" />
    </svg>
  );
}

// SVG X 圖示
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface CompareButtonProps {
  courseId: string;
  courseName: string;
  variant?: "icon" | "button";
  className?: string;
}

const MAX_COMPARE_ITEMS = 4;
const STORAGE_KEY = "nkust-compare-list";

interface CompareItem {
  id: string;
  name: string;
}

export function CompareButton({
  courseId,
  courseName,
  variant = "button",
  className = "",
}: CompareButtonProps) {
  const [isInList, setIsInList] = useState(false);
  const [listCount, setListCount] = useState(0);

  const getCompareList = useCallback((): CompareItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveCompareList = useCallback((list: CompareItem[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // 觸發自定義事件，讓其他組件可以監聽
    window.dispatchEvent(new CustomEvent("compare-list-change", { detail: list }));
  }, []);

  const updateState = useCallback(() => {
    const list = getCompareList();
    setIsInList(list.some((item) => item.id === courseId));
    setListCount(list.length);
  }, [courseId, getCompareList]);

  useEffect(() => {
    updateState();

    // 監聽比較列表變化
    const handleChange = () => updateState();
    window.addEventListener("compare-list-change", handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener("compare-list-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [updateState]);

  const handleClick = () => {
    const list = getCompareList();

    if (isInList) {
      // 從列表移除
      const newList = list.filter((item) => item.id !== courseId);
      saveCompareList(newList);
    } else {
      // 添加到列表
      if (list.length >= MAX_COMPARE_ITEMS) {
        alert(`最多只能比較 ${MAX_COMPARE_ITEMS} 門課程`);
        return;
      }
      const newList = [...list, { id: courseId, name: courseName }];
      saveCompareList(newList);
    }

    updateState();
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`ts-button is-icon is-ghost ${className}`}
        title={isInList ? "從比較列表移除" : "加入比較"}
        style={{
          color: isInList ? "var(--ts-primary-500)" : "var(--ts-gray-500)",
        }}
      >
        <CompareIcon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`ts-button ${isInList ? "is-outlined is-primary" : "is-outlined"} ${className}`}
    >
      <span style={{ marginRight: "0.5rem", display: "inline-flex" }}><CompareIcon size={16} /></span>
      {isInList ? "已加入比較" : "加入比較"}
      {listCount > 0 && !isInList && (
        <span
          style={{
            marginLeft: "0.5rem",
            fontSize: "0.75rem",
            opacity: 0.7,
          }}
        >
          ({listCount}/{MAX_COMPARE_ITEMS})
        </span>
      )}
    </button>
  );
}

// 比較列表浮動按鈕（顯示在頁面底部）
export function CompareFloatingBar() {
  const [list, setList] = useState<CompareItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const getList = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    setList(getList());

    const handleChange = (e: CustomEvent<CompareItem[]>) => {
      setList(e.detail || getList());
    };

    window.addEventListener("compare-list-change", handleChange as EventListener);
    window.addEventListener("storage", () => setList(getList()));

    return () => {
      window.removeEventListener("compare-list-change", handleChange as EventListener);
      window.removeEventListener("storage", () => setList(getList()));
    };
  }, []);

  const removeItem = (id: string) => {
    const newList = list.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    setList(newList);
    window.dispatchEvent(new CustomEvent("compare-list-change", { detail: newList }));
  };

  const clearAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    setList([]);
    window.dispatchEvent(new CustomEvent("compare-list-change", { detail: [] }));
  };

  if (list.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px", // 避開底部導覽列
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: "calc(100vw - 2rem)",
        width: "fit-content",
      }}
    >
      <div
        className="ts-box is-raised"
        style={{
          background: "var(--ts-gray-50)",
          padding: isExpanded ? "1rem" : "0.75rem 1rem",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {isExpanded ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                比較列表 ({list.length}/{MAX_COMPARE_ITEMS})
              </span>
              <button
                type="button"
                className="ts-button is-ghost is-small"
                onClick={() => setIsExpanded(false)}
              >
                收起
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {list.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    padding: "0.25rem 0",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "200px",
                    }}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    className="ts-button is-icon is-ghost is-small"
                    onClick={() => removeItem(item.id)}
                    title="移除"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.75rem",
                borderTop: "1px solid var(--ts-gray-200)",
                paddingTop: "0.75rem",
              }}
            >
              <button
                type="button"
                className="ts-button is-small is-outlined"
                onClick={clearAll}
              >
                清空
              </button>
              <a
                href={`/compare?ids=${list.map((i) => i.id).join(",")}`}
                className="ts-button is-small is-primary"
                style={{ flex: 1, textAlign: "center" }}
              >
                開始比較 ({list.length})
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              className="ts-button is-ghost is-small"
              onClick={() => setIsExpanded(true)}
              style={{ display: "flex", alignItems: "center" }}
            >
              <span style={{ marginRight: "0.5rem", display: "inline-flex" }}><CompareIcon size={16} /></span>
              比較列表 ({list.length})
            </button>
            <a
              href={`/compare?ids=${list.map((i) => i.id).join(",")}`}
              className="ts-button is-small is-primary"
            >
              開始比較
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
