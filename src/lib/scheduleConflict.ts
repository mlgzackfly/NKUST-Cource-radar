/**
 * 模擬選課衝堂檢測演算法
 */

import { parseCourseTime } from "./courseTimeParser";
import type { SelectedCourse, ConflictMap } from "@/types/mockSchedule";

/**
 * 檢測兩門課程的上課時間是否衝突
 * @param time1 第一門課程的時間字串（如 "(一)2-4"）
 * @param time2 第二門課程的時間字串
 * @returns true 表示有衝堂，false 表示無衝堂
 */
export function hasTimeConflict(time1: string | null, time2: string | null): boolean {
  // 若任一課程無上課時間（如實習、專題），則不衝堂
  if (!time1 || !time2) return false;

  try {
    const slots1 = parseCourseTime(time1);
    const slots2 = parseCourseTime(time2);

    // 檢查所有時間槽，尋找相同星期且節次重疊的情況
    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        // 必須是同一天
        if (slot1.day === slot2.day) {
          // 檢查節次陣列是否有交集
          const hasOverlap = slot1.periods.some((period) => slot2.periods.includes(period));
          if (hasOverlap) return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("解析課程時間失敗:", error);
    return false;
  }
}

/**
 * 計算所有課程的衝堂關係
 * @param courses 已選課程陣列
 * @returns 衝堂關係映射表（courseId -> 衝突的其他 courseId 陣列）
 */
export function detectConflicts(courses: SelectedCourse[]): ConflictMap {
  const conflicts: ConflictMap = {};

  // 兩兩比較所有課程
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const course1 = courses[i];
      const course2 = courses[j];

      if (hasTimeConflict(course1.time, course2.time)) {
        // 建立雙向衝突關係
        if (!conflicts[course1.id]) conflicts[course1.id] = [];
        if (!conflicts[course2.id]) conflicts[course2.id] = [];

        conflicts[course1.id].push(course2.id);
        conflicts[course2.id].push(course1.id);
      }
    }
  }

  return conflicts;
}

/**
 * 產生衝堂警告訊息
 * @param courseId 課程 ID
 * @param conflicts 衝堂關係映射表
 * @param courses 所有課程資料（用於查找課程名稱）
 * @returns 衝堂警告訊息，若無衝堂則回傳 null
 */
export function getConflictMessage(
  courseId: string,
  conflicts: ConflictMap,
  courses: SelectedCourse[]
): string | null {
  const conflictIds = conflicts[courseId];
  if (!conflictIds || conflictIds.length === 0) return null;

  // 取得所有衝突課程的名稱
  const conflictNames = conflictIds
    .map((id) => courses.find((c) => c.id === id)?.courseName)
    .filter(Boolean);

  if (conflictNames.length === 0) return null;

  return `與 ${conflictNames.join("、")} 衝堂`;
}

/**
 * 取得總衝堂課程數量
 * @param conflicts 衝堂關係映射表
 * @returns 有衝堂的課程數量
 */
export function getConflictCount(conflicts: ConflictMap): number {
  return Object.keys(conflicts).length;
}

/**
 * 檢查某門課程是否有衝堂
 * @param courseId 課程 ID
 * @param conflicts 衝堂關係映射表
 * @returns true 表示有衝堂
 */
export function hasConflict(courseId: string, conflicts: ConflictMap): boolean {
  return Boolean(conflicts[courseId] && conflicts[courseId].length > 0);
}
