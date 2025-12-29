"use client";

import { useState } from "react";

interface ExportOption {
  type: string;
  label: string;
  description: string;
}

const exportOptions: ExportOption[] = [
  {
    type: "courses",
    label: "課程資料",
    description: "匯出所有課程的基本資訊、教師、評論數和平均評分",
  },
  {
    type: "reviews",
    label: "評論資料",
    description: "匯出所有評論的評分、狀態、投票數（不含使用者識別資訊）",
  },
  {
    type: "instructors",
    label: "教師資料",
    description: "匯出所有教師的課程數、評論數和各項平均評分",
  },
  {
    type: "users",
    label: "使用者資料",
    description: "匯出使用者的基本統計資訊（評論數、投票數、檢舉數）",
  },
  {
    type: "reports",
    label: "檢舉資料",
    description: "匯出所有檢舉記錄及其處理狀態",
  },
];

export default function AdminExportPage() {
  const [selectedType, setSelectedType] = useState("courses");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        type: selectedType,
        format,
      });

      if (year && (selectedType === "courses" || selectedType === "reviews")) {
        params.set("year", year);
      }
      if (term && (selectedType === "courses" || selectedType === "reviews")) {
        params.set("term", term);
      }

      // 直接開啟新視窗下載
      window.open(`/api/admin/export?${params}`, "_blank");
    } catch (error) {
      console.error("Export failed:", error);
      alert("匯出失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = exportOptions.find((o) => o.type === selectedType);
  const showFilters = selectedType === "courses" || selectedType === "reviews";

  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>數據匯出</h1>

      <div style={{ display: "grid", gap: "2rem", maxWidth: "800px" }}>
        {/* 匯出類型選擇 */}
        <div className="ts-box" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            選擇匯出類型
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {exportOptions.map((option) => (
              <label
                key={option.type}
                className={`ts-box ${selectedType === option.type ? "is-indicated" : ""}`}
                style={{
                  padding: "1rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  borderColor: selectedType === option.type ? "var(--ts-primary-500)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={option.type}
                  checked={selectedType === option.type}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{ marginTop: "0.25rem" }}
                />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{option.label}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 篩選條件 */}
        {showFilters && (
          <div className="ts-box" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
              篩選條件（選填）
            </h2>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    marginBottom: "0.5rem",
                    color: "var(--ts-gray-600)",
                  }}
                >
                  學年
                </label>
                <div className="ts-input">
                  <input
                    type="number"
                    placeholder="例: 114"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ width: "120px" }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    marginBottom: "0.5rem",
                    color: "var(--ts-gray-600)",
                  }}
                >
                  學期
                </label>
                <div className="ts-select">
                  <select value={term} onChange={(e) => setTerm(e.target.value)}>
                    <option value="">全部</option>
                    <option value="1">第一學期</option>
                    <option value="2">第二學期</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 格式選擇 */}
        <div className="ts-box" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>匯出格式</h2>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label
              className={`ts-box ${format === "csv" ? "is-indicated" : ""}`}
              style={{
                padding: "1rem 1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderColor: format === "csv" ? "var(--ts-primary-500)" : undefined,
              }}
            >
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === "csv"}
                onChange={() => setFormat("csv")}
              />
              <span style={{ fontWeight: 500 }}>CSV</span>
              <span style={{ fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>
                (適合 Excel)
              </span>
            </label>
            <label
              className={`ts-box ${format === "json" ? "is-indicated" : ""}`}
              style={{
                padding: "1rem 1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderColor: format === "json" ? "var(--ts-primary-500)" : undefined,
              }}
            >
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === "json"}
                onChange={() => setFormat("json")}
              />
              <span style={{ fontWeight: 500 }}>JSON</span>
              <span style={{ fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>
                (適合程式處理)
              </span>
            </label>
          </div>
        </div>

        {/* 匯出按鈕 */}
        <div>
          <button
            type="button"
            className={`ts-button is-primary is-large ${loading ? "is-loading" : ""}`}
            onClick={handleExport}
            disabled={loading}
            style={{ minWidth: "200px" }}
          >
            {loading ? "匯出中..." : `匯出 ${selectedOption?.label}`}
          </button>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>
            匯出的檔案將直接下載到您的電腦
          </p>
        </div>
      </div>
    </div>
  );
}
