#!/usr/bin/env node
/**
 * Build Static JSON API from scraped course data
 *
 * Output structure:
 * public/api/
 *   ├── courses.json           (所有課程列表)
 *   ├── courses/
 *   │   ├── {courseId}.json    (個別課程詳情)
 *   ├── semesters/
 *   │   ├── 114-1.json         (特定學期的課程)
 *   │   ├── 114-2.json
 *   ├── semesters.json         (可用學期列表)
 *   ├── metadata.json          (API 元資料)
 *   └── index.html             (API 文件首頁)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data/nkust/ag202');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public/api');

// 建立目錄
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 讀取 JSON 檔案
async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// 寫入 JSON 檔案
async function writeJSON(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 遞迴掃描目錄中的所有 JSON 檔案
async function* findJSONFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        yield* findJSONFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
        yield fullPath;
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

// 解析教師名稱字串為陣列
function parseInstructors(instructorStr) {
  if (!instructorStr || instructorStr.trim() === '') {
    return [];
  }

  return instructorStr.split(',').map(name => ({
    name: name.trim()
  }));
}

// 處理課程資料
function normalizeCourse(course, year, term) {
  return {
    id: course.id || `${year}-${term}-${course.selectCode}`,
    year,
    term,
    semester: `${year}-${term}`,

    // 基本資訊
    courseName: course.courseName,
    selectCode: course.selectCode,
    courseCode: course.courseCode,
    credits: course.credits,

    // 分類
    campus: course.campus,
    division: course.division,
    department: course.department,
    requiredOrElective: course.requiredOrElective,

    // 班級
    className: course.className,
    combinedClassName: course.combinedClassName,

    // 時間地點
    time: course.time,
    classroom: course.classroom,

    // 教師 (從字串解析為陣列)
    instructors: parseInstructors(course.instructor),

    // 人數
    enrolled: course.enrolled,
    capacity: course.capacity,

    // 特殊標記
    englishTaught: course.englishTaught,
    distanceLearning: course.distanceLearning,

    // 備註
    note: course.note,

    // 時數
    lectureHours: course.lectureHours,
    labHours: course.labHours,
  };
}

// 掃描所有學期並收集課程
async function scanAllCourses() {
  const semesterCoursesMap = new Map(); // Map<semester, Course[]>
  const coursesById = new Map(); // Map<courseId, Course>

  console.log('📂 Scanning course data...');

  try {
    const years = await fs.readdir(DATA_DIR);

    for (const year of years) {
      if (year.startsWith('.')) continue;

      const yearPath = path.join(DATA_DIR, year);
      const yearStat = await fs.stat(yearPath);
      if (!yearStat.isDirectory()) continue;

      const terms = await fs.readdir(yearPath);

      for (const term of terms) {
        if (term.startsWith('.')) continue;

        const termPath = path.join(yearPath, term);
        const termStat = await fs.stat(termPath);
        if (!termStat.isDirectory()) continue;

        const semesterLabel = `${year}-${term}`;
        const semesterCourses = [];

        console.log(`   📅 Processing ${semesterLabel}...`);

        // 遞迴掃描所有課程 JSON 檔案
        for await (const jsonFile of findJSONFiles(termPath)) {
          const data = await readJSON(jsonFile);

          if (data && data.courses && Array.isArray(data.courses)) {
            for (const course of data.courses) {
              const normalized = normalizeCourse(course, year, term);
              semesterCourses.push(normalized);
              coursesById.set(normalized.id, normalized);
            }
          }
        }

        console.log(`      ✓ Found ${semesterCourses.length} courses`);

        semesterCoursesMap.set(semesterLabel, {
          year,
          term,
          label: semesterLabel,
          coursesCount: semesterCourses.length,
          updatedAt: termStat.mtime.toISOString(),
          courses: semesterCourses
        });
      }
    }
  } catch (error) {
    console.error('Error scanning courses:', error);
  }

  return { semesterCoursesMap, coursesById };
}

// 建立 API 文件首頁
async function buildIndexHTML(metadata) {
  const html = `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NKUST Course API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; margin-bottom: 0.5rem; }
    .subtitle { color: #7f8c8d; margin-bottom: 2rem; }
    .endpoint {
      background: #ecf0f1;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
      border-left: 4px solid #3498db;
    }
    .endpoint code {
      background: #34495e;
      color: #ecf0f1;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      font-size: 0.9rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: #3498db;
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card h3 { font-size: 2rem; margin-bottom: 0.5rem; }
    .stat-card p { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 NKUST Course API</h1>
    <p class="subtitle">高科大課程資料靜態 API</p>

    <div class="stats">
      <div class="stat-card">
        <h3>${metadata.totalCourses.toLocaleString()}</h3>
        <p>總課程數</p>
      </div>
      <div class="stat-card">
        <h3>${metadata.totalSemesters}</h3>
        <p>學期數</p>
      </div>
      <div class="stat-card">
        <h3>${metadata.version}</h3>
        <p>API 版本</p>
      </div>
    </div>

    <h2>📡 API Endpoints</h2>

    <div class="endpoint">
      <h3>取得所有學期列表</h3>
      <code>GET /api/semesters.json</code>
      <p>返回所有可用的學期資訊</p>
    </div>

    <div class="endpoint">
      <h3>取得所有課程（摘要）</h3>
      <code>GET /api/courses.json</code>
      <p>返回所有課程的基本資訊列表</p>
    </div>

    <div class="endpoint">
      <h3>取得特定學期課程</h3>
      <code>GET /api/semesters/{year}-{term}.json</code>
      <p>範例: <code>/api/semesters/114-1.json</code></p>
    </div>

    <div class="endpoint">
      <h3>取得單一課程詳情</h3>
      <code>GET /api/courses/{courseId}.json</code>
      <p>返回課程完整資訊</p>
    </div>

    <div class="endpoint">
      <h3>API 元資料</h3>
      <code>GET /api/metadata.json</code>
      <p>返回 API 版本、更新時間等資訊</p>
    </div>

    <h2>📝 使用範例</h2>
    <pre style="background: #2c3e50; color: #ecf0f1; padding: 1rem; border-radius: 4px; overflow-x: auto;">
// 取得所有學期
fetch('https://your-username.github.io/nkust/api/semesters.json')
  .then(res => res.json())
  .then(data => console.log(data))

// 取得 114-1 學期課程
fetch('https://your-username.github.io/nkust/api/semesters/114-1.json')
  .then(res => res.json())
  .then(courses => console.log(courses))
    </pre>

    <footer style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #ecf0f1; text-align: center; color: #7f8c8d;">
      <p>Last Updated: ${new Date(metadata.lastUpdated).toLocaleString('zh-TW')}</p>
      <p>Generated by GitHub Actions</p>
    </footer>
  </div>
</body>
</html>`;

  const indexPath = path.join(OUTPUT_DIR, 'index.html');
  await fs.writeFile(indexPath, html, 'utf-8');
  console.log('📄 Generated index.html');
}

// 主要建構流程
async function main() {
  console.log('🚀 Building Static API...\n');

  const startTime = Date.now();

  // 1. 清理並建立輸出目錄
  await ensureDir(OUTPUT_DIR);
  await ensureDir(path.join(OUTPUT_DIR, 'courses'));
  await ensureDir(path.join(OUTPUT_DIR, 'semesters'));

  // 2. 掃描所有課程
  const { semesterCoursesMap, coursesById } = await scanAllCourses();

  const allCourses = Array.from(coursesById.values());
  console.log(`\n📚 Total courses: ${allCourses.length}`);

  // 3. 建立學期列表
  const semesters = Array.from(semesterCoursesMap.values())
    .map(({ year, term, label, coursesCount, updatedAt }) => ({
      year,
      term,
      label,
      coursesCount,
      updatedAt
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return b.year.localeCompare(a.year);
      return b.term.localeCompare(a.term);
    });

  await writeJSON(path.join(OUTPUT_DIR, 'semesters.json'), semesters);
  console.log('✅ Generated semesters.json');

  // 4. 建立所有課程列表（摘要）
  const courseSummaries = allCourses.map(c => ({
    id: c.id,
    semester: c.semester,
    courseName: c.courseName,
    selectCode: c.selectCode,
    department: c.department,
    campus: c.campus,
    instructors: c.instructors
  }));

  await writeJSON(path.join(OUTPUT_DIR, 'courses.json'), {
    total: courseSummaries.length,
    courses: courseSummaries
  });
  console.log('✅ Generated courses.json');

  // 5. 建立個別課程檔案
  console.log('\n📝 Generating individual course files...');
  for (const [courseId, course] of coursesById) {
    const coursePath = path.join(OUTPUT_DIR, 'courses', `${courseId}.json`);
    await writeJSON(coursePath, course);
  }
  console.log(`✅ Generated ${coursesById.size} course files`);

  // 6. 建立學期課程檔案
  console.log('\n📅 Generating semester course files...');
  for (const [semesterLabel, semesterData] of semesterCoursesMap) {
    const semesterPath = path.join(OUTPUT_DIR, 'semesters', `${semesterLabel}.json`);
    await writeJSON(semesterPath, {
      semester: semesterData.label,
      year: semesterData.year,
      term: semesterData.term,
      total: semesterData.coursesCount,
      courses: semesterData.courses
    });
    console.log(`   ✅ ${semesterLabel}: ${semesterData.coursesCount} courses`);
  }

  // 7. 建立元資料
  const metadata = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    totalCourses: allCourses.length,
    totalSemesters: semesters.length,
    semesters: semesters.map(s => s.label),
    apiUrl: 'https://your-username.github.io/nkust/api'
  };

  await writeJSON(path.join(OUTPUT_DIR, 'metadata.json'), metadata);
  console.log('\n✅ Generated metadata.json');

  // 8. 建立 API 文件首頁
  await buildIndexHTML(metadata);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n🎉 Build completed!');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Statistics:`);
  console.log(`   - Total courses: ${allCourses.length}`);
  console.log(`   - Semesters: ${semesters.length}`);
  console.log(`   - Output directory: ${OUTPUT_DIR}`);
}

main().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
