/**
 * 共用的輸入驗證函數
 */

/**
 * 驗證評分數值（1-5）
 * @param value - 輸入值
 * @param fieldName - 欄位名稱（用於錯誤訊息）
 * @returns 驗證後的數值或 null
 * @throws Error 如果數值無效
 */
export function validateRating(
  value: any,
  fieldName: string
): number | null {
  // 允許 null/undefined（代表未評分）
  if (value === null || value === undefined) {
    return null;
  }

  // 轉換為數字
  const num = Number(value);

  // 檢查是否為有效數字
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }

  // 檢查範圍（1-5）
  if (num < 1 || num > 5) {
    throw new Error(`${fieldName} must be between 1 and 5`);
  }

  // 檢查是否為整數
  if (!Number.isInteger(num)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return num;
}

/**
 * 驗證文字長度
 * @param text - 輸入文字
 * @param maxLength - 最大長度
 * @param fieldName - 欄位名稱
 * @returns 處理後的文字或 null
 * @throws Error 如果超過最大長度
 */
export function validateText(
  text: string | null | undefined,
  maxLength: number,
  fieldName: string
): string | null {
  if (!text) return null;

  const trimmed = text.trim();

  if (trimmed.length > maxLength) {
    throw new Error(
      `${fieldName} exceeds maximum length of ${maxLength} characters`
    );
  }

  return trimmed || null;
}

/**
 * 驗證多個評分欄位
 * @returns 驗證後的評分物件
 */
export function validateReviewRatings(data: {
  coolness?: any;
  usefulness?: any;
  workload?: any;
  attendance?: any;
  grading?: any;
}) {
  const coolness = validateRating(data.coolness, "Coolness");
  const usefulness = validateRating(data.usefulness, "Usefulness");
  const workload = validateRating(data.workload, "Workload");
  const attendance = validateRating(data.attendance, "Attendance");
  const grading = validateRating(data.grading, "Grading");

  // 至少需要一個評分
  if (!coolness && !usefulness && !workload && !attendance && !grading) {
    throw new Error("At least one rating is required");
  }

  return { coolness, usefulness, workload, attendance, grading };
}
