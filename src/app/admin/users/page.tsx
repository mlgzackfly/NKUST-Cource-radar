"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  createdAt: string;
  bannedAt: string | null;
  role: string;
  _count: { reviews: number; reports: number };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string, action: "ban" | "unban") => {
    if (!confirm(`確定要${action === "ban" ? "封禁" : "解封"}此使用者嗎？`)) return;

    setProcessing(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
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

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>使用者管理</h1>

      {loading ? (
        <div>載入中...</div>
      ) : (
        <div className="ts-box">
          <table className="ts-table">
            <thead>
              <tr>
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
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <span className={`ts-badge ${user.role === "ADMIN" ? "is-primary" : ""}`}>
                      {user.role === "ADMIN" ? "管理員" : "使用者"}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>{user._count.reviews}</td>
                  <td>{user._count.reports}</td>
                  <td>
                    {user.bannedAt ? (
                      <span className="ts-badge is-negative">已封禁</span>
                    ) : (
                      <span className="ts-badge is-positive">正常</span>
                    )}
                  </td>
                  <td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
