/**
 * 學期代碼對應表
 * 1: 第1學期
 * 2: 第2學期
 * 3: 韓修
 * 4: 暑修
 * 5: 先修學期
 * 6: 暑修（一）
 * 7+: 第n學期
 */
const TERM_LABELS: Record<string, string> = {
  "1": "第1學期",
  "2": "第2學期",
  "3": "韓修",
  "4": "暑修",
  "5": "先修學期",
  "6": "暑修（一）",
};

/**
 * 格式化學年學期顯示
 * 將 "114" 和 "1" 格式化為 "114學年度第1學期"
 */
export function formatSemester(year: string, term: string): string {
  const termLabel = formatTerm(term);
  return `${year}學年度${termLabel}`;
}

/**
 * 格式化學期（短格式）
 * 將 "1" 格式化為 "第1學期"，"3" 格式化為 "韓修" 等
 */
export function formatTerm(term: string): string {
  // 查找預定義的標籤
  if (term in TERM_LABELS) {
    return TERM_LABELS[term];
  }

  // 7 或更大的數字，使用 "第n學期"
  const termNum = parseInt(term, 10);
  if (!isNaN(termNum) && termNum >= 7) {
    return `第${term}學期`;
  }

  // 未知的學期代碼，直接返回
  return term;
}
