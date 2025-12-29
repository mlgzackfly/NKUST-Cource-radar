"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Instructor {
  id: string;
  name: string;
  createdAt: string;
  courseCount: number;
  reviewCount: number;
  avgRating: number | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("reviewCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const fetchInstructors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (search) {
        params.set("search", search);
      }

      const res = await fetch(`/api/admin/instructors?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInstructors(data.instructors);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch instructors:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInstructors();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return <span style={{ marginLeft: "0.25rem" }}>{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>教師儀表板</h1>
        <Link
          href="/api/admin/export?type=instructors&format=csv"
          className="ts-button is-outlined is-small"
        >
          匯出 CSV
        </Link>
      </div>

      {/* 搜尋欄 */}
      <form onSubmit={handleSearch} style={{ marginBottom: "1.5rem" }}>
        <div className="ts-input" style={{ maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="搜尋教師姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {/* 教師列表 */}
      <div className="ts-box" style={{ overflow: "auto" }}>
        <table className="ts-table is-striped" style={{ width: "100%", minWidth: "600px" }}>
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>
                教師姓名
                <SortIcon field="name" />
              </th>
              <th style={{ textAlign: "center" }}>課程數</th>
              <th
                style={{ textAlign: "center", cursor: "pointer" }}
                onClick={() => handleSort("reviewCount")}
              >
                評論數
                <SortIcon field="reviewCount" />
              </th>
              <th
                style={{ textAlign: "center", cursor: "pointer" }}
                onClick={() => handleSort("avgRating")}
              >
                平均評分
                <SortIcon field="avgRating" />
              </th>
              <th style={{ textAlign: "center" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  載入中...
                </td>
              </tr>
            ) : instructors.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  {search ? "找不到符合的教師" : "目前沒有教師資料"}
                </td>
              </tr>
            ) : (
              instructors.map((instructor) => (
                <tr key={instructor.id}>
                  <td style={{ fontWeight: 500 }}>{instructor.name}</td>
                  <td style={{ textAlign: "center" }}>{instructor.courseCount}</td>
                  <td style={{ textAlign: "center" }}>{instructor.reviewCount}</td>
                  <td style={{ textAlign: "center" }}>
                    {instructor.avgRating !== null ? (
                      <span
                        style={{
                          color:
                            instructor.avgRating >= 4
                              ? "var(--ts-positive-500)"
                              : instructor.avgRating >= 3
                                ? "var(--ts-warning-500)"
                                : "var(--ts-negative-500)",
                          fontWeight: 600,
                        }}
                      >
                        {instructor.avgRating.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--ts-gray-400)" }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href={`/admin/instructors/${instructor.id}`}
                      className="ts-button is-small is-outlined"
                    >
                      查看詳情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            type="button"
            className="ts-button is-small is-outlined"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            上一頁
          </button>
          <span style={{ margin: "0 1rem", color: "var(--ts-gray-600)" }}>
            第 {page} / {pagination.totalPages} 頁
          </span>
          <button
            type="button"
            className="ts-button is-small is-outlined"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
