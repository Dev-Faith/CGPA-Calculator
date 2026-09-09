"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArchiveIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  FileClockIcon,
  FilterIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
  AlertCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { semesterLabel, type ResultStatus } from "@/lib/academic";
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

type ResultSetCard = {
  id: number;
  level: string;
  semester: number;
  version: number;
  status: string;
  source: string;
  uploadedAt: string;
  publishedAt: string | null;
  department: { id: number; code: string; name: string };
  session: { id: number; label: string };
  studentCount: number;
  gradeCount: number;
  scoreCount: number;
  missingScoreCount: number;
};

type Props = {
  initialResultSets: ResultSetCard[];
  sessions: { id: number; label: string }[];
  departments: { id: number; code: string; name: string }[];
};

const statusVariant: Record<ResultStatus, "default" | "secondary" | "outline"> =
  {
    DRAFT: "secondary",
    PUBLISHED: "default",
    ARCHIVED: "outline",
  };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function ResultPortal({
  initialResultSets,
  sessions,
  departments,
}: Props) {
  const [resultSets, setResultSets] = useState(initialResultSets);
  const [sessionFilter, setSessionFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return resultSets.filter((resultSet) => {
      if (sessionFilter && resultSet.session.label !== sessionFilter)
        return false;
      if (semesterFilter && resultSet.semester !== Number(semesterFilter))
        return false;
      if (departmentFilter && resultSet.department.code !== departmentFilter)
        return false;
      if (statusFilter && resultSet.status !== statusFilter) return false;
      return (
        !term ||
        [
          resultSet.department.name,
          resultSet.department.code,
          resultSet.session.label,
        ].some((value) => value.toLowerCase().includes(term))
      );
    });
  }, [
    departmentFilter,
    resultSets,
    search,
    semesterFilter,
    sessionFilter,
    statusFilter,
  ]);

  const statusCounts = useMemo(
    () => ({
      published: resultSets.filter((item) => item.status === "PUBLISHED")
        .length,
      draft: resultSets.filter((item) => item.status === "DRAFT").length,
      archived: resultSets.filter((item) => item.status === "ARCHIVED").length,
    }),
    [resultSets],
  );

  const updateStatus = async (
    resultSet: ResultSetCard,
    action: "publish" | "archive",
  ) => {
    const message =
      action === "publish"
        ? `Publish version ${resultSet.version}? The currently published version for this semester will be archived.`
        : "Archive this import? Students will no longer see it if it is currently published.";
    if (!window.confirm(message)) return;

    setPendingId(resultSet.id);
    setPublishError(null);
    try {
      const response = await fetch(`/api/results/${resultSet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as {
        error?: string;
        resultSet?: { status: string; publishedAt: string | null };
      };
      const updatedResultSet = body.resultSet;
      if (!response.ok || !updatedResultSet) {
        const message = body.error ?? "Unable to update result status.";
        setPublishError(message);
        throw new Error(message);
      }

      setResultSets((current) =>
        current.map((item) => {
          if (
            action === "publish" &&
            item.id !== resultSet.id &&
            item.department.id === resultSet.department.id &&
            item.session.id === resultSet.session.id &&
            item.semester === resultSet.semester &&
            item.status === "PUBLISHED"
          ) {
            return { ...item, status: "ARCHIVED" };
          }
          return item.id === resultSet.id
            ? {
                ...item,
                status: updatedResultSet.status,
                publishedAt: updatedResultSet.publishedAt ?? item.publishedAt,
              }
            : item;
        }),
      );
      toast.success(
        action === "publish"
          ? "Result published for student lookup."
          : "Result import archived.",
      );
    } catch (error) {
      if (action === "archive") {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update result status.",
        );
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="flex-1 bg-muted/20 p-4 lg:p-6">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">
              Result management
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Semester result imports
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drafts are private. Publish only after reviewing the calculated
              records and course columns.
            </p>
          </div>
          <Button render={<Link href="/" />}>New result import</Button>
        </div>

        {publishError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">
                Result could not be published
              </p>
              <p className="mt-1">{publishError}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2Icon className="size-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-semibold">
                  {statusCounts.published}
                </p>
                <p className="text-xs text-muted-foreground">
                  Published imports
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileClockIcon className="size-5 text-amber-600" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts.draft}</p>
                <p className="text-xs text-muted-foreground">
                  Drafts to review
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <ArchiveIcon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">
                  {statusCounts.archived}
                </p>
                <p className="text-xs text-muted-foreground">
                  Archived versions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FilterIcon className="size-4" /> Find an import
            </CardTitle>
            <CardDescription>
              Filter by academic period, department, or publishing state.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search department or session"
                className="pl-9"
              />
            </div>
            <select
              aria-label="Filter by session"
              value={sessionFilter}
              onChange={(event) => setSessionFilter(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All sessions</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.label}>
                  {session.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by semester"
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All semesters</option>
              {[1, 2, 3, 4].map((semester) => (
                <option key={semester} value={semester}>
                  {semesterLabel(semester)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by department"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.code}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <FileClockIcon className="mb-3 size-8 text-muted-foreground" />
              <h3 className="font-medium">No result imports found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different filter, or create a new result import.
              </p>
              <Button
                render={<Link href="/" />}
                variant="outline"
                className="mt-4"
              >
                Create import
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((resultSet) => {
              const status = resultSet.status as ResultStatus;
              return (
                <Card key={resultSet.id} className="flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <BookOpenIcon className="size-5" />
                      </div>
                      <Badge variant={statusVariant[status]}>
                        {resultSet.status}
                      </Badge>
                    </div>
                    <CardTitle className="pt-4 text-base">
                      {resultSet.department.name.replace(
                        /^DEPARTMENT OF\s+/i,
                        "",
                      )}
                    </CardTitle>
                    <CardDescription>
                      {resultSet.session.label} ·{" "}
                      {semesterLabel(resultSet.semester)} · Version{" "}
                      {resultSet.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto grid gap-4">
                    <div className="grid grid-cols-2 rounded-md border bg-muted/30 text-sm">
                      <div className="flex items-center gap-2 border-r p-3">
                        <UsersIcon className="size-4 text-muted-foreground" />
                        <div>
                          <strong className="block">
                            {resultSet.studentCount}
                          </strong>
                          <span className="text-xs text-muted-foreground">
                            Students
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <strong className="block capitalize">
                          {resultSet.source.toLowerCase()}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          Import source
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-xs ${resultSet.scoreCount > 0 ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      {resultSet.scoreCount > 0
                        ? `${resultSet.scoreCount} actual score${resultSet.scoreCount === 1 ? "" : "s"} uploaded; ready for publication`
                        : `${resultSet.missingScoreCount} course grade${resultSet.missingScoreCount === 1 ? "" : "s"} missing actual scores`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(resultSet.uploadedAt)}
                      {resultSet.publishedAt
                        ? ` · Published ${formatDate(resultSet.publishedAt)}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        render={<Link href={`/portal/${resultSet.id}`} />}
                        variant="outline"
                        size="sm"
                        className="mr-auto"
                      >
                        Review
                      </Button>
                      {resultSet.status === "DRAFT" && (
                        <Button
                          size="sm"
                          disabled={
                            pendingId === resultSet.id ||
                            resultSet.scoreCount === 0
                          }
                          title={
                            resultSet.scoreCount === 0
                              ? "Upload actual scores before publishing"
                              : undefined
                          }
                          onClick={() => updateStatus(resultSet, "publish")}
                        >
                          <SendIcon className="mr-1.5 size-3.5" /> Publish
                        </Button>
                      )}
                      {resultSet.status !== "ARCHIVED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pendingId === resultSet.id}
                          onClick={() => updateStatus(resultSet, "archive")}
                        >
                          <ArchiveIcon className="mr-1.5 size-3.5" /> Archive
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
