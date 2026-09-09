"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  DownloadIcon,
  GraduationCapIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadStudentResultPdf,
  type ResultLetterDepartment,
  type ResultLetterStudent,
} from "@/lib/student-result-pdf";
import {
  downloadStudentTranscriptPdf,
  downloadComprehensiveTranscriptPdf,
  type TranscriptStudent,
} from "@/lib/student-transcript-pdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

type CourseGrade = {
  courseCode: string;
  courseTitle: string | null;
  unit: number;
  grade: string;
  gradePoint: number;
  score: number | null;
};

type Enrollment = {
  id: number;
  level: string;
  semester: number;
  session: string;
  department: string;
  gpa: number;
  tgp: number;
  tcu: number;
  remark: string;
  grades: CourseGrade[];
};

type StudentData = {
  id: number;
  matricNo: string;
  name: string;
  cgpa: number;
  cgpaRemark: string;
  semesterCount: number;
  enrollments: Enrollment[];
};

function remarkVariant(remark: string) {
  if (remark === "FAIL") return "destructive" as const;
  if (remark === "DISTINCTION") return "default" as const;
  return "secondary" as const;
}

function progressClass(cgpa: number) {
  if (cgpa < 2) return "bg-destructive";
  if (cgpa < 2.5) return "bg-emerald-600";
  if (cgpa < 3) return "bg-cyan-600";
  if (cgpa < 3.5) return "bg-blue-600";
  return "bg-amber-500";
}

function semesterLabel(semester: number) {
  const labels: Record<number, string> = {
    1: "Semester 1 · ND1",
    2: "Semester 2 · ND1",
    3: "Semester 3 · ND2",
    4: "Semester 4 · ND2",
  };
  return labels[semester] ?? `Semester ${semester}`;
}

export default function StudentTranscriptPage() {
  const { matricNo } = useParams<{ matricNo: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loadedMatricNo, setLoadedMatricNo] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfJob, setPdfJob] = useState<string | null>(null);

  const buildPdfData = (enrollment: Enrollment) => {
    const department: ResultLetterDepartment = {
      name: enrollment.department,
      session: enrollment.session,
      semester: semesterLabel(enrollment.semester),
      level: enrollment.level,
      courses: enrollment.grades.map((grade) => ({
        code: grade.courseCode,
        title: grade.courseTitle ?? undefined,
        unit: grade.unit,
      })),
    };
    const resultStudent: ResultLetterStudent = {
      name: student?.name ?? "",
      matricNo: student?.matricNo ?? "",
      grades: Object.fromEntries(
        enrollment.grades.map((grade) => [grade.courseCode, grade.grade]),
      ),
      gpa: enrollment.gpa,
      remark: enrollment.remark,
    };
    const transcriptStudent: TranscriptStudent = {
      ...resultStudent,
      tgp: enrollment.tgp,
      scores: Object.fromEntries(
        enrollment.grades
          .filter((grade) => grade.score !== null)
          .map((grade) => [grade.courseCode, grade.score as number]),
      ),
    };
    return { department, resultStudent, transcriptStudent };
  };

  const downloadStatement = async (enrollment: Enrollment) => {
    const job = `${enrollment.id}-statement`;
    setPdfJob(job);
    try {
      const { department, resultStudent } = buildPdfData(enrollment);
      await downloadStudentResultPdf(resultStudent, department);
      toast.success("Statement of result downloaded.");
    } catch {
      toast.error("Could not generate the statement of result.");
    } finally {
      setPdfJob(null);
    }
  };

  const downloadTranscript = async (enrollment: Enrollment) => {
    const job = `${enrollment.id}-transcript`;
    setPdfJob(job);
    try {
      const { department, transcriptStudent } = buildPdfData(enrollment);
      await downloadStudentTranscriptPdf(transcriptStudent, department);
      toast.success("Transcript downloaded.");
    } catch {
      toast.error("Could not generate the transcript.");
    } finally {
      setPdfJob(null);
    }
  };

  const downloadComprehensive = async () => {
    if (!student) return;
    const job = `comprehensive-transcript`;
    setPdfJob(job);
    try {
      const comprehensiveStudent = {
        name: student.name,
        matricNo: student.matricNo,
        cgpa: student.cgpa,
        cgpaRemark: student.cgpaRemark,
        enrollments: student.enrollments.map(e => ({
          department: e.department,
          session: e.session,
          semesterText: semesterLabel(e.semester),
          level: e.level,
          gpa: e.gpa,
          tgp: e.tgp,
          tcu: e.tcu,
          remark: e.remark,
          grades: e.grades,
        }))
      };
      await downloadComprehensiveTranscriptPdf(comprehensiveStudent);
      toast.success("Full Transcript downloaded.");
    } catch {
      toast.error("Could not generate the comprehensive transcript.");
    } finally {
      setPdfJob(null);
    }
  };

  useEffect(() => {
    if (!matricNo) return;

    const controller = new AbortController();
    fetch(`/api/students/${encodeURIComponent(matricNo)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load the student record.");
        }

        const data = await response.json();
        if (!data.student) {
          setNotFound(true);
          return;
        }
        setStudent(data.student);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setLoadError(error.message);
          toast.error("Failed to load the student record.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadedMatricNo(matricNo as string);
        }
      });

    return () => controller.abort();
  }, [matricNo]);

  if (!matricNo || loadedMatricNo !== matricNo) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            Loading result...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center">
            <div className="mb-2 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircleIcon className="size-5" />
            </div>
            <CardTitle>Could not load student result</CardTitle>
            <CardDescription>{loadError} Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (notFound || !student) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center">
            <div className="mb-2 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircleIcon className="size-5" />
            </div>
            <CardTitle>Student result not found</CardTitle>
            <CardDescription>
              No published result is available for{" "}
              <span className="font-mono text-foreground">
                {decodeURIComponent(matricNo)}
              </span>
              . Check the matric number and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/results" />} variant="outline">
              <ArrowLeftIcon className="mr-2 size-4" />
              Back to lookup
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const progress = Math.min((student.cgpa / 4) * 100, 100);

  return (
    <main className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
        <Button
          render={<Link href="/results" />}
          variant="ghost"
          size="sm"
          className="-ml-2"
        >
          <ArrowLeftIcon className="mr-1.5 size-4" />
          Result lookup
        </Button>

        <Card>
          <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <GraduationCapIcon className="size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {student.name}
                </h1>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {student.matricNo}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {student.enrollments[0]?.department.replace(
                    /^DEPARTMENT OF\s+/i,
                    "",
                  )}
                </p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 px-5 py-4 text-left sm:min-w-44 sm:text-center">
              <p className="text-3xl font-semibold tabular-nums">
                {student.cgpa.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cumulative GPA
              </p>
              <Badge
                variant={remarkVariant(student.cgpaRemark)}
                className="mt-2"
              >
                {student.cgpaRemark}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end">
            <Button 
              onClick={downloadComprehensive} 
              variant="default" 
              className="w-full sm:w-auto" 
              disabled={pdfJob === "comprehensive-transcript"}
            >
              <DownloadIcon className="mr-2 size-4" />
              {pdfJob === "comprehensive-transcript" ? "Generating..." : "Download Full Transcript"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUpIcon className="size-4 text-primary" />
              CGPA progress
            </CardTitle>
            <CardDescription>
              {student.cgpa.toFixed(2)} out of 4.00 · {student.semesterCount} of
              4 semester{student.semesterCount === 1 ? "" : "s"} published
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${progressClass(student.cgpa)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0.00</span>
              <span>2.00 pass mark</span>
              <span>4.00</span>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3" aria-labelledby="semester-results">
          <div className="flex items-center gap-2 px-1">
            <BookOpenIcon className="size-4 text-primary" />
            <h2 id="semester-results" className="font-medium">
              Semester results
            </h2>
          </div>

          {student.enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader className="grid-cols-[1fr_auto] border-b">
                <div>
                  <CardTitle>{semesterLabel(enrollment.semester)}</CardTitle>
                  <CardDescription>
                    {enrollment.session} ·{" "}
                    {enrollment.department.replace(/^DEPARTMENT OF\s+/i, "")}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">
                    {enrollment.gpa.toFixed(2)}
                  </p>
                  <Badge
                    variant={remarkVariant(enrollment.remark)}
                    className="mt-1"
                  >
                    {enrollment.remark}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42.5rem] text-sm">
                    <caption className="sr-only">
                      Courses and grades for{" "}
                      {semesterLabel(enrollment.semester)}
                    </caption>
                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          Course
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Title
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          Units
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          Grade
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          Score
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          Point
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          TCP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {enrollment.grades.map((grade) => (
                        <tr
                          key={grade.courseCode}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-medium">
                            {grade.courseCode}
                          </td>
                          <td className="max-w-80 px-4 py-3 text-muted-foreground">
                            {grade.courseTitle ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-center tabular-nums">
                            {grade.unit}
                          </td>
                          <td className="px-3 py-3 text-center font-medium">
                            {grade.grade}
                          </td>
                          <td className="px-3 py-3 text-center tabular-nums">
                            {grade.score ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-center tabular-nums">
                            {grade.gradePoint.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {(grade.gradePoint * grade.unit).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/20 font-medium">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-muted-foreground"
                        >
                          Total
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {enrollment.tcu}
                        </td>
                        <td colSpan={2} />
                        <td className="px-4 py-3 text-right tabular-nums">
                          {enrollment.tgp.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
              <CardContent className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadStatement(enrollment)}
                  disabled={pdfJob !== null}
                >
                  <DownloadIcon className="mr-2 size-4" />
                  {pdfJob === `${enrollment.id}-statement`
                    ? "Preparing..."
                    : "Statement of result"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadTranscript(enrollment)}
                  disabled={pdfJob !== null}
                >
                  <DownloadIcon className="mr-2 size-4" />
                  {pdfJob === `${enrollment.id}-transcript`
                    ? "Preparing..."
                    : "Transcript"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <TrophyIcon className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-medium">Cumulative GPA</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Based on {student.semesterCount} published semester
                  {student.semesterCount === 1 ? "" : "s"} in the four-semester
                  ND programme.
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-semibold tabular-nums">
                {student.cgpa.toFixed(2)}
              </p>
              <Badge
                variant={remarkVariant(student.cgpaRemark)}
                className="mt-1"
              >
                {student.cgpaRemark}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
