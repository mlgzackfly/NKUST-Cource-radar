"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserActivityChart } from "./UserActivityChart";

type User = {
  id: string;
  email: string;
  createdAt: string;
  bannedAt: string | null;
  role: string;
  _count: { reviews: number; reports: number };
};

type UserDetails = {
  user: User;
  reviews: Array<{
    id: string;
    createdAt: string;
    status: string;
    body: string | null;
    course: {
      id: string;
      courseName: string;
      courseCode: string;
    };
    _count: {
      helpfulVotes: number;
      reports: number;
    };
  }>;
  reportsMade: Array<any>;
  reportsReceived: Array<any>;
  stats: {
    totalReviews: number;
    activeReviews: number;
    hiddenReviews: number;
    removedReviews: number;
    totalHelpfulVotes: number;
    totalReportsReceived: number;
    totalReportsMade: number;
    averageRatings: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
  };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bannedFilter, setBannedFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [bannedFilter, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (bannedFilter) params.set("banned", bannedFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setSelectedUsers(new Set()); // 清除選擇
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBan = async (userId: string, action: "ban" | "unban") => {
    if (!confirm(`確定要${action === "ban" ? "封禁" : "解封"}此使用者嗎？`)) return;

    setProcessing(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        alert("操作成功");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "操作失敗");
      }
    } catch (error) {
      console.error("Failed to handle user:", error);
      alert("操作失敗");
    } finally {
      setProcessing(null);
    }
  };

  const handleBatchBan = async (action: "ban" | "unban") => {
    if (selectedUsers.size === 0) {
      alert("請先選擇使用者");
      return;
    }

    const actionText = action === "ban" ? "封禁" : "解封";
    if (!confirm(`確定要${actionText} ${selectedUsers.size} 位使用者嗎？`)) return;

    setProcessing("batch");
    try {
      const promises = Array.from(selectedUsers).map((userId) =>
        fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
      );

      await Promise.all(promises);
      alert(`批次${actionText}成功`);
      fetchUsers();
    } catch (error) {
      console.error("Failed to batch handle users:", error);
      alert(`批次${actionText}失敗`);
    } finally {
      setProcessing(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.filter((u) => u.role !== "ADMIN").length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.filter((u) => u.role !== "ADMIN").map((u) => u.id)));
    }
  };

  const fetchUserDetails = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserDetails(null);
      return;
    }

    setLoadingDetails(true);
    setExpandedUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`);
      const data = await res.json();
      setUserDetails(data);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setExpandedUser(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>使用者管理</h1>

      {/* 搜尋與篩選 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
        >
          <div className="ts-input is-fluid" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="搜尋 Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="ts-button is-primary">
            搜尋
          </button>
        </form>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setBannedFilter("");
              setPage(1);
            }}
            className={`ts-button ${!bannedFilter ? "is-primary" : "is-outlined"}`}
          >
            全部
          </button>
          <button
            onClick={() => {
              setBannedFilter("false");
              setPage(1);
            }}
            className={`ts-button ${bannedFilter === "false" ? "is-primary" : "is-outlined"}`}
          >
            正常
          </button>
          <button
            onClick={() => {
              setBannedFilter("true");
              setPage(1);
            }}
            className={`ts-button ${bannedFilter === "true" ? "is-primary" : "is-outlined"}`}
          >
            已封禁
          </button>
        </div>
      </div>

      {/* 批次操作列 */}
      {selectedUsers.size > 0 && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "var(--ts-gray-100)",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontWeight: 600 }}>已選擇 {selectedUsers.size} 位使用者</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => handleBatchBan("ban")}
              className="ts-button is-small is-negative"
              disabled={processing === "batch"}
            >
              批次封禁
            </button>
            <button
              onClick={() => handleBatchBan("unban")}
              className="ts-button is-small is-positive"
              disabled={processing === "batch"}
            >
              批次解封
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="ts-button is-small is-outlined"
            >
              取消選擇
            </button>
          </div>
        </div>
      )}

      {/* 使用者列表 */}
      {loading ? (
        <div>載入中...</div>
      ) : users.length === 0 ? (
        <div className="ts-box">
          <div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>
            沒有符合條件的使用者
          </div>
        </div>
      ) : (
        <>
          <div className="ts-box" style={{ overflowX: "auto" }}>
            <table className="ts-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.size === users.filter((u) => u.role !== "ADMIN").length &&
                        users.filter((u) => u.role !== "ADMIN").length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Email</th>
                  <th>角色</th>
                  <th>註冊時間</th>
                  <th>評論數</th>
                  <th>檢舉數</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr style={{ cursor: "pointer" }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        {user.role !== "ADMIN" && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                          />
                        )}
                      </td>
                      <td
                        onClick={() => fetchUserDetails(user.id)}
                        style={{ color: "var(--ts-primary-500)", fontWeight: 500 }}
                      >
                        {expandedUser === user.id ? "▼ " : "▶ "}
                        {user.email}
                      </td>
                      <td onClick={() => fetchUserDetails(user.id)}>
                        <span className={`ts-badge ${user.role === "ADMIN" ? "is-primary" : ""}`}>
                          {user.role === "ADMIN" ? "管理員" : "使用者"}
                        </span>
                      </td>
                      <td onClick={() => fetchUserDetails(user.id)}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td onClick={() => fetchUserDetails(user.id)}>{user._count.reviews}</td>
                      <td onClick={() => fetchUserDetails(user.id)}>{user._count.reports}</td>
                      <td onClick={() => fetchUserDetails(user.id)}>
                        {user.bannedAt ? (
                          <span className="ts-badge is-negative">已封禁</span>
                        ) : (
                          <span className="ts-badge is-positive">正常</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleBan(user.id, user.bannedAt ? "unban" : "ban")}
                            className={`ts-button is-small ${user.bannedAt ? "is-positive" : "is-negative"}`}
                            disabled={processing === user.id}
                          >
                            {user.bannedAt ? "解封" : "封禁"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ padding: "1.5rem", backgroundColor: "var(--ts-gray-50)" }}
                        >
                          {loadingDetails ? (
                            <div style={{ textAlign: "center", padding: "2rem" }}>
                              載入詳細資料中...
                            </div>
                          ) : userDetails ? (
                            <UserDetailsPanel details={userDetails} />
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ts-button is-outlined"
                disabled={page === 1}
              >
                上一頁
              </button>
              <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
                第 {page} / {totalPages} 頁
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="ts-button is-outlined"
                disabled={page === totalPages}
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserDetailsPanel({ details }: { details: UserDetails }) {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* 活動統計 */}
      <div>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>活動統計</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <StatBox label="評論總數" value={details.stats.totalReviews} />
          <StatBox
            label="顯示中"
            value={details.stats.activeReviews}
            color="var(--ts-positive-500)"
          />
          <StatBox
            label="已隱藏"
            value={details.stats.hiddenReviews}
            color="var(--ts-warning-500)"
          />
          <StatBox
            label="已移除"
            value={details.stats.removedReviews}
            color="var(--ts-negative-500)"
          />
          <StatBox label="獲得讚數" value={details.stats.totalHelpfulVotes} />
          <StatBox
            label="被檢舉次數"
            value={details.stats.totalReportsReceived}
            color="var(--ts-negative-500)"
          />
          <StatBox label="發出檢舉" value={details.stats.totalReportsMade} />
        </div>
      </div>

      {/* 活動圖表 */}
      {details.stats.totalReviews > 0 && <UserActivityChart userId={details.user.id} />}

      {/* 平均評分 */}
      {details.stats.totalReviews > 0 && (
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>平均評分</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatBox label="涼度" value={details.stats.averageRatings.coolness.toFixed(1)} />
            <StatBox label="實用性" value={details.stats.averageRatings.usefulness.toFixed(1)} />
            <StatBox label="作業量" value={details.stats.averageRatings.workload.toFixed(1)} />
            <StatBox label="點名" value={details.stats.averageRatings.attendance.toFixed(1)} />
            <StatBox label="給分" value={details.stats.averageRatings.grading.toFixed(1)} />
          </div>
        </div>
      )}

      {/* 評論列表 */}
      <div>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          評論列表 ({details.reviews.length})
        </h3>
        {details.reviews.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--app-muted)" }}>
            此使用者尚未發表任何評論
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" }}>
            {details.reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  padding: "1rem",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid var(--ts-gray-200)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.5rem",
                  }}
                >
                  <Link
                    href={`/courses/${review.course.id}`}
                    style={{
                      fontSize: "0.938rem",
                      fontWeight: 600,
                      color: "var(--ts-primary-500)",
                    }}
                  >
                    {review.course.courseName}
                  </Link>
                  <span
                    className={`ts-badge ${
                      review.status === "ACTIVE"
                        ? "is-positive"
                        : review.status === "HIDDEN"
                          ? "is-warning"
                          : "is-negative"
                    }`}
                  >
                    {review.status === "ACTIVE"
                      ? "顯示中"
                      : review.status === "HIDDEN"
                        ? "已隱藏"
                        : "已移除"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.813rem",
                    color: "var(--app-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {review.course.courseCode} | {new Date(review.createdAt).toLocaleDateString()}
                </div>
                {review.body && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.75rem",
                      backgroundColor: "var(--ts-gray-50)",
                      borderRadius: "4px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {review.body.substring(0, 100)}
                    {review.body.length > 100 ? "..." : ""}
                  </div>
                )}
                <div style={{ fontSize: "0.813rem", color: "var(--app-muted)" }}>
                  👍 {review._count.helpfulVotes} | 🚩 {review._count.reports}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 檢舉記錄 */}
      {(details.reportsReceived.length > 0 || details.reportsMade.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
              被檢舉記錄 ({details.reportsReceived.length})
            </h3>
            <div style={{ display: "grid", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
              {details.reportsReceived.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "var(--app-muted)",
                  }}
                >
                  無被檢舉記錄
                </div>
              ) : (
                details.reportsReceived.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "white",
                      borderRadius: "4px",
                      border: "1px solid var(--ts-gray-200)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                      {report.review.course.courseName}
                    </div>
                    <div style={{ color: "var(--app-muted)", fontSize: "0.813rem" }}>
                      {report.reason} | {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
              發出檢舉 ({details.reportsMade.length})
            </h3>
            <div style={{ display: "grid", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
              {details.reportsMade.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "var(--app-muted)",
                  }}
                >
                  無發出檢舉記錄
                </div>
              ) : (
                details.reportsMade.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "white",
                      borderRadius: "4px",
                      border: "1px solid var(--ts-gray-200)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                      {report.review.course.courseName}
                    </div>
                    <div style={{ color: "var(--app-muted)", fontSize: "0.813rem" }}>
                      {report.reason} | {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid var(--ts-gray-200)",
      }}
    >
      <div style={{ fontSize: "0.813rem", color: "var(--app-muted)", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "var(--ts-gray-800)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
