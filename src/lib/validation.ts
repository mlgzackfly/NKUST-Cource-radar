/**
 * 共用的輸入驗證與安全處理函數
 */

/**
 * 清理文字輸入，移除潛在的 XSS 攻擊向量
 * @param text - 輸入文字
 * @returns 清理後的文字
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  // 移除 HTML 標籤
  let sanitized = text.replace(/<[^>]*>/g, "");

  // 轉義特殊字元
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 移除 JavaScript 事件處理器模式
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  // 移除 javascript: 協議
  sanitized = sanitized.replace(/javascript:/gi, "");

  // 移除 data: 協議（可能包含惡意內容）
  sanitized = sanitized.replace(/data:/gi, "");

  return sanitized;
}

/**
 * 安全清理並驗證文字輸入
 * @param text - 輸入文字
 * @param maxLength - 最大長度
 * @param fieldName - 欄位名稱
 * @returns 處理後的文字或 null
 */
export function sanitizeAndValidateText(
  text: string | null | undefined,
  maxLength: number,
  fieldName: string
): string | null {
  if (!text) return null;

  // 先清理再驗證
  const sanitized = sanitizeText(text.trim());

  if (sanitized.length > maxLength) {
    throw new Error(
      `${fieldName} exceeds maximum length of ${maxLength} characters`
    );
  }

  return sanitized || null;
}

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

/**
 * 驗證請求來源（CSRF 防護）
 * @param request - Request 物件
 * @returns 是否為合法請求
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // 開發環境允許所有請求
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // 生產環境檢查 origin 或 referer
  if (!origin && !referer) {
    // 可能是直接 API 調用（如 server-side）
    return true;
  }

  const allowedHosts = [
    "nkust.zeabur.app",
    "localhost",
    "127.0.0.1",
  ];

  // 檢查 origin
  if (origin) {
    try {
      const url = new URL(origin);
      if (allowedHosts.some((h) => url.hostname.includes(h))) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // 檢查 referer
  if (referer) {
    try {
      const url = new URL(referer);
      if (allowedHosts.some((h) => url.hostname.includes(h))) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 驗證請求方法
 * @param request - Request 物件
 * @param allowedMethods - 允許的方法列表
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[]
): boolean {
  return allowedMethods.includes(request.method);
}
