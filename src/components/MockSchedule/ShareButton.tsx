"use client";

import { useState } from "react";
import type { SelectedCourse } from "@/types/mockSchedule";

type ShareButtonProps = {
  selectedCourses: SelectedCourse[];
};

export function ShareButton({ selectedCourses }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (selectedCourses.length === 0) {
      alert("尚未選擇任何課程");
      return;
    }

    try {
      const courseIds = selectedCourses.map((c) => c.id).join(",");
      const url = `${window.location.origin}/mock-schedule?courses=${courseIds}`;

      // 檢查 URL 長度
      if (url.length > 1800) {
        if (!confirm(`URL 過長（${url.length} 字元），可能在某些平台無法正常分享。是否繼續？`)) {
          return;
        }
      }

      // 複製到剪貼簿
      await navigator.clipboard.writeText(url);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("複製失敗:", error);

      // 降級方案：使用 prompt 讓使用者手動複製
      const courseIds = selectedCourses.map((c) => c.id).join(",");
      const url = `${window.location.origin}/mock-schedule?courses=${courseIds}`;
      prompt("請複製以下連結分享給朋友：", url);
    }
  };

  return (
    <button
      className="ts-button is-outlined"
      onClick={handleShare}
      disabled={selectedCourses.length === 0 || copied}
    >
      {copied ? "已複製！" : "分享課表"}
    </button>
  );
}
