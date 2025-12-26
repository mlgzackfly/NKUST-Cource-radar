/**
 * 模擬選課 localStorage 管理工具
 */

import type { MockScheduleData, SelectedCourse } from "@/types/mockSchedule";

const STORAGE_KEY = "nkust-mock-schedule";
const CURRENT_VERSION = 1;

/**
 * 從 localStorage 讀取模擬選課資料
 */
export function loadSchedule(): MockScheduleData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as MockScheduleData;

    // 版本檢查（未來若有資料結構變更可進行遷移）
    if (data.version !== CURRENT_VERSION) {
      console.warn("localStorage 版本不符，將清空舊資料");
      clearSchedule();
      return null;
    }

    return data;
  } catch (error) {
    console.error("讀取模擬選課資料失敗:", error);
    return null;
  }
}

/**
 * 將模擬選課資料儲存至 localStorage
 */
export function saveSchedule(courses: SelectedCourse[]): void {
  if (typeof window === "undefined") return;

  try {
    const data: MockScheduleData = {
      version: CURRENT_VERSION,
      selectedCourses: courses,
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("儲存模擬選課資料失敗:", error);
    // localStorage 可能已滿或被禁用
    alert("儲存失敗，請檢查瀏覽器儲存空間或權限設定");
  }
}

/**
 * 清空所有模擬選課資料
 */
export function clearSchedule(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("清除模擬選課資料失敗:", error);
  }
}

/**
 * 取得目前選課的總學分數
 */
export function getTotalCredits(courses: SelectedCourse[]): number {
  return courses.reduce((sum, course) => sum + (course.credits || 0), 0);
}

/**
 * 檢查是否已選擇某門課程
 */
export function hasCourse(courses: SelectedCourse[], courseId: string): boolean {
  return courses.some((c) => c.id === courseId);
}
