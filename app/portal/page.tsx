import type { CSSProperties } from "react";
import { db } from "@/lib/db";
import { ResultPortal } from "@/components/result-portal";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const [resultSets, sessions, departments] = await Promise.all([
    db.resultSet.findMany({
      include: {
        department: true,
        session: true,
        _count: { select: { enrollments: true } },
        courses: { select: { id: true } },
        enrollments: { select: { grades: { select: { score: true } } } },
      },
      orderBy: [
        { session: { label: "desc" } },
        { semester: "asc" },
        { version: "desc" },
      ],
    }),
    db.session.findMany({ orderBy: { label: "desc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const portal = (
    <ResultPortal
      initialResultSets={resultSets.map((resultSet) => ({
        id: resultSet.id,
        level: resultSet.level,
        semester: resultSet.semester,
        version: resultSet.version,
        status: resultSet.status,
        source: resultSet.source,
        uploadedAt: resultSet.uploadedAt.toISOString(),
        publishedAt: resultSet.publishedAt?.toISOString() ?? null,
        department: resultSet.department,
        session: resultSet.session,
        studentCount: resultSet._count.enrollments,
        gradeCount: resultSet.enrollments.reduce(
          (count, enrollment) => count + enrollment.grades.length,
          0,
        ),
        scoreCount: resultSet.enrollments.reduce(
          (count, enrollment) =>
            count +
            enrollment.grades.filter((grade) => grade.score !== null).length,
          0,
        ),
        missingScoreCount: resultSet.enrollments.reduce(
          (count, enrollment) =>
            count +
            Math.max(
              resultSet.courses.length -
                enrollment.grades.filter((grade) => grade.score !== null)
                  .length,
              0,
            ),
          0,
        ),
      }))}
      sessions={sessions}
      departments={departments}
    />
  );

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Result portal" />
        {portal}
      </SidebarInset>
    </SidebarProvider>
  );
}
