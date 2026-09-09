import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminSession } from "@/lib/session";

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resultSetId = parseId((await params).id);
  if (!resultSetId) {
    return NextResponse.json({ error: "Invalid result set ID." }, { status: 400 });
  }

  try {
    const resultSet = await db.resultSet.findUnique({
      where: { id: resultSetId },
      include: {
        department: true,
        session: true,
        courses: { orderBy: { code: "asc" } },
        enrollments: {
          include: {
            student: true,
            grades: { include: { course: true } },
          },
          orderBy: { student: { name: "asc" } },
        },
      },
    });
    if (!resultSet) {
      return NextResponse.json({ error: "Result set not found." }, { status: 404 });
    }
    return NextResponse.json({
      resultSet: {
        ...resultSet,
        enrollments: resultSet.enrollments.map((enrollment) => ({
          ...enrollment,
          grades: enrollment.grades.map((grade) => ({
            courseCode: grade.course.code,
            courseTitle: grade.course.title,
            unit: grade.course.unit,
            grade: grade.grade,
            gradePoint: grade.gradePoint,
            score: grade.score,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/results/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch result set." }, { status: 500 });
  }
}

// Publishing automatically archives the older public version for the same
// department, academic session, and semester. The new result itself is never
// silently altered or deleted.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resultSetId = parseId((await params).id);
  if (!resultSetId) {
    return NextResponse.json({ error: "Invalid result set ID." }, { status: 400 });
  }

  let action: unknown;
  try {
    ({ action } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (action !== "publish" && action !== "archive") {
    return NextResponse.json({ error: "Action must be publish or archive." }, { status: 400 });
  }

  try {
    const resultSet = await db.$transaction(async (tx) => {
      const target = await tx.resultSet.findUnique({
        where: { id: resultSetId },
        include: {
          courses: { select: { id: true } },
          enrollments: { include: { grades: true } },
        },
      });
      if (!target) return null;

      if (action === "publish") {
        if (target.status === "ARCHIVED") {
          throw new Error("An archived import cannot be published. Create a new corrected import instead.");
        }
        const scoreCount = target.enrollments.reduce(
          (count, enrollment) => count + enrollment.grades.filter((grade) => grade.score !== null).length,
          0,
        );
        if (scoreCount === 0) {
          throw new Error(
            "Cannot publish this result because no actual scores were uploaded for this department. Upload a spreadsheet or DOCX containing scores, then create a new import.",
          );
        }
        await tx.resultSet.updateMany({
          where: {
            departmentId: target.departmentId,
            sessionId: target.sessionId,
            semester: target.semester,
            status: "PUBLISHED",
            id: { not: target.id },
          },
          data: { status: "ARCHIVED" },
        });
        return tx.resultSet.update({
          where: { id: target.id },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      }

      return tx.resultSet.update({
        where: { id: target.id },
        data: { status: "ARCHIVED" },
      });
    });

    if (!resultSet) {
      return NextResponse.json({ error: "Result set not found." }, { status: 404 });
    }
    return NextResponse.json({ resultSet });
  } catch (error) {
    console.error("[PATCH /api/results/[id]]", error);
    const message = error instanceof Error ? error.message : "Failed to update result set.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// This endpoint deliberately archives rather than destroys records. It keeps
// the import history intact if a result is accidentally removed from use.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return PATCH(
    new NextRequest(request.url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ action: "archive" }),
    }),
    context
  );
}

export const runtime = "nodejs";
