import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://stdsys.nkust.edu.tw";
const QUERY_URL = `${BASE_URL}/Student/Course/QueryCourse/Query`;
const PAGE_URL = `${BASE_URL}/Student/Course/QueryCourse`;
const PROGRAM_URL = `${BASE_URL}/Student/DDLCode/ProgramCode/GetProgramCodeList/?fgShowAll=False&fgEnable=False&fgShowCode=False&fgFilterByRole=False&fgSchoolAllQuery=False`;

const PAGE_SIZE = 50;
const REQUEST_DELAY_MS = 300;

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function parseBool(v) {
  return v === "1" || v === "true" || v === "yes";
}

function isAllToken(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "ALL" || s === "*" || s === "ANY";
}

function splitList(v) {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

class StdsysClient {
  constructor() {
    this.cookies = new Map();
    this.xsrfToken = null;
  }

  parseCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const headers = Array.isArray(setCookieHeaders)
      ? setCookieHeaders
      : [setCookieHeaders];
    for (const header of headers) {
      const parts = header.split(";")[0].split("=");
      const name = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      this.cookies.set(name, value);
      if (name === "XSRF-TOKEN") {
        this.xsrfToken = decodeURIComponent(value);
      }
    }
  }

  cookieString() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async initSession() {
    const res = await fetch(PAGE_URL, { redirect: "follow" });
    const setCookies = res.headers.getSetCookie?.() || [];
    this.parseCookies(setCookies);
    if (!this.xsrfToken) {
      const raw = res.headers.get("set-cookie") || "";
      const m = raw.match(/XSRF-TOKEN=([^;]+)/);
      if (m) this.xsrfToken = decodeURIComponent(m[1]);
    }
    await res.text();
  }

  async fetchJson(url, params) {
    const body = new URLSearchParams(params).toString();
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Referer: PAGE_URL,
      Cookie: this.cookieString(),
    };
    if (this.xsrfToken) {
      headers["X-XSRF-TOKEN"] = this.xsrfToken;
    }

    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  }

  async fetchGet(url) {
    const headers = {
      Accept: "application/json",
      Cookie: this.cookieString(),
    };
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  }

  async queryPage(queryParams, page, pageSize) {
    const params = {
      ...queryParams,
      page: String(page),
      pageSize: String(pageSize),
      take: String(pageSize),
      skip: String((page - 1) * pageSize),
    };
    return await this.fetchJson(QUERY_URL, params);
  }

  async queryAll(queryParams) {
    const allData = [];
    let page = 1;
    let total = 0;

    while (true) {
      const result = await this.queryPage(queryParams, page, PAGE_SIZE);
      if (result.Errors) throw new Error(`API Error: ${result.Errors}`);

      total = result.Total;
      const data = result.Data || [];
      allData.push(...data);

      console.log(`  Page ${page}: ${data.length} courses (${allData.length}/${total})`);

      if (allData.length >= total || data.length === 0) break;
      page += 1;
      await delay(REQUEST_DELAY_MS);
    }

    return { courses: allData, total };
  }

  async getProgramList() {
    return await this.fetchGet(PROGRAM_URL);
  }
}

function mapSelectType(v) {
  if (v === "M") return "必修";
  if (v === "O") return "選修";
  return v || null;
}

function transformCourse(item) {
  const joinClass = item.JoinCmClass || {};
  const program = joinClass.CmProgram || {};
  const unit = joinClass.CmUnit || {};
  const dept = unit.CmDept || {};

  return {
    id: item.Id,
    selectCode: item.Crsno || null,
    courseCode: item.PerCrsno || null,
    courseName: item.SubjectName,
    campus: item.CampusName || null,
    campusId: item.CampusId != null ? String(item.CampusId) : null,
    division: program.ProgramName || null,
    programId: joinClass.ProgramId || null,
    department: dept.DeptName || null,
    deptId: dept.DeptId || null,
    unitName: unit.UnitName || null,
    unitId: item.UnitId || null,
    className: item.ClassText || null,
    classId: item.ClassId || null,
    credits: item.Credit ?? null,
    lectureHours: item.ClassHours ?? null,
    labHours: item.InternshipHours ?? null,
    requiredOrElective: mapSelectType(item.SelectType),
    instructor: item.TeacherText || null,
    classroom: item.RoomText || null,
    time: item.TimeText || null,
    enrolled: item.SelectNum ?? null,
    capacity: item.SelectLimitNum ?? null,
    englishTaught: item.IsAllEnglish === "Y" ? "是" : null,
    note: item.Remarks?.trim() || null,
    combinedClassName: item.JoinText || null,
  };
}

async function scrapeSemester(client, year, term, options) {
  const { programIds } = options;
  const outputRoot = path.resolve(__dirname, "../../data/nkust/stdsys", String(year), String(term));

  const queryParams = {
    SchoolYear_Query: String(year),
    Semester_Query: String(term),
    CampusId_Query: "",
    ProgramId_Query: "",
    DeptId_Query: "",
    UnitId_Query: "",
    ClassYear_Query: "",
    ClassSeq_Query: "",
    Keyword_Query: "",
  };

  if (programIds && programIds.length > 0) {
    const index = {
      scrapedAt: new Date().toISOString(),
      sourceUrl: QUERY_URL,
      year,
      term,
      programs: [],
    };

    for (const pid of programIds) {
      const params = { ...queryParams, ProgramId_Query: pid };
      console.log(`Scraping year=${year} term=${term} programId=${pid}...`);

      const { courses, total } = await client.queryAll(params);
      const transformed = courses.map(transformCourse);

      const payload = {
        scrapedAt: new Date().toISOString(),
        sourceUrl: QUERY_URL,
        request: { year, term, programId: pid },
        total,
        courses: transformed,
      };

      const outPath = path.join(outputRoot, `${pid}.json`);
      await writeJson(outPath, payload);

      index.programs.push({
        id: pid,
        courses: transformed.length,
        file: path.relative(path.resolve(__dirname, "../../"), outPath),
      });

      await delay(500);
    }

    await writeJson(path.join(outputRoot, "index.json"), index);
    const totalCourses = index.programs.reduce((s, p) => s + p.courses, 0);
    console.log(`Scraped ${index.programs.length} program(s), ${totalCourses} courses -> data/nkust/stdsys/${year}/${term}`);
  } else {
    console.log(`Scraping year=${year} term=${term} (all programs)...`);
    const { courses, total } = await client.queryAll(queryParams);
    const transformed = courses.map(transformCourse);

    const payload = {
      scrapedAt: new Date().toISOString(),
      sourceUrl: QUERY_URL,
      request: { year, term },
      total,
      courses: transformed,
    };

    const outPath = path.join(outputRoot, "all.json");
    await writeJson(outPath, payload);

    const index = {
      scrapedAt: new Date().toISOString(),
      sourceUrl: QUERY_URL,
      year,
      term,
      programs: [
        {
          id: "all",
          courses: transformed.length,
          file: path.relative(path.resolve(__dirname, "../../"), outPath),
        },
      ],
    };
    await writeJson(path.join(outputRoot, "index.json"), index);
    console.log(`Scraped ${transformed.length} courses -> data/nkust/stdsys/${year}/${term}`);
  }
}

async function main() {
  const year = env("NKUST_YEAR", "114");
  const term = env("NKUST_TERM", "1");
  const programRaw = env("NKUST_PROGRAM_ID", "");
  const scrapeAllPrograms = parseBool(env("NKUST_SCRAPE_ALL_PROGRAMS", "0"));

  const client = new StdsysClient();
  console.log("Initializing session...");
  await client.initSession();
  console.log("Session ready.");

  let programIds = null;
  if (scrapeAllPrograms || isAllToken(programRaw)) {
    const programs = await client.getProgramList();
    const active = programs.filter((p) => p.group === "使用中");
    programIds = active.map((p) => p.value);
    console.log(`Found ${programIds.length} active programs: ${programIds.join(", ")}`);
  } else if (programRaw) {
    programIds = splitList(programRaw);
  }

  const years = splitList(year);
  const terms = splitList(term);

  for (const y of years) {
    for (const t of terms) {
      try {
        await scrapeSemester(client, y, t, { programIds });
      } catch (err) {
        console.error(`Failed to scrape year=${y} term=${t}:`, err.message);
      }
      await delay(1000);
    }
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
