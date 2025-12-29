"use client";

import { useEffect, useState } from "react";

type AdminAction = {
  id: string;
  createdAt: string;
  type: string;
  note: string | null;
  actor: { email: string };
  targetUser: { email: string } | null;
  targetReview: {
    id: string;
    course: { courseName: string };
  } | null;
};

export default function ActionsPage() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions");
      const data = await res.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error("Failed to fetch actions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      HIDE_REVIEW: "隱藏評論",
      UNHIDE_REVIEW: "恢復評論",
      REMOVE_REVIEW: "移除評論",
      BAN_USER: "封禁/解封使用者",
      REQUEST_EDIT: "處理檢舉",
    };
    return labels[type] || type;
  };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>操作記錄</h1>

      {loading ? (
        <div>載入中...</div>
      ) : actions.length === 0 ? (
        <div className="ts-box">
          <div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>
            無操作記錄
          </div>
        </div>
      ) : (
        <div className="ts-box">
          <table className="ts-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>操作者</th>
                <th>操作類型</th>
                <th>目標</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{new Date(action.createdAt).toLocaleString()}</td>
                  <td style={{ fontSize: "0.875rem" }}>{action.actor.email}</td>
                  <td>
                    <span className="ts-badge is-outlined">{getActionLabel(action.type)}</span>
                  </td>
                  <td>
                    {action.targetUser && <div>使用者: {action.targetUser.email}</div>}
                    {action.targetReview && (
                      <div>評論: {action.targetReview.course.courseName}</div>
                    )}
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
                    {action.note || "-"}
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
