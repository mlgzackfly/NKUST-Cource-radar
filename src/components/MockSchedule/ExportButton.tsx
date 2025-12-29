"use client";

import { useState, type RefObject } from "react";
import html2canvas from "html2canvas";

type ExportButtonProps = {
  scheduleRef: RefObject<HTMLDivElement | null>;
};

export function ExportButton({ scheduleRef }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!scheduleRef.current) {
      alert("找不到課表元素");
      return;
    }

    try {
      setExporting(true);

      // 獲取背景色（支援 light/dark mode）
      const isDarkMode = document.documentElement.classList.contains("is-dark");
      const backgroundColor = isDarkMode ? "#1a1a1a" : "#ffffff";

      // 暫時設定固定寬度以確保完整顯示
      const element = scheduleRef.current;
      const originalWidth = element.style.width;
      const originalMinWidth = element.style.minWidth;
      element.style.width = "1200px";
      element.style.minWidth = "1200px";

      // 等待瀏覽器重新渲染
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 使用 html2canvas 渲染課表為圖片
      const canvas = await html2canvas(element, {
        backgroundColor,
        scale: 2, // 高解析度
        useCORS: true, // 允許跨域圖片
        logging: false, // 關閉除錯訊息
        width: 1200, // 固定寬度
      });

      // 恢復原本的寬度
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;

      // 下載圖片
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      link.download = `課表-${today}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("匯出失敗:", error);
      alert(`匯出失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button className="ts-button is-outlined" onClick={handleExport} disabled={exporting}>
      {exporting ? "匯出中..." : "匯出圖片"}
    </button>
  );
}
