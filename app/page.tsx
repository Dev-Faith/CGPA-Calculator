"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  ClipboardPasteIcon,
  DatabaseIcon,
  AlertCircleIcon,
  FileUpIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { FileUploadDropzone } from "@/components/dropzone";
import type { DepartmentData } from "@/lib/cgpa-calculator";
import {
  mergeDocxScoresIntoData,
  processBroadsheetFile,
} from "@/lib/cgpa-calculator";
import { processDocxFile } from "@/lib/docx-parser";
import {
  clearParsedResults,
  loadParsedResultsContext,
  loadParsedResults,
  saveParsedResults,
  saveParsedResultsContext,
} from "@/lib/parsed-results-cache";
import { levelForSemester, semesterLabel } from "@/lib/academic";
import { parsePastedBroadsheet } from "@/lib/paste-results";

type ImportSource = "UPLOAD" | "PASTE";

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
  const [tableData, setTableData] = useState<DepartmentData[]>([]);
  const [sessionLabel, setSessionLabel] = useState("");
  const [semester, setSemester] = useState(1);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteDepartment, setPasteDepartment] = useState("");
  const [importSource, setImportSource] = useState<ImportSource>("UPLOAD");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cachedResults = loadParsedResults();
    const cachedContext = loadParsedResultsContext();
    queueMicrotask(() => {
      if (cachedContext) {
        setSessionLabel(cachedContext.sessionLabel);
        setSemester(cachedContext.semester);
      }
      if (cachedResults.length) {
        setTableData(cachedResults);
        setIsProcessed(true);
      }
    });
  }, []);

  const studentCount = useMemo(
    () =>
      tableData.reduce(
        (total, department) => total + department.students.length,
        0,
      ),
    [tableData],
  );
  const sessionIsValid = useMemo(() => {
    const match = sessionLabel.trim().match(/^(20\d{2})\s*\/\s*(20\d{2})$/);
    return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
  }, [sessionLabel]);

  const importContextReady = sessionIsValid && semester >= 1 && semester <= 4;

  const acceptData = (data: DepartmentData[], source: ImportSource) => {
    if (
      !data.length ||
      data.every((department) => department.students.length === 0)
    ) {
      throw new Error("No student results were found in this import.");
    }
    setTableData(data);
    saveParsedResults(data);
    setImportSource(source);
    setIsProcessed(true);
    setShowPastePanel(false);
  };

  const handleMergeClick = () => fileInputRef.current?.click();

  const handleMergeFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Select a DOCX result slip to merge.");
      return;
    }

    setIsProcessing(true);
    toast.loading(`Merging ${file.name}…`, { id: "merge" });
    try {
      const { parsedData } = await processDocxFile(file);
      const merged = mergeDocxScoresIntoData(tableData, parsedData);
      acceptData(merged, importSource);
      toast.success("DOCX scores merged into the preview.", { id: "merge" });
    } catch (error) {
      console.error(error);
      toast.error("The DOCX file could not be merged.", { id: "merge" });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      const parsedData = file.name.toLowerCase().endsWith(".docx")
        ? (await processDocxFile(file)).parsedData
        : (await processBroadsheetFile(file)).parsedData;
      acceptData(parsedData, "UPLOAD");
      toast.success("Results are ready for review.", { id: "parse" });
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

  const handlePaste = () => {
    if (!importContextReady) {
      toast.error(
        "Select a valid academic session and semester before importing.",
      );
      return;
    }
    try {
      const department = parsePastedBroadsheet(pasteText, pasteDepartment);
      acceptData([department], "PASTE");
      toast.success(
        `${department.students.length} student records are ready for review.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The pasted table is invalid.",
      );
    }
  };

  const handleSave = async () => {
    if (!importContextReady) {
      toast.error("Use a valid academic session and semester before saving.");
      return;
    }
    if (!tableData.length) {
      toast.error("There are no calculated results to save.");
      return;
    }
    setIsSaving(true);
    setSaveValidationError(null);
    toast.loading("Creating draft import…", { id: "save" });
    try {
      const importPayload = {
        departments: tableData.map((department) => ({
          name: department.name,
          courses: department.courses.map((course) => ({
            code: course.code,
            title: course.title,
            unit: Number(course.unit),
          })),
          students: department.students.map((student) => ({
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
        })),
        sessionLabel,
        semester,
        source: importSource,
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
          tableData,
        );
        setSaveValidationError(validationError);
        toast.error(validationError.title, { id: "save" });
        return;
      }

      toast.success(
        "Draft saved. Review it in the Result Portal, then publish when ready.",
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
    setTableData([]);
    setIsProcessed(false);
    setSaveValidationError(null);
    setPasteText("");
    setPasteDepartment("");
    setImportSource("UPLOAD");
  };

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
                        {studentCount} students across {tableData.length}{" "}
                        department{tableData.length === 1 ? "" : "s"}. Check the
                        records below, then create a private draft.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleMergeClick}
                        variant="outline"
                        disabled={isProcessing}
                      >
                        <FileUpIcon className="mr-2 size-4" /> Merge DOCX
                      </Button>
                      <input
                        ref={fileInputRef}
                        className="hidden"
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleMergeFileChange}
                      />
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
                        {sessionLabel.trim()} · {semesterLabel(semester)} ·{" "}
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
                  <SectionCards tableData={tableData} />
                </div>
                <div className="review-stagger review-delay-2 px-4 lg:px-6">
                  <ChartBar tableData={tableData} />
                </div>
                <div className="review-stagger review-delay-3">
                  <DataTable departments={tableData} />
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
                    Prepare a semester result for review
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Set the academic context first, import one department&apos;s
                    broadsheet, then review the calculated results before saving
                    a private draft.
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
                          1–2 is ND1; 3–4 is ND2.
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
                        : "This context is attached to the entire import and cannot be guessed from student rows."}
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
                          Import result data
                        </CardTitle>
                        <CardDescription>
                          Upload a broadsheet or paste a table copied directly
                          from Excel or Google Sheets.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <FileUploadDropzone
                      onUpload={handleFileUpload}
                      isProcessing={isProcessing}
                      disabled={!importContextReady}
                      title="Upload a semester broadsheet"
                      description={
                        importContextReady
                          ? "Upload an Excel broadsheet or DOCX result slip. You can review the calculated result before it is saved."
                          : "Complete the academic session and programme semester above to unlock import."
                      }
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                          <ClipboardPasteIcon className="size-4" /> Paste a
                          result table instead
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use this for a clean tab-separated table without
                          creating a file first.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPastePanel((open) => !open)}
                        disabled={!importContextReady}
                      >
                        {showPastePanel ? "Close paste area" : "Paste results"}
                      </Button>
                    </div>
                    {showPastePanel && (
                      <div className="mt-5 grid gap-4">
                        <div className="grid gap-1.5">
                          <Label htmlFor="paste-department">Department</Label>
                          <Input
                            id="paste-department"
                            value={pasteDepartment}
                            onChange={(event) =>
                              setPasteDepartment(event.target.value)
                            }
                            placeholder="Department of Computer Science"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="pasted-results">
                            Tab-separated results
                          </Label>
                          <Textarea
                            id="pasted-results"
                            value={pasteText}
                            onChange={(event) =>
                              setPasteText(event.target.value)
                            }
                            rows={9}
                            placeholder={
                              "Matric No\tName\tCSC 101 (3)\tMTH 111 (3)\nECT25/COM/001\tAda Obi\tA\tBC"
                            }
                            className="resize-y font-mono text-xs"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Required columns: <strong>Matric No</strong>,{" "}
                          <strong>Name</strong>, and courses written like{" "}
                          <strong>CSC 101 (3)</strong>, where 3 is the course
                          unit.
                        </p>
                        <div>
                          <Button onClick={handlePaste}>
                            <CheckCircle2Icon className="mr-2 size-4" />{" "}
                            Validate pasted table
                          </Button>
                        </div>
                      </div>
                    )}
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
