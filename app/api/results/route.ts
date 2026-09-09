import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { levelForSemester } from "@/lib/academic";
import {
  calculateEnrollment,
  resultImportSchema,
  validateSessionLabel,
} from "@/lib/result-import";
import { KNOWN_DEPT_CODES } from "@/lib/cgpa-calculator";
import { isAdminSession } from "@/lib/session";

const resultStatus = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);

function departmentCode(name: string) {
  const normalizedName = name.toUpperCase().trim();
  const knownCode = Object.entries(KNOWN_DEPT_CODES).find(
    ([, departmentName]) => departmentName === normalizedName
  )?.[0];

  return (
    knownCode ??
    normalizedName
      .replace(/^DEPARTMENT OF\s+/i, "")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10)
  );
}

// GET /api/results?session=2024/2025&semester=1&dept=COM&status=DRAFT
export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = request.nextUrl;
  const sessionLabel = searchParams.get("session")?.trim();
  const semesterParam = searchParams.get("semester");
  const departmentCodeParam = searchParams.get("dept")?.trim().toUpperCase();
  const status = searchParams.get("status")?.toUpperCase();

  const semester = semesterParam ? Number(semesterParam) : undefined;
  if (semester !== undefined && (!Number.isInteger(semester) || semester < 1 || semester > 4)) {
    return NextResponse.json({ error: "Semester must be between 1 and 4." }, { status: 400 });
  }
  if (status && !resultStatus.has(status)) {
    return NextResponse.json({ error: "Invalid result status." }, { status: 400 });
  }

  try {
    const resultSets = await db.resultSet.findMany({
      where: {
        ...(semester ? { semester } : {}),
        ...(sessionLabel ? { session: { label: sessionLabel } } : {}),
        ...(departmentCodeParam ? { department: { code: departmentCodeParam } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        department: true,
        session: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [
        { session: { label: "desc" } },
        { semester: "asc" },
        { version: "desc" },
      ],
    });

    return NextResponse.json({ resultSets });
  } catch (error) {
    console.error("[GET /api/results]", error);
    return NextResponse.json({ error: "Failed to fetch result sets." }, { status: 500 });
  }
}

// Saves a validated import as a new DRAFT version. Publishing is a separate,
// deliberate action so an incomplete upload can never reach student lookup.
export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resultImportSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "The import data is incomplete or invalid.",
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400 }
    );
  }

  const sessionLabel = validateSessionLabel(parsed.data.sessionLabel);
  if (!sessionLabel) {
    return NextResponse.json(
      { error: "Academic session must use consecutive years, for example 2024/2025." },
      { status: 400 }
    );
  }

  const { departments, semester, source } = parsed.data;
  const level = levelForSemester(semester);

  // Do all content validation before opening the transaction. That way a typo
  // such as an unsupported grade produces a useful 400 response rather than a
  // partially saved result set or a generic server error.
  try {
    for (const department of departments) {
      for (const student of department.students) {
        calculateEnrollment(department.courses, student.grades);
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid grade data." },
      { status: 400 }
    );
  }

  try {
    const savedImports = await db.$transaction(async (tx) => {
      const session = await tx.session.upsert({
        where: { label: sessionLabel },
        update: {},
        create: { label: sessionLabel },
      });

      const saved = [] as {
        id: number;
        department: string;
        semester: number;
        level: string;
        version: number;
        status: string;
      }[];

      for (const importedDepartment of departments) {
        const code = departmentCode(importedDepartment.name);
        if (!code) {
          throw new Error(`A department code could not be created for ${importedDepartment.name}.`);
        }

        const department = await tx.department.upsert({
          where: { code },
          update: { name: importedDepartment.name.trim().toUpperCase() },
          create: { code, name: importedDepartment.name.trim().toUpperCase() },
        });

        const previous = await tx.resultSet.findFirst({
          where: { departmentId: department.id, sessionId: session.id, semester },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const version = (previous?.version ?? 0) + 1;

        const resultSet = await tx.resultSet.create({
          data: {
            departmentId: department.id,
            sessionId: session.id,
            semester,
            level,
            version,
            source,
            status: "DRAFT",
          },
        });

        const courses = await Promise.all(
          importedDepartment.courses.map((course) =>
            tx.course.create({
              data: {
                code: course.code.replace(/\s+/g, " ").trim().toUpperCase(),
                title: course.title?.trim() || null,
                unit: course.unit,
                resultSetId: resultSet.id,
              },
            })
          )
        );
        const courseIds = new Map(courses.map((course) => [course.code, course.id]));

        for (const importedStudent of importedDepartment.students) {
          const student = await tx.student.upsert({
            where: { matricNo: importedStudent.matricNo.trim().toUpperCase() },
            update: { name: importedStudent.name.trim().toUpperCase() },
            create: {
              matricNo: importedStudent.matricNo.trim().toUpperCase(),
              name: importedStudent.name.trim().toUpperCase(),
            },
          });
          const calculation = calculateEnrollment(importedDepartment.courses, importedStudent.grades);
          const enrollment = await tx.enrollment.create({
            data: {
              studentId: student.id,
              resultSetId: resultSet.id,
              tgp: calculation.tgp,
              tcu: calculation.tcu,
              gpa: calculation.gpa,
              remark: calculation.remark,
            },
          });

          if (calculation.grades.length) {
            await tx.courseGrade.createMany({
              data: calculation.grades.map((grade) => ({
                enrollmentId: enrollment.id,
                courseId: courseIds.get(grade.code) as number,
                grade: grade.grade,
                gradePoint: grade.gradePoint,
                score: (() => {
                  const rawScore = importedStudent.scores?.[grade.code] ?? importedStudent.grades[grade.code];
                  const score = Number(rawScore);
                  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
                })(),
              })),
            });
          }
        }

        saved.push({
          id: resultSet.id,
          department: department.name,
          semester,
          level,
          version,
          status: resultSet.status,
        });
      }

      return saved;
    }, {
      maxWait: 20_000,
      timeout: 120_000,
    });

    return NextResponse.json({ imports: savedImports }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/results]", error);
    const message = error instanceof Error ? error.message : "Failed to save results to database.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
