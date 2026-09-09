import type { DepartmentData, StudentResult } from "@/lib/cgpa-calculator";
import { calculateEnrollment } from "@/lib/result-import";

type PastedCourse = { code: string; unit: number; title?: string; column: number };

const ignoredColumns = new Set([
  "S/N",
  "SN",
  "NAME",
  "STUDENT NAME",
  "MATRIC NO",
  "MATRIC NUMBER",
  "MATRICULATION NUMBER",
  "TGP",
  "TCP",
  "GPA",
  "CGPA",
  "REMARK",
]);

function normaliseHeader(value: string) {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function parseCourseHeader(value: string, column: number): PastedCourse | null {
  const header = value.trim();
  if (!header || ignoredColumns.has(normaliseHeader(header))) return null;

  // Example: CSC 101 (3), CSC 101 [3 units], or CSC 101 - 3
  const match = header.match(/^(.+?)\s*(?:\(|\[|-)\s*(\d{1,2})\s*(?:UNIT(?:S)?|U)?\s*(?:\)|\])?$/i);
  if (!match) return null;

  const code = match[1].replace(/\s+/g, " ").trim().toUpperCase();
  const unit = Number(match[2]);
  if (!code || unit < 1 || unit > 15) return null;
  return { code, unit, column };
}

/**
 * Parses a table copied directly from Excel or Google Sheets. Course columns
 * must be named like "CSC 101 (3)" so the result calculation never guesses
 * credit units.
 */
export function parsePastedBroadsheet(text: string, departmentName: string): DepartmentData {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (rows.length < 2) {
    throw new Error("Paste a header row and at least one student row.");
  }
  if (!departmentName.trim()) {
    throw new Error("Enter the department before importing pasted results.");
  }

  const headers = rows[0];
  const matricColumn = headers.findIndex((header) => {
    const value = normaliseHeader(header);
    return value === "MATRIC NO" || value === "MATRIC NUMBER" || value === "MATRICULATION NUMBER";
  });
  const nameColumn = headers.findIndex((header) => {
    const value = normaliseHeader(header);
    return value === "NAME" || value === "STUDENT NAME";
  });
  if (matricColumn < 0 || nameColumn < 0) {
    throw new Error('The first row must include "Matric No" and "Name" columns.');
  }

  const courses = headers
    .map((header, index) => parseCourseHeader(header, index))
    .filter((course): course is PastedCourse => course !== null);
  if (!courses.length) {
    throw new Error('Add at least one course column in the form "CSC 101 (3)".');
  }

  const students: StudentResult[] = rows.slice(1).map((row, index) => {
    const matricNo = row[matricColumn]?.trim();
    const name = row[nameColumn]?.trim();
    if (!matricNo || !name) {
      throw new Error(`Row ${index + 2} needs both a matric number and a student name.`);
    }

    const grades = Object.fromEntries(
      courses.map((course) => [course.code, row[course.column] ?? ""])
    );
    const scores = Object.fromEntries(
      courses.flatMap((course) => {
        const value = row[course.column] ?? "";
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100
          ? [[course.code, score]]
          : [];
      }),
    );
    const calculated = calculateEnrollment(
      courses.map(({ code, unit }) => ({ code, unit })),
      grades
    );
    return {
      sn: index + 1,
      name,
      matricNo,
      grades,
      scores,
      tgp: calculated.tgp,
      gpa: calculated.gpa,
      remark: calculated.remark,
    };
  });

  return {
    name: departmentName.trim(),
    courses: courses.map(({ code, unit }) => ({ code, unit })),
    students,
  };
}
