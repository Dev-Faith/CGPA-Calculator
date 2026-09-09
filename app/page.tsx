"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DatabaseIcon,
  AlertCircleIcon,
  RefreshCcwIcon,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartBar } from "@/components/bar-chart";
import { CalculationSummary } from "@/components/calculation-summary";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadDropzone } from "@/components/dropzone";
import type { DepartmentData } from "@/lib/cgpa-calculator";
import type { SemesterImport } from "@/lib/excel-score-parser";
import { processScoreSheetFile } from "@/lib/excel-score-parser";
import {
  clearParsedResults,
  loadParsedResultsContext,
  loadParsedResults,
  saveParsedResults,
  saveParsedResultsContext,
} from "@/lib/parsed-results-cache";
import { levelForSemester, semesterLabel } from "@/lib/academic";

type SaveValidationError = {
  title: string;
  message: string;
  hint: string;
};

function formatSaveValidationError(
  detail: { path: string; message: string } | undefined,
  serverError: string | undefined,
  departments: DepartmentData[],
): SaveValidationError {
  if (!detail) {
    if (
      serverError?.toLowerCase().includes("database") ||
      serverError?.toLowerCase().includes("reach")
    ) {
      return {
        title: "Database temporarily unavailable",
        message:
          "The draft was not saved because the database could not be reached.",
        hint: "Check your connection and try Create draft again. Your imported data is still on this page.",
      };
    }

    if (serverError?.toLowerCase().includes("academic session")) {
      return {
        title: "Check the academic session",
        message: serverError,
        hint: "Use consecutive years, for example 2024/2025.",
      };
    }

    return {
      title: "Draft could not be created",
      message:
        serverError ??
        "The imported data needs attention before it can be saved.",
      hint: "Review the records below or try the import again.",
    };
  }

  const departmentMatch = detail.path.match(/^departments\.(\d+)\./);
  const studentMatch = detail.path.match(/students\.(\d+)\.matricNo$/);
  const departmentIndex = departmentMatch ? Number(departmentMatch[1]) : -1;
  const studentIndex = studentMatch ? Number(studentMatch[1]) : -1;
  const department = departments[departmentIndex];
  const student = department?.students[studentIndex];
  const duplicateMatch = detail.message.match(
    /Duplicate matric number in this import: (.+)\.$/,
  );

  if (duplicateMatch && department && student) {
    return {
      title: "Duplicate matric number",
      message: `${duplicateMatch[1]} appears more than once in ${department.name}.`,
      hint: `Check student row ${studentIndex + 1} for ${student.name}, correct the source file, and import it again.`,
    };
  }

  return {
    title: "Review the imported data",
    message: detail.message,
    hint: department
      ? `The issue is in ${department.name}. Correct the source file and import it again.`
      : "Correct the source file and import it again.",
  };
}

export default function Page() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveValidationError, setSaveValidationError] =
    useState<SaveValidationError | null>(null);

  // The primary data state: an array of semester imports (one per Excel tab)
  const [semesterImports, setSemesterImports] = useState<SemesterImport[]>([]);

  // Academic context card (retained as fallback for missing metadata)
  const [sessionLabel, setSessionLabel] = useState("");
  const [semester, setSemester] = useState(1);

  useEffect(() => {
    const cachedResults = loadParsedResults();
    const cachedContext = loadParsedResultsContext();
    queueMicrotask(() => {
      if (cachedContext) {
        setSessionLabel(cachedContext.sessionLabel);
        setSemester(cachedContext.semester);
      }
      if (cachedResults.length) {
        setSemesterImports(cachedResults);
        setIsProcessed(true);
      }
    });
  }, []);

  // Derive DepartmentData[] for child components that still expect it
  const tableData = useMemo(
    () => semesterImports.map((imp) => imp.department),
    [semesterImports],
  );

  const [activeDeptIndex, setActiveDeptIndex] = useState(0);

  const studentCount = useMemo(() => {
    const uniqueMatrics = new Set<string>();
    for (const department of tableData) {
      for (const student of department.students) {
        if (student.matricNo) {
          uniqueMatrics.add(student.matricNo.trim().toUpperCase());
        }
      }
    }
    return uniqueMatrics.size;
  }, [tableData]);

  // The active subset for the Chart and Cards (synchronized with the Table)
  const activeTableData = useMemo(() => {
    return tableData[activeDeptIndex] ? [tableData[activeDeptIndex]] : [];
  }, [tableData, activeDeptIndex]);

  const sessionIsValid = useMemo(() => {
    const match = sessionLabel.trim().match(/^(20\d{2})\s*\/\s*(20\d{2})$/);
    return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
  }, [sessionLabel]);

  const importContextReady = sessionIsValid && semester >= 1 && semester <= 4;

  const acceptData = (data: SemesterImport[]) => {
    if (
      !data.length ||
      data.every((imp) => imp.department.students.length === 0)
    ) {
      throw new Error("No student results were found in this import.");
    }
    setSemesterImports(data);
    saveParsedResults(data);
    setIsProcessed(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!importContextReady) {
      toast.error(
        "Select a valid academic session and semester before importing.",
      );
      return;
    }
    setIsProcessing(true);
    toast.loading(`Reading ${file.name}…`, { id: "parse" });
    try {
      let parsed = await processScoreSheetFile(file);

      // Use the academic context card values as fallback for any tabs where
      // the parser couldn't extract session or semester.
      parsed = parsed.map((imp) => ({
        ...imp,
        sessionLabel: imp.sessionLabel || sessionLabel.trim(),
        semester: imp.semester || semester,
      }));

      acceptData(parsed);
      const semCount = parsed.length;
      toast.success(
        `${semCount} semester${semCount === 1 ? "" : "s"} imported — results are ready for review.`,
        { id: "parse" },
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The file could not be processed.",
        { id: "parse" },
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!semesterImports.length) {
      toast.error("There are no calculated results to save.");
      return;
    }

    // Validate that every semester import has a valid session label
    for (const imp of semesterImports) {
      const label = imp.sessionLabel?.trim();
      if (!label) {
        toast.error(
          `A semester tab is missing its academic session. Set the session in the academic context card and try again.`,
        );
        return;
      }
    }

    setIsSaving(true);
    setSaveValidationError(null);
    toast.loading("Creating draft imports…", { id: "save" });

    let savedCount = 0;

    try {
      for (const imp of semesterImports) {
        const importPayload = {
          departments: [
            {
              name: imp.department.name,
              courses: imp.department.courses.map((course) => ({
                code: course.code,
                title: course.title,
                unit: Number(course.unit),
              })),
              students: imp.department.students.map((student) => ({
                name: student.name,
                matricNo: student.matricNo,
                grades: Object.fromEntries(
                  Object.entries(student.grades).map(([code, grade]) => [
                    code,
                    grade === null || grade === undefined ? "" : grade,
                  ]),
                ),
                scores: Object.fromEntries(
                  Object.entries(student.scores ?? {}).map(([code, score]) => [
                    code,
                    score,
                  ]),
                ),
                tgp: Number(student.tgp),
                gpa: Number(student.gpa),
                remark: student.remark,
              })),
            },
          ],
          sessionLabel: imp.sessionLabel,
          semester: imp.semester,
          source: "UPLOAD" as const,
        };

        const response = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importPayload),
        });
        const responseBody = (await response.json()) as {
          error?: string;
          details?: { path: string; message: string }[];
          imports?: { id: number }[];
        };
        if (!response.ok) {
          const detail = responseBody.details?.[0];
          const validationError = formatSaveValidationError(
            detail,
            responseBody.error,
            [imp.department],
          );
          setSaveValidationError({
            ...validationError,
            title: `${validationError.title} (${imp.sessionLabel} Sem ${imp.semester})`,
          });
          toast.error(
            `${validationError.title} — ${imp.sessionLabel} Semester ${imp.semester}`,
            { id: "save" },
          );
          return;
        }

        savedCount++;
      }

      toast.success(
        `${savedCount} semester draft${savedCount === 1 ? "" : "s"} saved. Review in the Result Portal, then publish when ready.`,
        {
          id: "save",
          action: {
            label: "Open portal",
            onClick: () => {
              window.location.href = "/portal";
            },
          },
          duration: 10_000,
        },
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "The draft could not be saved.",
        { id: "save" },
      );
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    clearParsedResults();
    setSemesterImports([]);
    setIsProcessed(false);
    setSaveValidationError(null);
  };

  // Summary of unique sessions detected across all tabs
  const detectedSessions = useMemo(() => {
    const sessions = new Set(
      semesterImports.map((imp) => imp.sessionLabel).filter(Boolean),
    );
    return Array.from(sessions);
  }, [semesterImports]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="New import" />
        <main className="flex min-h-[calc(100vh-var(--header-height))] flex-1 flex-col overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col">
            {isProcessed ? (
              <div className="review-enter flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <section className="review-stagger mx-4 rounded-xl border bg-muted/30 p-4 lg:mx-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-base font-semibold">
                        Review before publishing
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {studentCount} students across{" "}
                        {semesterImports.length} semester
                        {semesterImports.length === 1 ? "" : "s"}.
                        {detectedSessions.length > 0 && (
                          <>
                            {" "}
                            Sessions: {detectedSessions.join(", ")}.
                          </>
                        )}{" "}
                        Check the records below, then create a private draft.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={reset} variant="outline">
                        <RefreshCcwIcon className="mr-2 size-4" /> New import
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="review-primary"
                      >
                        <DatabaseIcon className="mr-2 size-4" />{" "}
                        {isSaving ? "Creating…" : "Create draft"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Private draft</p>
                      <p className="text-muted-foreground">
                        {semesterImports.length} semester
                        {semesterImports.length === 1 ? "" : "s"} ·{" "}
                        {studentCount} students
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground sm:max-w-sm sm:text-right">
                      The server recalculates every GPA and rejects unsupported
                      grades before anything is stored.
                    </p>
                  </div>
                  {saveValidationError && (
                    <div
                      role="alert"
                      className="mt-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
                    >
                      <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
                      <div className="grid gap-1">
                        <p className="font-semibold text-destructive">
                          {saveValidationError.title}
                        </p>
                        <p>{saveValidationError.message}</p>
                        <p className="text-muted-foreground">
                          {saveValidationError.hint}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <div className="review-stagger review-delay-1">
                  <SectionCards tableData={activeTableData} />
                </div>
                <div className="review-stagger review-delay-2 px-4 lg:px-6">
                  <ChartBar tableData={activeTableData} />
                </div>
                <div className="review-stagger review-delay-3">
                  <DataTable 
                    departments={tableData} 
                    activeDeptIndex={activeDeptIndex}
                    onActiveDeptIndexChange={setActiveDeptIndex}
                  />
                </div>
                <div className="review-stagger review-delay-4">
                  <CalculationSummary />
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-5 p-6 lg:p-10">
                <div className="mb-1">
                  <p className="text-sm font-medium text-primary">
                    New result import
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Upload a department&apos;s score sheet
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Set the academic context, then upload the Excel file
                    containing the student scores. The file can contain a single semester, two semesters, or up to four semesters (each on a separate tab). Grades, GPA,
                    and remarks are generated automatically.
                  </p>
                </div>
                <Card>
                  <CardHeader className="border-b pb-4">
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        1
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Academic context
                        </CardTitle>
                        <CardDescription>
                          Semester automatically determines the programme level:
                          1–2 is ND1; 3–4 is ND2. These values are used as
                          fallback if the Excel file is missing session info.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="academic-session">Academic session</Label>
                      <Input
                        id="academic-session"
                        value={sessionLabel}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSessionLabel(value);
                          saveParsedResultsContext({
                            sessionLabel: value,
                            semester,
                          });
                        }}
                        placeholder="2024/2025"
                        autoComplete="off"
                        aria-describedby="session-help"
                        aria-invalid={Boolean(sessionLabel && !sessionIsValid)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="programme-semester">
                        Programme semester
                      </Label>
                      <Select
                        value={String(semester)}
                        onValueChange={(value) => {
                          const nextSemester = Number(value);
                          setSemester(nextSemester);
                          saveParsedResultsContext({
                            sessionLabel,
                            semester: nextSemester,
                          });
                        }}
                      >
                        <SelectTrigger
                          id="programme-semester"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {semesterLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <span className="block text-xs text-muted-foreground">
                        Calculated level
                      </span>
                      <strong>{levelForSemester(semester)}</strong>
                    </div>
                    <p
                      id="session-help"
                      className={`text-xs md:col-span-3 ${sessionLabel && !sessionIsValid ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {sessionLabel && !sessionIsValid
                        ? "Use consecutive years, for example 2024/2025."
                        : "This context is used as fallback when the Excel file doesn't contain session metadata."}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="border-b pb-4">
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Upload score sheet
                        </CardTitle>
                        <CardDescription>
                          Upload the department&apos;s Excel file containing 1 to 4
                          semesters (separated into tabs). Grades are generated
                          automatically from the raw scores.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <FileUploadDropzone
                      onUpload={handleFileUpload}
                      isProcessing={isProcessing}
                      disabled={!importContextReady}
                      title="Upload a department score sheet"
                      description={
                        importContextReady
                          ? "Upload an Excel file containing up to 4 tabs (one per semester). Grades, GPA, and remarks will be calculated from the raw scores."
                          : "Complete the academic session and programme semester above to unlock import."
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
