import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── GET /api/students/[matricNo] ──────────────────────────────────────────────
// Returns a student's full academic history across all semesters + cumulative CGPA
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matricNo: string }> }
) {
  const { matricNo } = await params;
  const normalizedMatric = decodeURIComponent(matricNo).toUpperCase().trim();

  try {
    const student = await db.student.findUnique({
      where: { matricNo: normalizedMatric },
      include: {
        enrollments: {
          where: { resultSet: { status: "PUBLISHED" } },
          include: {
            resultSet: {
              include: {
                department: true,
                session: true,
                courses: true,
              },
            },
            grades: {
              include: { course: true },
            },
          },
          orderBy: [
            { resultSet: { session: { label: "asc" } } },
            { resultSet: { level: "asc" } },
            { resultSet: { semester: "asc" } },
          ],
        },
      },
    });

    // Student records can exist through a draft import, but drafts and archived
    // corrections must never be exposed through the public lookup route.
    if (!student || student.enrollments.length === 0) {
      return NextResponse.json(
        { error: "Student not found. Please check the matric number." },
        { status: 404 }
      );
    }

    // Calculate cumulative CGPA from all enrollments
    const totalTgp = student.enrollments.reduce((sum, e) => sum + e.tgp, 0);
    const totalTcu = student.enrollments.reduce((sum, e) => sum + e.tcu, 0);
    const cgpa = totalTcu > 0 ? Number((totalTgp / totalTcu).toFixed(2)) : 0;

    const cgpaRemark = getCgpaRemark(cgpa);

    return NextResponse.json({
      student: {
        id: student.id,
        matricNo: student.matricNo,
        name: student.name,
        cgpa,
        cgpaRemark,
        semesterCount: student.enrollments.length,
        enrollments: student.enrollments.map((e) => ({
          id: e.id,
          level: e.resultSet.level,
          semester: e.resultSet.semester,
          session: e.resultSet.session.label,
          department: e.resultSet.department.name,
          gpa: e.gpa,
          tgp: e.tgp,
          tcu: e.tcu,
          remark: e.remark,
          grades: e.grades.map((g) => ({
            courseCode: g.course.code,
            courseTitle: g.course.title,
            unit: g.course.unit,
            grade: g.grade,
            gradePoint: g.gradePoint,
            score: g.score,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/students/[matricNo]]", error);
    return NextResponse.json(
      { error: "Failed to fetch student record." },
      { status: 500 }
    );
  }
}

function getCgpaRemark(cgpa: number): string {
  if (cgpa >= 3.5) return "DISTINCTION";
  if (cgpa >= 3.0) return "UPPER CREDIT";
  if (cgpa >= 2.5) return "LOWER CREDIT";
  if (cgpa >= 2.0) return "PASS";
  return "FAIL";
}
