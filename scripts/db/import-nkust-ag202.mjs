import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walk(p)));
    } else {
      out.push(p);
    }
  }
  return out;
}

function splitInstructorNames(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  // Common separators in NKUST pages: 、 / ; , whitespace
  return s
    .split(/[、/;,，]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function makeSourceKey({ year, term, campusId, degreeId, unitId, selectCode, courseCode, courseName }) {
  const keyPart = selectCode || courseCode || courseName;
  return `${year}#${term}:${campusId || ""}:${degreeId || ""}:${unitId || ""}:${keyPart || ""}`.trim();
}

async function upsertCourseFromRow({ meta, row }) {
  const sourceKey = makeSourceKey({
    year: meta.year,
    term: meta.term,
    campusId: meta.campusId,
    degreeId: meta.degreeId,
    unitId: meta.unitId,
    selectCode: row.selectCode,
    courseCode: row.courseCode,
    courseName: row.courseName,
  });

  const course = await prisma.course.upsert({
    where: { sourceKey },
    create: {
      sourceKey,
      year: meta.year,
      term: meta.term,
      campusId: meta.campusId,
      degreeId: meta.degreeId,
      unitId: meta.unitId,
      campus: row.campus || null,
      division: row.division || null,
      department: row.department || null,
      selectCode: row.selectCode || null,
      courseCode: row.courseCode || null,
      courseName: row.courseName,
      className: row.className || null,
      combinedClassName: row.combinedClassName || null,
      credits: row.credits ?? null,
      lectureHours: row.lectureHours ?? null,
      labHours: row.labHours ?? null,
      requiredOrElective: row.requiredOrElective || null,
      classroom: row.classroom || null,
      time: row.time || null,
      enrolled: row.enrolled ?? null,
      capacity: row.capacity ?? null,
      englishTaught: row.englishTaught || null,
      distanceLearning: row.distanceLearning || null,
      note: row.note || null,
      syllabusUrl: row.syllabusData?.url || null,
      syllabusHtml: row.syllabusData?.html || null,
      syllabusData: row.syllabusData?.data ? JSON.parse(JSON.stringify(row.syllabusData.data)) : null,
    },
    update: {
      // keep latest scraped values
      campus: row.campus || null,
      division: row.division || null,
      department: row.department || null,
      selectCode: row.selectCode || null,
      courseCode: row.courseCode || null,
      courseName: row.courseName,
      className: row.className || null,
      combinedClassName: row.combinedClassName || null,
      credits: row.credits ?? null,
      lectureHours: row.lectureHours ?? null,
      labHours: row.labHours ?? null,
      requiredOrElective: row.requiredOrElective || null,
      classroom: row.classroom || null,
      time: row.time || null,
      enrolled: row.enrolled ?? null,
      capacity: row.capacity ?? null,
      englishTaught: row.englishTaught || null,
      distanceLearning: row.distanceLearning || null,
      note: row.note || null,
      syllabusUrl: row.syllabusData?.url || null,
      syllabusHtml: row.syllabusData?.html || null,
      syllabusData: row.syllabusData?.data ? JSON.parse(JSON.stringify(row.syllabusData.data)) : null,
    },
    select: { id: true },
  });

  // instructors relation
  const names = splitInstructorNames(row.instructor);
  for (const name of names) {
    const inst = await prisma.instructor.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    });

    await prisma.courseInstructor.upsert({
      where: { courseId_instructorId: { courseId: course.id, instructorId: inst.id } },
      create: { courseId: course.id, instructorId: inst.id },
      update: {},
    });
  }
}

async function main() {
  const importYear = env("NKUST_IMPORT_YEAR", "");
  const importTerm = env("NKUST_IMPORT_TERM", "");

  const dataRoot = path.resolve(process.cwd(), "data/nkust/ag202");
  const rootExists = await fs
    .stat(dataRoot)
    .then(() => true)
    .catch(() => false);
  if (!rootExists) {
    throw new Error(`Data folder not found: ${dataRoot}. Run the scraper first.`);
  }

  const files = (await walk(dataRoot))
    .filter((p) => p.endsWith(".json"))
    .filter((p) => !p.endsWith("index.json"));

  const filtered = files.filter((p) => {
    // expected: data/nkust/ag202/{year}/{term}/{cmp_area_id}/{dgr_id}/{unt_id}.json
    const rel = path.relative(dataRoot, p);
    const parts = rel.split(path.sep);
    const year = parts[0];
    const term = parts[1];
    if (importYear && year !== importYear) return false;
    if (importTerm && term !== importTerm) return false;
    return true;
  });

  let importedCourses = 0;
  for (const filePath of filtered) {
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw);

    const req = json.request || {};
    const ymsYms = String(req.yms_yms || "");
    const [year, term] = ymsYms.split("#");

    const meta = {
      year: year || "unknown",
      term: term || "unknown",
      campusId: String(req.cmp_area_id || ""),
      degreeId: String(req.dgr_id || ""),
      unitId: String(req.unt_id || ""),
    };

    const courses = Array.isArray(json.courses) ? json.courses : [];
    for (const row of courses) {
      if (!row?.courseName) continue;
      await upsertCourseFromRow({ meta, row });
      importedCourses += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Imported/updated ${importedCourses} course rows from ${filtered.length} file(s).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


