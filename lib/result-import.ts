import { z } from "zod";
import {
  gradeToPoint,
  normalizeGrade,
  normalizeSessionLabel,
  resultRemark,
} from "@/lib/academic";

const gradeValue = z.union([z.string(), z.number()]);

const missingGradeMarkers = new Set(["", "-", "—", "N/A", "NA"]);

const courseSchema = z.object({
  code: z.string().trim().min(2).max(32),
  title: z.string().trim().max(200).optional(),
  unit: z.coerce.number().int().min(1).max(15),
});

const studentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  matricNo: z.string().trim().min(2).max(64),
  grades: z.record(z.string(), gradeValue),
  scores: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  // These are accepted because the existing spreadsheet parser provides them,
  // but the server recalculates all three before storing anything.
  tgp: z.coerce.number().optional(),
  gpa: z.union([z.string(), z.number()]).optional(),
  remark: z.string().optional(),
});

const departmentSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    courses: z.array(courseSchema).min(1).max(60),
    students: z.array(studentSchema).min(1).max(3000),
  })
  .superRefine((department, ctx) => {
    const codes = new Set<string>();
    for (const [index, course] of department.courses.entries()) {
      const code = course.code.replace(/\s+/g, " ").toUpperCase();
      if (codes.has(code)) {
        ctx.addIssue({
          code: "custom",
          path: ["courses", index, "code"],
          message: `Duplicate course code: ${code}.`,
        });
      }
      codes.add(code);
    }

    const matricNumbers = new Set<string>();
    for (const [index, student] of department.students.entries()) {
      const matricNo = student.matricNo.toUpperCase();
      if (matricNumbers.has(matricNo)) {
        ctx.addIssue({
          code: "custom",
          path: ["students", index, "matricNo"],
          message: `Duplicate matric number in this import: ${matricNo}.`,
        });
      }
      matricNumbers.add(matricNo);

      for (const [gradeCode, grade] of Object.entries(student.grades)) {
        const normalizedCode = gradeCode.replace(/\s+/g, " ").toUpperCase();
        if (String(grade).trim() && !codes.has(normalizedCode)) {
          ctx.addIssue({
            code: "custom",
            path: ["students", index, "grades", gradeCode],
            message: `Grade supplied for unknown course: ${normalizedCode}.`,
          });
        }
      }
    }
  });

export const resultImportSchema = z.object({
  departments: z.array(departmentSchema).min(1).max(30),
  sessionLabel: z.string().trim(),
  semester: z.coerce.number().int().min(1).max(4),
  source: z.enum(["UPLOAD", "PASTE"]).default("UPLOAD"),
});

export type ResultImportInput = z.infer<typeof resultImportSchema>;
export type ImportDepartment = ResultImportInput["departments"][number];

export function validateSessionLabel(value: string): string | null {
  return normalizeSessionLabel(value);
}

export function calculateEnrollment(
  courses: ImportDepartment["courses"],
  suppliedGrades: Record<string, string | number>
) {
  const gradeByCourse = new Map(
    Object.entries(suppliedGrades).map(([code, grade]) => [
      code.replace(/\s+/g, " ").toUpperCase(),
      grade,
    ])
  );

  let tgp = 0;
  let tcu = 0;
  const grades: { code: string; grade: string; gradePoint: number }[] = [];

  for (const course of courses) {
    const code = course.code.replace(/\s+/g, " ").toUpperCase();
    const rawGrade = gradeByCourse.get(code);
    const normalizedGrade = rawGrade === undefined ? "" : String(rawGrade).trim().toUpperCase();
    if (rawGrade === undefined || missingGradeMarkers.has(normalizedGrade)) continue;

    const gradePoint = gradeToPoint(rawGrade);
    if (gradePoint === null) {
      throw new Error(
        `Invalid grade "${rawGrade}" for ${code}. Use A, AB, B, BC, C, CD, D, E, F, ABS, NR, or a score from 0 to 100.`
      );
    }

    tgp += gradePoint * course.unit;
    tcu += course.unit;
    grades.push({ code, grade: normalizeGrade(rawGrade), gradePoint });
  }

  const gpa = tcu === 0 ? 0 : Number((tgp / tcu).toFixed(2));
  return {
    tgp: Number(tgp.toFixed(2)),
    tcu,
    gpa,
    remark: resultRemark(gpa),
    grades,
  };
}
