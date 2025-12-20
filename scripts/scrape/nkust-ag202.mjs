import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { load } from "cheerio";
import { scrapeSyllabus } from "./nkust-ag064-syllabus.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL = "https://webap.nkust.edu.tw/nkust/ag_pro/ag202.jsp";
const execFileAsync = promisify(execFile);

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function splitList(v) {
  const raw = String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return raw;
}

function parseBool(v) {
  return v === "1" || v === "true" || v === "TRUE" || v === "yes" || v === "YES";
}

function isAllToken(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "ALL" || s === "*" || s === "ANY";
}

function splitYmsYms(ymsYms) {
  const [yearStr, termStr] = String(ymsYms).split("#");
  return {
    year: yearStr || "unknown",
    term: termStr || "unknown",
  };
}

function textOf($, el) {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function safeNumber(v) {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

async function fetchWithRetry(url, init, { retries = 3, backoffMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res;
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function isTlsCertError(err) {
  const code = err?.cause?.code || err?.code;
  const message = err?.message || "";

  // Check for various TLS/SSL certificate errors
  const tlsErrors = [
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
  ];

  // Also check if error message contains SSL/TLS/certificate keywords
  const isCertMessageError = /certificate|ssl|tls|cert/i.test(message);

  return tlsErrors.includes(code) || isCertMessageError;
}

async function fetchTextWithFallback(url, init) {
  // For NKUST website, directly use curl with -k to bypass SSL verification
  // since it consistently has SSL certificate issues
  if (url.includes("webap.nkust.edu.tw")) {
    const args = ["-fsSL", "-k"];
    if (init?.method && init.method.toUpperCase() !== "GET") {
      args.push("-X", init.method.toUpperCase());
    }
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        args.push("-H", `${k}: ${v}`);
      }
    }
    if (init?.body) {
      args.push("--data", String(init.body));
    }
    args.push(url);

    const { stdout } = await execFileAsync("curl", args, { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  }

  // For other URLs, try fetch first, then fallback to curl if TLS error
  try {
    const res = await fetchWithRetry(url, init);
    return await res.text();
  } catch (err) {
    if (!isTlsCertError(err)) throw err;
    // Fallback to system curl to avoid Node TLS chain issues on some environments.
    const args = ["-fsSL", "-k"];
    if (init?.method && init.method.toUpperCase() !== "GET") {
      args.push("-X", init.method.toUpperCase());
    }
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        args.push("-H", `${k}: ${v}`);
      }
    }
    if (init?.body) {
      args.push("--data", String(init.body));
    }
    args.push(url);

    const { stdout } = await execFileAsync("curl", args, { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  }
}

async function postAg202(paramsObj) {
  const body = new URLSearchParams(paramsObj).toString();
  return await fetchTextWithFallback(SOURCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

async function getAg202LandingHtml() {
  return await fetchTextWithFallback(SOURCE_URL, { method: "GET" });
}

function parseSelectOptions(html, selectId) {
  const $ = load(html);
  const options = [];
  $(`#${selectId} option`).each((_, opt) => {
    const value = ($(opt).attr("value") ?? "").trim();
    const label = textOf($, opt);
    options.push({ value, label });
  });
  return options;
}

function parseUnitOptions(html) {
  const $ = load(html);
  const options = [];
  $("#unt_id option").each((_, opt) => {
    const value = $(opt).attr("value") ?? "";
    const label = textOf($, opt);
    options.push({ value, label });
  });
  return options;
}

function parseSemesterOptions(html) {
  const $ = load(html);
  const options = [];
  $("#yms_yms option").each((_, opt) => {
    const value = $(opt).attr("value") ?? "";
    const label = textOf($, opt);
    if (value && value.includes("#")) {
      options.push({ value, label });
    }
  });
  return options;
}

function findResultTable($) {
  const tables = $("table").toArray();
  for (const table of tables) {
    const rows = $(table).find("tr").toArray();
    for (const row of rows) {
      const cells = $(row).find("th,td").toArray();
      const texts = cells.map((c) => textOf($, c));
      const hasSelectCode = texts.includes("選課代號");
      const hasCourseCode = texts.includes("永久課號");
      const hasCourseName = texts.includes("科目名稱");
      if (hasSelectCode && hasCourseCode && hasCourseName) {
        return { table, headerRow: row, headerTexts: texts };
      }
    }
  }
  return null;
}

const HEADER_TO_KEY = new Map([
  ["選課代號", "selectCode"],
  ["上課校區", "campus"],
  ["部別", "division"],
  ["科系", "department"],
  ["班級", "className"],
  ["合班班級", "combinedClassName"],
  ["永久課號", "courseCode"],
  ["科目名稱", "courseName"],
  ["學分", "credits"],
  ["授課時數", "lectureHours"],
  ["實習時數", "labHours"],
  ["必/選", "requiredOrElective"],
  ["授課教師", "instructor"],
  ["教室", "classroom"],
  ["修課人數", "enrolled"],
  ["人數上限", "capacity"],
  ["上課時間", "time"],
  ["全英語授課", "englishTaught"],
  ["遠距教學", "distanceLearning"],
  ["授課大綱", "syllabus"],
  ["備註", "note"],
]);

function parseSyllabusCell($, cell) {
  const onclick = $(cell).attr("onclick") || "";
  const m = onclick.match(/go_next\\('([^']*)','([^']*)','([^']*)'\\)/);
  if (!m) return null;
  return {
    action: "ag064_print.jsp",
    arg01: m[1],
    arg02: m[2],
    arg04: m[3],
  };
}

function normalizeRow(rowObj) {
  // basic numeric casting
  const out = { ...rowObj };
  for (const k of ["credits", "lectureHours", "labHours", "enrolled", "capacity"]) {
    if (out[k] !== undefined && out[k] !== null && out[k] !== "") out[k] = safeNumber(out[k]);
  }
  return out;
}

function parseCoursesFromHtml(html) {
  const $ = load(html);
  const found = findResultTable($);
  if (!found) return { courses: [], header: null, warning: "RESULT_TABLE_NOT_FOUND" };

  const { table, headerRow, headerTexts } = found;
  const headerKeys = headerTexts.map((h) => HEADER_TO_KEY.get(h) || null);

  const rows = $(table).find("tr").toArray();
  const headerIdx = rows.indexOf(headerRow);
  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;

  const courses = [];
  for (const r of dataRows) {
    const tds = $(r).find("td").toArray();
    if (tds.length === 0) continue;
    if (tds.length < headerTexts.length) continue;

    const obj = {};
    for (let i = 0; i < headerTexts.length; i += 1) {
      const key = headerKeys[i];
      if (!key) continue;
      const cell = tds[i];
      if (key === "syllabus") {
        obj[key] = parseSyllabusCell($, cell);
      } else {
        obj[key] = textOf($, cell);
      }
    }
    courses.push(normalizeRow(obj));
  }

  return { courses, header: headerTexts, warning: null };
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function scrapeSemester(ymsYms, options) {
  const { cmpAreaRaw, dgrRaw, unitId, scrapeAllUnits, scrapeSyllabusEnabled, clyear, week, period } = options;
  const { year, term } = splitYmsYms(ymsYms);

  const landingHtml = await getAg202LandingHtml();
  const cmpAreaOptions = parseSelectOptions(landingHtml, "cmp_area_id").filter((o) => o.value !== "");
  const dgrOptions = parseSelectOptions(landingHtml, "dgr_id").filter((o) => o.value !== "");

  let campusIds = isAllToken(cmpAreaRaw) ? cmpAreaOptions.map((o) => o.value) : splitList(cmpAreaRaw);
  // The UI's "0=全校區" option may not return the same result table format consistently.
  // Treat it as "all physical campuses" for stable scraping.
  if (campusIds.length === 1 && campusIds[0] === "0") {
    campusIds = cmpAreaOptions.map((o) => o.value).filter((v) => v !== "0");
  }
  const dgrIds = isAllToken(dgrRaw) ? dgrOptions.map((o) => o.value) : splitList(dgrRaw);

  if (campusIds.length === 0) throw new Error("No campus ids selected. Set NKUST_CMP_AREA_ID.");
  if (dgrIds.length === 0) throw new Error("No degree ids selected. Set NKUST_DGR_ID.");

  const runIndex = {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    params: { ymsYms, clyear, week, period },
    campuses: [],
  };

  for (const cmpAreaId of campusIds) {
    const campusEntry = { id: cmpAreaId, degrees: [] };

    for (const dgrId of dgrIds) {
      const outputRoot = path.resolve(__dirname, "../../data/nkust/ag202", year, term, cmpAreaId, dgrId);

      let units = [];
      if (scrapeAllUnits || !unitId) {
        const html = await postAg202({
          yms_yms: ymsYms,
          cmp_area_id: cmpAreaId,
          dgr_id: dgrId,
          unt_id: "",
          clyear,
          week,
          period,
          sub_name: "",
          teacher: "",
          reading: "",
        });
        units = parseUnitOptions(html)
          .filter((u) => u.value && u.value !== "")
          .map((u) => ({ ...u, value: u.value.trim() }));
      } else {
        units = [{ value: unitId, label: unitId }];
      }

      const index = {
        scrapedAt: new Date().toISOString(),
        sourceUrl: SOURCE_URL,
        params: { ymsYms, cmpAreaId, dgrId, clyear, week, period },
        units: [],
      };

      for (const u of units) {
        const html = await postAg202({
          yms_yms: ymsYms,
          cmp_area_id: cmpAreaId,
          dgr_id: dgrId,
          unt_id: u.value,
          clyear,
          week,
          period,
          sub_name: "",
          teacher: "",
          reading: "reading",
        });

        const parsed = parseCoursesFromHtml(html);

        // Fetch syllabus for each course if enabled
        if (scrapeSyllabusEnabled) {
          console.log(`Scraping syllabi for ${parsed.courses.length} courses...`);
          for (const course of parsed.courses) {
            if (course.syllabus) {
              try {
                const syllabusData = await scrapeSyllabus(course.syllabus);
                course.syllabusData = syllabusData;
                // Add a small delay to avoid overwhelming the server
                await new Promise(r => setTimeout(r, 500));
              } catch (err) {
                console.error(`Failed to scrape syllabus for ${course.courseName}:`, err.message);
              }
            }
          }
        }

        const payload = {
          scrapedAt: new Date().toISOString(),
          sourceUrl: SOURCE_URL,
          request: {
            yms_yms: ymsYms,
            cmp_area_id: cmpAreaId,
            dgr_id: dgrId,
            unt_id: u.value,
            clyear,
            week,
            period,
            reading: "reading",
          },
          unit: { id: u.value, label: u.label },
          warning: parsed.warning,
          header: parsed.header,
          courses: parsed.courses,
        };

        const outPath = path.join(outputRoot, `${u.value}.json`);
        await writeJson(outPath, payload);

        index.units.push({
          id: u.value,
          label: u.label,
          courses: parsed.courses.length,
          file: path.relative(path.resolve(__dirname, "../../"), outPath),
        });
      }

      await writeJson(path.join(outputRoot, "index.json"), index);
      campusEntry.degrees.push({
        id: dgrId,
        units: index.units.length,
        courses: index.units.reduce((sum, u) => sum + (u.courses || 0), 0),
        indexFile: path.relative(path.resolve(__dirname, "../../"), path.join(outputRoot, "index.json")),
      });
    }

    runIndex.campuses.push(campusEntry);
  }

  await writeJson(path.resolve(__dirname, "../../data/nkust/ag202", year, term, "index.json"), runIndex);

  // useful stdout summary for CI logs
  // eslint-disable-next-line no-console
  console.log(
    `Scraped ${runIndex.campuses.length} campus(es), ${dgrIds.length} degree(s) into data/nkust/ag202/${year}/${term}`,
  );
}

async function main() {
  const ymsYmsRaw = env("NKUST_AG202_YMS_YMS", "") || env("NKUST_YMS_YMS", "114#1");
  const cmpAreaRaw = env("NKUST_CMP_AREA_ID", "0");
  const dgrRaw = env("NKUST_DGR_ID", "ALL");
  const unitId = env("NKUST_UNT_ID", "");

  const scrapeAllUnits = parseBool(env("NKUST_SCRAPE_ALL_UNITS", "0"));
  const scrapeSyllabusEnabled = parseBool(env("NKUST_SCRAPE_SYLLABUS", "0"));

  const clyear = env("NKUST_CLYEAR", "%");
  const week = env("NKUST_WEEK", "%");
  const period = env("NKUST_PERIOD", "%");

  const options = {
    cmpAreaRaw,
    dgrRaw,
    unitId,
    scrapeAllUnits,
    scrapeSyllabusEnabled,
    clyear,
    week,
    period,
  };

  // Check if user wants to scrape all semesters
  if (isAllToken(ymsYmsRaw)) {
    console.log("Detecting all available semesters...");
    const landingHtml = await getAg202LandingHtml();
    const semesterOptions = parseSemesterOptions(landingHtml);

    console.log(`Found ${semesterOptions.length} semesters to scrape`);
    console.log(`Semesters: ${semesterOptions.map(s => s.value).join(", ")}`);

    for (let i = 0; i < semesterOptions.length; i++) {
      const semester = semesterOptions[i];
      console.log(`\n[${i + 1}/${semesterOptions.length}] Scraping semester ${semester.value} (${semester.label})...`);

      try {
        await scrapeSemester(semester.value, options);
      } catch (err) {
        console.error(`Failed to scrape semester ${semester.value}:`, err.message);
        // Continue with next semester instead of failing entirely
      }

      // Add delay between semesters to avoid overwhelming the server
      if (i < semesterOptions.length - 1) {
        console.log("Waiting 2 seconds before next semester...");
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log("\nAll semesters scraping completed!");
  } else {
    // Scrape single semester
    await scrapeSemester(ymsYmsRaw, options);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});


