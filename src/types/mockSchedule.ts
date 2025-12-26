/**
 * 模擬選課系統型別定義
 */

/**
 * 已選課程資料（儲存於 localStorage）
 */
export interface SelectedCourse {
  id: string;
  courseName: string;
  credits: number | null;
  time: string | null;
  instructorNames: string[];
  department: string | null;
  year: string;
  term: string;
  classroom: string | null;
}

/**
 * localStorage 儲存的完整資料結構
 */
export interface MockScheduleData {
  version: number;
  selectedCourses: SelectedCourse[];
  metadata: {
    lastUpdated: string; // ISO timestamp
    currentSemester?: {
      year: string;
      term: string;
    };
  };
}

/**
 * 衝堂關係映射表
 * key: courseId, value: 與之衝堂的其他 courseId 陣列
 */
export interface ConflictMap {
  [courseId: string]: string[];
}

/**
 * 從完整 Course 型別提取必要欄位建立 SelectedCourse
 */
export interface CourseForSelection {
  id: string;
  courseName: string;
  credits: number | null;
  time: string | null;
  department: string | null;
  year: string;
  term: string;
  classroom: string | null;
  instructors: Array<{
    id: string;
    name: string;
  }>;
}
