import * as XLSX from "xlsx";
import type { DepartmentData, StudentResult } from "@/lib/cgpa-calculator";
import { gradeForScore, extractDepartmentName, KNOWN_DEPT_CODES } from "@/lib/cgpa-calculator";
import { gradeToPoint, resultRemark } from "@/lib/academic";

type SheetCell = string | number | boolean | Date | null | undefined;

/**
 * Represents a single semester's parsed result data, including the academic
 * context extracted from the sheet tab.
 */
export interface SemesterImport {
  /** Academic session label, e.g. "2021/2022" */
  sessionLabel: string;
  /** Programme semester number 1–4 */
  semester: number;
  /** The department data for this semester (courses, students, grades) */
  department: DepartmentData;
}

/**
 * Maps semester text ("FIRST SEMESTER" / "SECOND SEMESTER") and NID level
 * ("NID 1" / "NID 2") to the programme semester number 1–4.
 *
 * - NID 1 + FIRST  → 1
 * - NID 1 + SECOND → 2
 * - NID 2 + FIRST  → 3
 * - NID 2 + SECOND → 4
 */
function parseSemesterNumber(semesterText: string, levelText: string): number {
  const isSecond = /SECOND/i.test(semesterText);
  const ndMatch = levelText.match(/ND\s*(\d)/i) || levelText.match(/NID\s*(\d)/i);
  const ndLevel = ndMatch ? Number(ndMatch[1]) : 1;

  if (ndLevel >= 2) return isSecond ? 4 : 3;
  return isSecond ? 2 : 1;
}

/**
 * Generates a short display label for a semester, e.g. "Semester 1 · ND1".
 */
function semesterDisplayLabel(semester: number): string {
  const labels: Record<number, string> = {
    1: "Semester 1 · ND1",
    2: "Semester 2 · ND1",
    3: "Semester 3 · ND2",
    4: "Semester 4 · ND2",
  };
  return labels[semester] ?? `Semester ${semester}`;
}

/**
 * Parses a per-department score-based Excel file.
 *
 * The file is expected to have up to 4 tabs (Sheet1–Sheet4), one per programme
 * semester. Each tab contains raw numeric student scores (0–100).  The parser
 * converts each score into a letter grade and calculates TGP, GPA, and remark.
 *
 * @returns An array of `SemesterImport` objects, one per valid tab.
 */
export async function processScoreSheetFile(
  file: File,
): Promise<SemesterImport[]> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: "array" });

  const results: SemesterImport[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown as SheetCell[][];

    // ── Locate metadata rows ──────────────────────────────────────────
    let departmentName = "";
    let sessionLabel = "";
    let semesterText = "";
    let levelText = "";
    let headerRowIndex = -1;
    let unitRowIndex = -1;
    let snColIndex = -1;
    let nameColIndex = -1;
    let matricColIndex = -1;

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!row) continue;

      const rowStr = row.map((c) => String(c ?? "")).join(" ").toUpperCase();

      // Department name (e.g. "DEPARTMENT OF COMPUTER SOFTWARE ENGINEERING")
      if (!departmentName && rowStr.includes("DEPARTMENT OF")) {
        for (const cell of row) {
          const str = String(cell ?? "").trim();
          if (/DEPARTMENT\s+OF/i.test(str)) {
            departmentName = str.toUpperCase();
            break;
          }
        }
      }

      // Session, semester, and NID level
      if (rowStr.includes("SESSION:")) {
        for (const cell of row) {
          const s = String(cell ?? "");
          const sesMatch = s.match(/SESSION:\s*(\d{4}\s*\/\s*\d{4})/i);
          if (sesMatch) sessionLabel = sesMatch[1].replace(/\s+/g, "");

          const semMatch = s.match(
            /SEMESTER:\s*((?:FIRST|SECOND)\s+SEMESTER)/i,
          );
          if (semMatch) semesterText = semMatch[1];
        }
        // ND/NID level may be in a separate cell on the same row
        for (const cell of row) {
          const s = String(cell ?? "").trim();
          const ndMatch = s.match(/N?ID?\s*(\d)/i) || s.match(/ND\s*(\d)/i);
          if (ndMatch) {
            levelText = `ND${ndMatch[1]}`;
          }
        }
      }

      // Header row (contains "MATRIC NO")
      if (headerRowIndex === -1 && rowStr.includes("MATRIC")) {
        headerRowIndex = i;
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] ?? "").toUpperCase().trim();
          if (val === "S/N" || val === "SN") snColIndex = c;
          if (val.includes("NAME")) nameColIndex = c;
          if (val.includes("MATRIC")) matricColIndex = c;
        }
      }

      // Unit row (immediately after header or explicitly marked)
      if (
        headerRowIndex !== -1 &&
        i > headerRowIndex &&
        (rowStr.includes("COURSE UNIT") || rowStr.includes("CREDIT UNIT"))
      ) {
        unitRowIndex = i;
        break;
      }
    }

    // Skip sheets that don't look like result data
    if (headerRowIndex === -1 || matricColIndex === -1) continue;
    if (unitRowIndex === -1) unitRowIndex = headerRowIndex + 1;

    const semesterNumber = parseSemesterNumber(semesterText, levelText);

    // ── Map course columns ────────────────────────────────────────────
    const unitRow = rows[unitRowIndex] || [];
    const headerRow = rows[headerRowIndex] || [];
    const courses: { colIndex: number; code: string; unit: number }[] = [];
    let tgpCol = -1;
    let gpaCol = -1;
    let remarkCol = -1;

    const maxCols = Math.max(headerRow.length, unitRow.length);

    for (let c = 0; c < maxCols; c++) {
      const header = String(headerRow[c] ?? "")
        .replace(/\n/g, " ")
        .trim()
        .toUpperCase();
      if (!header) continue;

      if (header.includes("TGP") || header.includes("TCP")) {
        tgpCol = c;
        continue;
      }
      if (header.includes("GPA") && !header.includes("CGPA")) {
        gpaCol = c;
        continue;
      }
      if (header.includes("REMARK") || header.includes("REAMRK")) {
        remarkCol = c;
        continue;
      }

      // Course columns come after the matric column
      if (c > matricColIndex) {
        const rawUnit = unitRow[c];
        const unitValue = Number(rawUnit);
        if (!isNaN(unitValue) && unitValue > 0 && unitValue <= 15) {
          courses.push({ colIndex: c, code: header, unit: unitValue });
        }
      }
    }

    if (courses.length === 0) continue;

    // ── Parse student rows ────────────────────────────────────────────
    const students: StudentResult[] = [];

    for (let i = unitRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[matricColIndex]) continue;

      const nameVal =
        nameColIndex !== -1 ? String(row[nameColIndex] ?? "").trim() : "";
      const matricVal = String(row[matricColIndex] ?? "")
        .toUpperCase()
        .trim();

      // Stop at footer / summary rows
      if (nameVal.toUpperCase().includes("PREPARED BY")) break;
      if (
        ["REMARK", "TOTAL", "SUMMARY", "DISTINCTION"].includes(
          nameVal.toUpperCase(),
        ) ||
        ["NO OF STUDENTS", "UNDEFINED", "SUMMARY"].includes(matricVal)
      ) {
        break;
      }

      let tgp = 0;
      let tcu = 0;
      const grades: Record<string, string> = {};
      const scores: Record<string, number | string> = {};

      for (const course of courses) {
        const cellVal = row[course.colIndex];
        if (
          cellVal === undefined ||
          cellVal === null ||
          String(cellVal).trim() === ""
        )
          continue;

        const numericScore = Number(cellVal);

        if (
          Number.isFinite(numericScore) &&
          numericScore >= 0 &&
          numericScore <= 100
        ) {
          // Convert score → letter grade → grade point
          scores[course.code] = numericScore;
          const grade = gradeForScore(numericScore);
          grades[course.code] = grade;

          const gp = gradeToPoint(numericScore);
          if (gp !== null) {
            tgp += gp * course.unit;
            tcu += course.unit;
          }
        } else {
          // Non-numeric value (e.g. "ABS", "NR", or a pre-entered letter grade)
          const raw = String(cellVal).toUpperCase().trim();
          grades[course.code] = raw;
          const gp = gradeToPoint(raw);
          if (gp !== null) {
            tgp += gp * course.unit;
            tcu += course.unit;
          }
        }
      }

      const gpa = tcu > 0 ? Number((tgp / tcu).toFixed(2)) : 0;
      const remark = resultRemark(gpa);

      // Write calculated values back into the row (for optional re-export)
      if (tgpCol !== -1) row[tgpCol] = Number(tgp.toFixed(2));
      if (gpaCol !== -1) row[gpaCol] = gpa;
      if (remarkCol !== -1) row[remarkCol] = remark;

      students.push({
        sn:
          snColIndex !== -1
            ? Number(row[snColIndex]) || students.length + 1
            : students.length + 1,
        name: nameVal || "Unknown",
        matricNo: matricVal,
        grades,
        scores,
        tgp: Number(tgp.toFixed(2)),
        gpa,
        remark,
      });
    }

    if (students.length === 0) continue;

    // Resolve a clean department name if it wasn't found in the header rows
    if (!departmentName) {
      const sampleMatrics = students.slice(0, 10).map((s) => s.matricNo);
      departmentName = extractDepartmentName(
        rows,
        headerRowIndex,
        sheetName,
        courses,
        sampleMatrics,
      );
    }

    results.push({
      sessionLabel,
      semester: semesterNumber,
      department: {
        name: departmentName,
        session: sessionLabel,
        semester: semesterText,
        level: levelText,
        courses: courses.map((c) => ({ code: c.code, unit: c.unit })),
        students,
      },
    });
  }

  return results;
}
