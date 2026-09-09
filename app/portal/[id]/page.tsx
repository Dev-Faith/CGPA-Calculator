"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  SendIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { semesterLabel } from "@/lib/academic";

type Grade = {
  courseCode: string;
  courseTitle: string | null;
  unit: number;
  grade: string;
  gradePoint: number;
  score: number | null;
};

type EnrollmentRow = {
  id: number;
  student: { matricNo: string; name: string };
  gpa: number;
  tgp: number;
  tcu: number;
  remark: string;
  grades: Grade[];
};

type ResultSetDetail = {
  id: number;
  level: string;
  semester: number;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  source: string;
  uploadedAt: string;
  publishedAt: string | null;
  department: { name: string; code: string };
  session: { label: string };
  courses: { id: number; code: string; title: string | null; unit: number }[];
  enrollments: EnrollmentRow[];
};

function resultBadgeVariant(status: ResultSetDetail["status"]) {
  if (status === "PUBLISHED") return "default" as const;
  if (status === "DRAFT") return "secondary" as const;
  return "outline" as const;
}

function ResultSetContent() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultSetDetail | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    fetch(`/api/results/${id}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as {
          error?: string;
          resultSet?: ResultSetDetail;
        };
        if (!response.ok) {
          const error = new Error(
            body.error ?? "Unable to load this result import.",
          );
          error.name = response.status === 404 ? "NotFoundError" : "LoadError";
          throw error;
        }
        return body;
      })
      .then((response) => setData(response.resultSet ?? null))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          if (error.name === "NotFoundError") {
            setData(null);
          } else {
            setLoadError(error.message);
          }
        }
      })
      .finally(() => setLoadedId(id));

    return () => controller.abort();
  }, [id]);

  const filteredEnrollments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (
      data?.enrollments.filter((enrollment) => {
        return (
          !term ||
          enrollment.student.name.toLowerCase().includes(term) ||
          enrollment.student.matricNo.toLowerCase().includes(term)
        );
      }) ?? []
    );
  }, [data?.enrollments, search]);

  const updateStatus = async (action: "publish" | "archive") => {
    if (!data) return;

    const message =
      action === "publish"
        ? "Publish this draft? The currently published version for this semester will be archived."
        : "Archive this import? Students will no longer be able to access it.";
    if (!window.confirm(message)) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as {
        error?: string;
        resultSet?: Pick<ResultSetDetail, "status" | "publishedAt">;
      };
      if (!response.ok || !body.resultSet) {
        throw new Error(body.error ?? "Could not update this result import.");
      }
      setData((current) =>
        current ? { ...current, ...body.resultSet } : current,
      );
      toast.success(
        action === "publish"
          ? "Result is now published."
          : "Result import archived.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update this result import.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!id || loadedId !== id) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">
        Loading result import...
      </div>
    );
  }

  if (!data) {
    if (loadError) {
      return (
        <div className="grid flex-1 place-items-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Could not load this result import</CardTitle>
              <CardDescription>{loadError} Please try again.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="grid flex-1 place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Result import not found</CardTitle>
            <CardDescription>
              This import may have been removed or the link is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/portal" />} variant="outline">
              <ArrowLeftIcon className="mr-2 size-4" />
              Back to portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = data.enrollments.length;
  const passed = data.enrollments.filter(
    (enrollment) => enrollment.remark !== "FAIL",
  ).length;
  const distinctions = data.enrollments.filter(
    (enrollment) => enrollment.remark === "DISTINCTION",
  ).length;
  const averageGpa = total
    ? (
        data.enrollments.reduce((sum, enrollment) => sum + enrollment.gpa, 0) /
        total
      ).toFixed(2)
    : "0.00";

  return (
    <main className="flex-1 bg-muted/20 p-4 lg:p-6">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button
              render={<Link href="/portal" />}
              variant="ghost"
              size="sm"
              className="-ml-3"
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              All imports
            </Button>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {data.department.name.replace(/^DEPARTMENT OF\s+/i, "")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.session.label} / {semesterLabel(data.semester)} / Version{" "}
              {data.version}
            </p>
          </div>
          <Button render={<Link href="/" />} variant="outline">
            <BookOpenIcon className="mr-2 size-4" />
            New correction
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={resultBadgeVariant(data.status)}>
                  {data.status}
                </Badge>
                <span className="text-sm text-muted-foreground capitalize">
                  {data.source.toLowerCase()} import
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Only published imports are visible to students. Publishing this
                version archives any previous public version.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {data.status === "DRAFT" && (
                <Button
                  onClick={() => updateStatus("publish")}
                  disabled={isUpdatingStatus}
                >
                  <SendIcon className="mr-2 size-4" />
                  Publish
                </Button>
              )}
              {data.status !== "ARCHIVED" && (
                <Button
                  variant="outline"
                  onClick={() => updateStatus("archive")}
                  disabled={isUpdatingStatus}
                >
                  <ArchiveIcon className="mr-2 size-4" />
                  Archive
                </Button>
              )}
              {data.status === "PUBLISHED" && (
                <CheckCircle2Icon className="size-5 self-center text-emerald-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: UsersIcon, label: "Students", value: total },
            { icon: TrophyIcon, label: "Distinctions", value: distinctions },
            { icon: CheckCircle2Icon, label: "Passed", value: passed },
            {
              icon: GraduationCapIcon,
              label: "Average GPA",
              value: averageGpa,
            },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="size-5 text-primary" />
                <div>
                  <p className="text-xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="grid-cols-1 gap-3 border-b py-4 md:grid-cols-[1fr_16rem] md:items-center">
            <div>
              <CardTitle className="text-base">Student results</CardTitle>
              <CardDescription>
                {filteredEnrollments.length} of {total} records shown
              </CardDescription>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or matric number"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[62rem] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Matric no.
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Student</th>
                    {data.courses.map((course) => (
                      <th
                        key={course.id}
                        className="px-3 py-3 text-center font-medium whitespace-nowrap"
                      >
                        {course.code}
                        <span className="block text-[10px]">
                          {course.unit} unit{course.unit === 1 ? "" : "s"}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-medium">TGP</th>
                    <th className="px-4 py-3 text-center font-medium">GPA</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Remark
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Transcript
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEnrollments.map((enrollment, index) => (
                    <tr key={enrollment.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {enrollment.student.matricNo}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {enrollment.student.name}
                      </td>
                      {data.courses.map((course) => (
                        <td key={course.id} className="px-3 py-2 text-center">
                          {(() => {
                            const result = enrollment.grades.find(
                              (grade) => grade.courseCode === course.code,
                            );
                            return result ? (
                              <span className="font-medium tabular-nums">
                                {result.score ?? "-"}
                              </span>
                            ) : (
                              "-"
                            );
                          })()}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center tabular-nums">
                        {enrollment.tgp.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums">
                        {enrollment.gpa.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{enrollment.remark}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          render={
                            <Link
                              target="_blank"
                              href={`/results/${encodeURIComponent(enrollment.student.matricNo)}`}
                            />
                          }
                          size="sm"
                          variant="link"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEnrollments.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No students match this search.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Courses offered</CardTitle>
            <CardDescription>
              {data.courses.length} courses in this semester result.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {data.courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <span className="font-mono text-sm font-medium text-primary">
                  {course.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {course.title ?? "Course title not supplied"}
                </span>
                <Badge variant="secondary">
                  {course.unit} unit{course.unit === 1 ? "" : "s"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ResultSetPage() {
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
        <SiteHeader title="Review result import" />
        <ResultSetContent />
      </SidebarInset>
    </SidebarProvider>
  );
}
