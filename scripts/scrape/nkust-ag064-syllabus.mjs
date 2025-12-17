import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { load } from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYLLABUS_BASE_URL = "https://webap.nkust.edu.tw/nkust/ag_pro/ag064_print.jsp";
const execFileAsync = promisify(execFile);

function isTlsCertError(err) {
  const code = err?.cause?.code || err?.code;
  return code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
}

async function fetchTextWithFallback(url, init) {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (!isTlsCertError(err)) throw err;
    // Fallback to system curl
    const args = ["-fsSL"];
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

async function fetchSyllabus(arg01, arg02, arg04) {
  const body = new URLSearchParams({
    arg01,
    arg02,
    arg04
  }).toString();

  return await fetchTextWithFallback(SYLLABUS_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

function textOf($, el) {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function parseSyllabusHtml(html) {
  const $ = load(html);
  const data = {};

  // Find all tables
  const tables = $("table").toArray();

  for (const table of tables) {
    $(table).find("tr").each((_, row) => {
      const cells = $(row).find("td").toArray();
      if (cells.length >= 2) {
        const label = textOf($, cells[0]).replace(/[:：]$/, "").trim();
        const value = textOf($, cells[1]);

        if (label && value) {
          // Map common fields
          const fieldMap = {
            "科目名稱": "courseName",
            "英文名稱": "courseNameEn",
            "授課教師": "instructor",
            "開課系所": "department",
            "學分數": "credits",
            "必選修": "requiredOrElective",
            "開課年級": "grade",
            "先修科目": "prerequisites",
            "課程目標": "objectives",
            "課程大綱": "outline",
            "授課方式": "teachingMethod",
            "評量方式": "evaluation",
            "指定用書": "textbooks",
            "參考書籍": "references",
            "備註": "notes"
          };

          const key = fieldMap[label] || label;
          data[key] = value;
        }
      }
    });
  }

  return data;
}

export async function scrapeSyllabus(syllabusInfo) {
  if (!syllabusInfo || !syllabusInfo.arg01 || !syllabusInfo.arg02 || !syllabusInfo.arg04) {
    return null;
  }

  try {
    const html = await fetchSyllabus(
      syllabusInfo.arg01,
      syllabusInfo.arg02,
      syllabusInfo.arg04
    );

    const parsedData = parseSyllabusHtml(html);

    return {
      url: `${SYLLABUS_BASE_URL}?arg01=${syllabusInfo.arg01}&arg02=${syllabusInfo.arg02}&arg04=${syllabusInfo.arg04}`,
      html,
      data: parsedData,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to scrape syllabus:`, error.message);
    return null;
  }
}

// For standalone testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg01 = process.argv[2];
  const arg02 = process.argv[3];
  const arg04 = process.argv[4];

  if (!arg01 || !arg02 || !arg04) {
    console.error("Usage: node nkust-ag064-syllabus.mjs <arg01> <arg02> <arg04>");
    process.exit(1);
  }

  const result = await scrapeSyllabus({ arg01, arg02, arg04 });
  if (result) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("Failed to fetch syllabus");
    process.exit(1);
  }
}
