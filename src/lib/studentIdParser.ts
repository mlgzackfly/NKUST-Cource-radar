/**
 * 高科大學號解析器
 *
 * 學號格式：[學制][入學年度3碼][學部][系所2碼][班級][座號2碼]
 * 範例：C109193108 → 四技、109學年、日間部、商務資訊應用系、甲班、08號
 */

export interface StudentIdInfo {
  isValid: boolean;
  raw: string;
  programType: string | null; // 學制
  programCode: string | null; // 學制代碼
  enrollmentYear: number | null; // 入學年度
  division: string | null; // 學部
  divisionCode: string | null; // 學部代碼
  department: string | null; // 系所名稱
  departmentCode: string | null; // 系所代碼
  classNumber: number | null; // 班級
  seatNumber: number | null; // 座號
}

// 學制代碼對照表
const PROGRAM_TYPES: Record<string, string> = {
  A: "五專",
  B: "二技",
  C: "四技",
  D: "產學專班",
  F: "碩士班",
  I: "博士班",
  J: "碩專班",
};

// 學部代碼對照表
const DIVISIONS: Record<string, string> = {
  "1": "日間部",
  "2": "進修部",
  "3": "進修學院",
};

// 系所代碼對照表（根據校區/學院整理）
const DEPARTMENTS: Record<string, string> = {
  // 工學院（建工校區）
  "41": "土木工程系",
  "42": "機械工程系",
  "43": "工業工程與管理系",
  "46": "化學工程與材料工程系",
  "47": "模具工程系",

  // 電資學院（建工校區）
  "51": "資訊工程系",
  "52": "電子工程系",
  "53": "光電與通訊工程研究所",
  "54": "電機工程系",

  // 管理學院（燕巢校區）
  "56": "資訊管理系",
  "57": "企業管理系",
  "59": "國際企業系",
  "60": "觀光管理系",
  "61": "金融資訊系",
  "62": "財務管理系",
  "63": "會計資訊系",
  "93": "商務資訊應用系",

  // 人文社會學院（燕巢校區）
  "64": "人力資源發展系",
  "65": "文化創意產業系",
  "66": "應用外語系",

  // 外語學院（第一校區）
  "32": "口筆譯碩士班",
  "33": "應用英語系",
  "34": "應用日語系",

  // 管理學院（第一校區）
  "13": "行銷與流通管理系",
  "14": "連鎖加盟管理碩士班",
  "15": "運籌管理系",
  "16": "運籌企研班",
  "17": "科技法律研究所",
  "18": "資訊管理系（第一校區）",
  "21": "國際管理碩士學位學程",
  "22": "創業管理碩士學位學程",

  // 工學院（第一校區）
  "01": "創意設計與建築系",
  "03": "先進製造科技碩士班",
  "04": "機械工程系自動化組",
  "05": "機械工程系精密機械組",
  "06": "營建工程系",
  "07": "環境與安全衛生工程系",

  // 電資學院（第一校區）
  "10": "電腦與通訊系",
  "11": "電機工程研究所",
  "12": "電子工程系（第一校區）",

  // 財金學院（第一校區）
  "25": "金融系",
  "26": "財務管理系（第一校區）",
  "29": "會計資訊系（第一校區）",
  "30": "風險管理與保險系",
};

// 系所類別對照表（用於推薦系統）
export const DEPARTMENT_CATEGORIES: Record<string, string[]> = {
  資訊類: ["51", "56", "18", "10", "93"],
  電機電子類: ["52", "53", "54", "11", "12"],
  機械類: ["42", "04", "05", "47"],
  土木營建類: ["41", "06", "01"],
  管理類: ["57", "59", "13", "15", "16", "21", "22", "14"],
  財金類: ["61", "62", "25", "26", "29", "30", "63"],
  人文外語類: ["64", "65", "66", "32", "33", "34"],
  工程類: ["43", "46", "07", "03"],
};

/**
 * 解析學號
 */
export function parseStudentId(studentId: string): StudentIdInfo {
  const result: StudentIdInfo = {
    isValid: false,
    raw: studentId,
    programType: null,
    programCode: null,
    enrollmentYear: null,
    division: null,
    divisionCode: null,
    department: null,
    departmentCode: null,
    classNumber: null,
    seatNumber: null,
  };

  // 移除空白並轉大寫
  const id = studentId.trim().toUpperCase();

  // 檢查長度（9-10 碼）
  if (id.length < 9 || id.length > 10) {
    return result;
  }

  // 解析各欄位
  const programCode = id.charAt(0);
  const yearStr = id.substring(1, 4);
  const divisionCode = id.charAt(4);
  const deptCode = id.substring(5, 7);
  const classStr = id.charAt(7);
  const seatStr = id.substring(8);

  // 驗證學制代碼
  if (!PROGRAM_TYPES[programCode]) {
    return result;
  }

  // 驗證年度（數字）
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 90 || year > 130) {
    return result;
  }

  // 驗證學部代碼
  if (!DIVISIONS[divisionCode]) {
    return result;
  }

  // 驗證班級（數字）
  const classNumber = parseInt(classStr, 10);
  if (isNaN(classNumber)) {
    return result;
  }

  // 驗證座號（數字）
  const seatNumber = parseInt(seatStr, 10);
  if (isNaN(seatNumber)) {
    return result;
  }

  // 填入結果
  result.isValid = true;
  result.programCode = programCode;
  result.programType = PROGRAM_TYPES[programCode];
  result.enrollmentYear = year;
  result.divisionCode = divisionCode;
  result.division = DIVISIONS[divisionCode];
  result.departmentCode = deptCode;
  result.department = DEPARTMENTS[deptCode] || null;
  result.classNumber = classNumber;
  result.seatNumber = seatNumber;

  return result;
}

/**
 * 從 email 解析學號資訊
 */
export function parseStudentIdFromEmail(email: string): StudentIdInfo | null {
  if (!email || !email.includes("@")) {
    return null;
  }

  const localPart = email.split("@")[0];
  return parseStudentId(localPart);
}

/**
 * 取得系所類別
 */
export function getDepartmentCategory(deptCode: string): string | null {
  for (const [category, codes] of Object.entries(DEPARTMENT_CATEGORIES)) {
    if (codes.includes(deptCode)) {
      return category;
    }
  }
  return null;
}

/**
 * 取得同類別的系所代碼
 */
export function getRelatedDepartments(deptCode: string): string[] {
  const category = getDepartmentCategory(deptCode);
  if (!category) {
    return [];
  }
  return DEPARTMENT_CATEGORIES[category].filter((code) => code !== deptCode);
}

/**
 * 取得系所名稱
 */
export function getDepartmentName(deptCode: string): string | null {
  return DEPARTMENTS[deptCode] || null;
}

/**
 * 取得所有系所代碼和名稱
 */
export function getAllDepartments(): Array<{ code: string; name: string }> {
  return Object.entries(DEPARTMENTS).map(([code, name]) => ({ code, name }));
}
