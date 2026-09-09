export const SEMESTERS = [1, 2, 3, 4] as const;

export type SemesterNumber = (typeof SEMESTERS)[number];
export type ResultStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const GRADE_POINTS: Record<string, number> = {
  A: 4,
  AB: 3.5,
  B: 3,
  BC: 2.5,
  C: 2,
  CD: 1.5,
  D: 1,
  E: 0.5,
  F: 0,
  ABS: 0,
  NR: 0,
};

export function levelForSemester(semester: number): "ND1" | "ND2" {
  if (!SEMESTERS.includes(semester as SemesterNumber)) {
    throw new Error("Semester must be a whole number from 1 to 4.");
  }
  return semester <= 2 ? "ND1" : "ND2";
}

export function semesterLabel(semester: number) {
  const labels: Record<number, string> = {
    1: "Semester 1 · ND1",
    2: "Semester 2 · ND1",
    3: "Semester 3 · ND2",
    4: "Semester 4 · ND2",
  };
  return labels[semester] ?? `Semester ${semester}`;
}

/** Converts an entered letter grade or 0–100 score to the NBTE grade point. */
export function gradeToPoint(value: string | number): number | null {
  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const score = Number(raw);
    if (score < 0 || score > 100) return null;
    if (score >= 75) return 4;
    if (score >= 70) return 3.5;
    if (score >= 65) return 3;
    if (score >= 60) return 2.5;
    if (score >= 55) return 2;
    if (score >= 50) return 1.5;
    if (score >= 45) return 1;
    if (score >= 40) return 0.5;
    return 0;
  }

  return GRADE_POINTS[raw] ?? null;
}

export function normalizeGrade(value: string | number): string {
  const raw = String(value).trim().toUpperCase();
  if (!raw) return "";
  return /^\d+(\.\d+)?$/.test(raw) ? String(Number(raw)) : raw;
}

export function resultRemark(gpa: number): string {
  if (gpa >= 3.5) return "DISTINCTION";
  if (gpa >= 3) return "UPPER CREDIT";
  if (gpa >= 2.5) return "LOWER CREDIT";
  if (gpa >= 2) return "PASS";
  return "FAIL";
}

export function normalizeSessionLabel(value: string): string | null {
  const match = value.trim().match(/^(20\d{2})\s*\/\s*(20\d{2})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return endYear === startYear + 1 ? `${startYear}/${endYear}` : null;
}
