"use client";

import { useState } from "react";

export default function ReviewsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>評論管理</h1>

      <div className="ts-box">
        <div className="ts-content" style={{ padding: "2rem", textAlign: "center", color: "var(--app-muted)" }}>
          評論管理功能開發中<br />
          目前可透過檢舉管理查看並處理被檢舉的評論
        </div>
      </div>
    </div>
  );
}
