"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  createdAt: string;
  status: string;
  reason: string;
  user: { email: string };
  review: {
    id: string;
    body: string | null;
    user: { email: string };
    course: { id: string; courseName: string; courseCode: string };
  };
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reportId: string, action: "resolve" | "reject") => {
    if (!confirm(`確定要${action === "resolve" ? "解決" : "拒絕"}此檢舉嗎？`)) return;

    setProcessing(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        alert("操作成功");
        fetchReports();
      } else {
        alert("操作失敗");
      }
    } catch (error) {
      console.error("Failed to handle report:", error);
      alert("操作失敗");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>檢舉管理</h1>

      {/* 篩選器 */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setFilter("")}
          className={`ts-button ${!filter ? "is-primary" : "is-outlined"}`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter("OPEN")}
          className={`ts-button ${filter === "OPEN" ? "is-primary" : "is-outlined"}`}
        >
          待處理
        </button>
        <button
          onClick={() => setFilter("RESOLVED")}
          className={`ts-button ${filter === "RESOLVED" ? "is-primary" : "is-outlined"}`}
        >
          已解決
        </button>
        <button
          onClick={() => setFilter("REJECTED")}
          className={`ts-button ${filter === "REJECTED" ? "is-primary" : "is-outlined"}`}
        >
          已拒絕
        </button>
      </div>

      {loading ? (
        <div>載入中...</div>
      ) : reports.length === 0 ? (
        <div className="ts-box"><div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>沒有檢舉記錄</div></div>
      ) : (
        <div className="ts-box">
          <table className="ts-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>課程</th>
                <th>檢舉者</th>
                <th>評論作者</th>
                <th>理由</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/courses/${report.review.course.id}`} style={{ color: "var(--ts-primary-500)" }}>
                      {report.review.course.courseName}
                    </Link>
                  </td>
                  <td style={{ fontSize: "0.875rem" }}>{report.user.email}</td>
                  <td style={{ fontSize: "0.875rem" }}>{report.review.user.email}</td>
                  <td>{report.reason}</td>
                  <td>
                    <span className={`ts-badge ${report.status === "OPEN" ? "is-negative" : "is-positive"}`}>
                      {report.status === "OPEN" ? "待處理" : report.status === "RESOLVED" ? "已解決" : "已拒絕"}
                    </span>
                  </td>
                  <td>
                    {report.status === "OPEN" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleReport(report.id, "resolve")}
                          className="ts-button is-small is-positive"
                          disabled={processing === report.id}
                        >
                          解決
                        </button>
                        <button
                          onClick={() => handleReport(report.id, "reject")}
                          className="ts-button is-small is-outlined"
                          disabled={processing === report.id}
                        >
                          拒絕
                        </button>
                      </div>
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
