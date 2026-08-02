"use client";

import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  DownloadIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDegreeClassColor } from "@/lib/degree-class-colors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  downloadStudentResultPdf,
  type ResultLetterStudent,
} from "@/lib/student-result-pdf";
import { StudentResultModal } from "@/components/student-result-modal";

export const schema = z.object({
  sn: z.number(),
  name: z.string(),
  matricNo: z.string(),
  grades: z.record(z.string(), z.string()),
  tgp: z.union([z.number(), z.string()]), // string to handle "#REF!" if needed
  gpa: z.union([z.number(), z.string()]), // string to handle "#REF!" if needed
  remark: z.string(), // Relaxed to handle any dynamic text from the sheet
});

export type StudentResult = z.infer<typeof schema>;

// Type to handle multi-department data with session/semester
export type DepartmentData = {
  name: string;
  session?: string;
  semester?: string;
  courses: { code: string; unit: number }[];
  students: StudentResult[];
};

type ClassFilter = {
  value: string;
  label: string;
  remarks: readonly string[];
  colorRemark: string;
};

function buildVisibleColumns(department?: DepartmentData) {
  if (!department) return {};

  return {
    sn: true,
    name: true,
    matricNo: true,
    ...department.courses.reduce(
      (acc, course) => ({ ...acc, [course.code]: true }),
      {},
    ),
    tgp: true,
    gpa: true,
    remark: true,
  };
}

const CLASS_FILTERS: ClassFilter[] = [
  {
    value: "distinction",
    label: "Distinction",
    remarks: ["DISTINCTION"],
    colorRemark: "DISTINCTION",
  },
  {
    value: "upper-credit",
    label: "Upper Credit",
    remarks: ["UPPER CREDIT"],
    colorRemark: "UPPER CREDIT",
  },
  {
    value: "lower-credit",
    label: "Lower Credit",
    remarks: ["LOWER CREDIT"],
    colorRemark: "LOWER CREDIT",
  },
  { value: "pass", label: "Pass", remarks: ["PASS"], colorRemark: "PASS" },
  {
    value: "fail",
    label: "Fail",
    remarks: ["FAIL", "PROBATION", "WITHDRAWAL"],
    colorRemark: "FAIL",
  },
];

export function DataTable({ departments }: { departments: DepartmentData[] }) {
  // Department State
  const [activeDeptName, setActiveDeptName] = React.useState<string>(
    departments?.[0]?.name || "",
  );

  const activeDepartment = React.useMemo(() => {
    return (
      departments?.find((d) => d.name === activeDeptName) || departments?.[0]
    );
  }, [departments, activeDeptName]);

  const [activeTab, setActiveTab] = React.useState("all-students");
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    new Set(),
  );
  const [previewStudent, setPreviewStudent] =
    React.useState<ResultLetterStudent | null>(null);
  const [pdfJob, setPdfJob] = React.useState<{
    matricNo: string;
    action: "view" | "download";
  } | null>(null);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [visibleColumns, setVisibleColumns] = React.useState<
    Record<string, boolean>
  >(() => buildVisibleColumns(departments?.[0]));

  const handleDepartmentChange = (departmentName: string) => {
    if (!departmentName) return;

    const nextDepartment = departments.find(
      (dept) => dept.name === departmentName,
    );
    setActiveDeptName(departmentName);
    setVisibleColumns(buildVisibleColumns(nextDepartment));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSelectedRows(new Set());
  };

  const filteredData = React.useMemo(() => {
    if (!activeDepartment || activeTab === "all-students")
      return activeDepartment?.students ?? [];

    const selectedClass = CLASS_FILTERS.find(
      (filter) => filter.value === activeTab,
    );
    return selectedClass
      ? activeDepartment.students.filter((student) =>
          selectedClass.remarks.includes(student.remark),
        )
      : activeDepartment.students;
  }, [activeDepartment, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSelectedRows(new Set());
  };

  // Handle empty state if no data is passed
  if (!departments || departments.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg m-4 shadow-sm">
        No data available. Please upload a broadsheet.
      </div>
    );
  }

  const pageCount = Math.ceil(filteredData.length / pagination.pageSize);
  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map((d) => d.matricNo)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const handleDownload = () => {
    if (!activeDepartment) return;
    toast.loading("Generating broadsheet...", { id: "download" });

    try {
      const activeCourses = activeDepartment.courses.filter(
        (c) => visibleColumns[c.code],
      );

      // Uses Dynamic Session and Semester from the Excel Sheet
      const sessionStr = activeDepartment.session
        ? `SESSION: ${activeDepartment.session}`
        : "SESSION: N/A";
      const semesterStr = activeDepartment.semester
        ? `SEMESTER: ${activeDepartment.semester}`
        : "SEMESTER: N/A";

      let csv = `${sessionStr},DEPARTMENT: ${activeDepartment.name},,,${semesterStr}\n`;

      const headers = [];
      if (visibleColumns.sn) headers.push("S/N");
      if (visibleColumns.name) headers.push("NAME");
      if (visibleColumns.matricNo) headers.push("MATRIC NO");
      activeCourses.forEach((c) => headers.push(c.code));
      if (visibleColumns.tgp) headers.push("TGP");
      if (visibleColumns.gpa) headers.push("GPA");
      if (visibleColumns.remark) headers.push("REMARK");

      csv += headers.map((h) => `"${h}"`).join(",") + "\n";

      const subHeaders = [];
      if (visibleColumns.sn) subHeaders.push("");
      if (visibleColumns.name) subHeaders.push("");
      if (visibleColumns.matricNo) subHeaders.push("COURSE UNIT");
      activeCourses.forEach((c) => subHeaders.push(c.unit));
      if (visibleColumns.tgp) subHeaders.push("");
      if (visibleColumns.gpa) subHeaders.push("");
      if (visibleColumns.remark) subHeaders.push("");

      csv += subHeaders.map((h) => `"${h}"`).join(",") + "\n";

      filteredData.forEach((row) => {
        const rowData = [];
        if (visibleColumns.sn) rowData.push(row.sn);
        if (visibleColumns.name) rowData.push(`"${row.name}"`);
        if (visibleColumns.matricNo) rowData.push(`"${row.matricNo}"`);
        activeCourses.forEach((c) => rowData.push(row.grades[c.code] || ""));
        if (visibleColumns.tgp) rowData.push(row.tgp);
        if (visibleColumns.gpa)
          rowData.push(
            typeof row.gpa === "number" ? row.gpa.toFixed(2) : row.gpa,
          );
        if (visibleColumns.remark) rowData.push(row.remark);

        csv += rowData.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${activeDepartment.name.replace(/\s+/g, "_")}_Broadsheet.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Broadsheet downloaded successfully!", { id: "download" });
    } catch {
      toast.error("Failed to generate download.", { id: "download" });
    }
  };

  const handleStudentPdf = async (
    row: StudentResult,
    action: "view" | "download",
  ) => {
    if (!activeDepartment) return;

    const pdfStudent = {
      name: row.name,
      matricNo: row.matricNo,
      grades: row.grades,
      gpa: row.gpa,
      remark: row.remark,
    };

    setPdfJob({ matricNo: row.matricNo, action });

    try {
      if (action === "view") {
        setPreviewStudent(pdfStudent);
        return;
      }

      toast.loading(`Downloading PDF for ${row.matricNo}...`, {
        id: "student-pdf",
      });
      await downloadStudentResultPdf(pdfStudent, activeDepartment);
      toast.success(`PDF downloaded for ${row.matricNo}.`, {
        id: "student-pdf",
      });
    } catch {
      toast.error(`Failed to generate PDF for ${row.matricNo}.`, {
        id: "student-pdf",
      });
    } finally {
      setPdfJob(null);
    }
  };

  const classCounts = Object.fromEntries(
    CLASS_FILTERS.map((filter) => [
      filter.value,
      activeDepartment.students.filter((student) =>
        filter.remarks.includes(student.remark),
      ).length,
    ]),
  ) as Record<string, number>;

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4 lg:px-6 mb-4">
        {/* Left Side: Mobile View Selector & Desktop TabsList */}
        <div>
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select
            value={activeTab}
            onValueChange={(val) => val && handleTabChange(val)}
          >
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all-students">All Students</SelectItem>
                {CLASS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <TabsList className="hidden h-auto flex-wrap **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="all-students">All Students</TabsTrigger>
            {CLASS_FILTERS.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="gap-2"
              >
                {filter.label}
                <Badge
                  variant="secondary"
                  className="h-5 rounded-full px-1.5 py-0 text-xs text-white"
                  style={{
                    backgroundColor: getDegreeClassColor(filter.colorRemark),
                  }}
                >
                  {classCounts[filter.value]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Right Side Actions: Department Switcher, Columns, Download */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Switcher */}
          {departments.length > 1 && (
            <Select
              value={activeDeptName}
              onValueChange={(val) => val && handleDepartmentChange(val)}
            >
              <SelectTrigger className="min-w-auto h-8 text-xs bg-muted/50 border-dashed">
                <SelectValue placeholder="Select Dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className="min-w-auto">
                  {departments.map((dept) => (
                    <SelectItem key={dept.name} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" className="gap-2" />}
            >
              <Columns3Icon className="size-4" />
              <span className="hidden sm:inline">Columns</span>
              <ChevronDownIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 max-h-80 overflow-y-auto"
            >
              <DropdownMenuCheckboxItem
                checked={visibleColumns.sn}
                onCheckedChange={() => toggleColumn("sn")}
              >
                S/N
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={() => toggleColumn("name")}
              >
                Name
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.matricNo}
                onCheckedChange={() => toggleColumn("matricNo")}
              >
                Matric No
              </DropdownMenuCheckboxItem>
              {activeDepartment.courses.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.code}
                  checked={visibleColumns[col.code]}
                  onCheckedChange={() => toggleColumn(col.code)}
                >
                  {col.code}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuCheckboxItem
                checked={visibleColumns.tgp}
                onCheckedChange={() => toggleColumn("tgp")}
              >
                TGP
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.gpa}
                onCheckedChange={() => toggleColumn("gpa")}
              >
                GPA
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.remark}
                onCheckedChange={() => toggleColumn("remark")}
              >
                Remark
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
            onClick={handleDownload}
          >
            <DownloadIcon className="size-4" />
            <span className="hidden lg:inline">Download Dept Excel</span>
            <span className="inline lg:hidden">Export</span>
          </Button>
        </div>
      </div>

      {pdfJob && (
        <div className="px-4 lg:px-6">
          <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin text-primary" />
            <span>
              {pdfJob.action === "view"
                ? `Opening PDF for ${pdfJob.matricNo}...`
                : `Preparing download for ${pdfJob.matricNo}...`}
            </span>
          </div>
        </div>
      )}

      <TabsContent
        value={activeTab}
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6 outline-none"
      >
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/50">
                {/* Main Header Row */}
                <TableRow className="border-b">
                  <TableHead className="w-12 text-center border-r">
                    <Checkbox
                      checked={
                        selectedRows.size > 0 &&
                        selectedRows.size === filteredData.length
                      }
                      indeterminate={
                        selectedRows.size > 0 &&
                        selectedRows.size < filteredData.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  {visibleColumns.sn && (
                    <TableHead className="font-bold border-r">S/N</TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead className="font-bold min-w-[200px] border-r">
                      NAME
                    </TableHead>
                  )}
                  {visibleColumns.matricNo && (
                    <TableHead className="font-bold min-w-[150px] border-r">
                      MATRIC NO
                    </TableHead>
                  )}

                  {/* Dynamic Course Headers */}
                  {activeDepartment.courses.map(
                    (c) =>
                      visibleColumns[c.code] && (
                        <TableHead
                          key={c.code}
                          className="font-bold text-center border-r min-w-[80px]"
                        >
                          {c.code}
                        </TableHead>
                      ),
                  )}

                  {visibleColumns.tgp && (
                    <TableHead className="font-bold text-center border-r">
                      TGP
                    </TableHead>
                  )}
                  {visibleColumns.gpa && (
                    <TableHead className="font-bold text-center border-r">
                      GPA
                    </TableHead>
                  )}
                  {visibleColumns.remark && (
                    <TableHead className="font-bold">REMARK</TableHead>
                  )}
                  <TableHead className="w-12"></TableHead>
                </TableRow>

                {/* Sub Header Row (Course Units) */}
                <TableRow className="border-b bg-muted/20">
                  <TableHead className="border-r"></TableHead>
                  {visibleColumns.sn && (
                    <TableHead className="border-r"></TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead className="border-r"></TableHead>
                  )}
                  {visibleColumns.matricNo && (
                    <TableHead className="font-bold text-right border-r">
                      COURSE UNIT
                    </TableHead>
                  )}

                  {/* Dynamic Course Units */}
                  {activeDepartment.courses.map(
                    (c) =>
                      visibleColumns[c.code] && (
                        <TableHead
                          key={`${c.code}-unit`}
                          className="font-bold text-center border-r"
                        >
                          {c.unit}
                        </TableHead>
                      ),
                  )}

                  {visibleColumns.tgp && (
                    <TableHead className="border-r text-center font-bold">
                      {activeDepartment.courses.reduce(
                        (total, course) => total + course.unit,
                        0,
                      )}
                    </TableHead>
                  )}
                  {visibleColumns.gpa && (
                    <TableHead className="border-r"></TableHead>
                  )}
                  {visibleColumns.remark && <TableHead></TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => {
                    return (
                      <TableRow
                        key={`${row.matricNo}-${index}`}
                        data-state={
                          selectedRows.has(row.matricNo) && "selected"
                        }
                      >
                        <TableCell className="text-center py-2 border-r">
                          <Checkbox
                            checked={selectedRows.has(row.matricNo)}
                            onCheckedChange={() =>
                              toggleSelectRow(row.matricNo)
                            }
                            aria-label={`Select ${row.matricNo}`}
                          />
                        </TableCell>
                        {visibleColumns.sn && (
                          <TableCell className="font-medium text-center py-2 border-r">
                            {row.sn}
                          </TableCell>
                        )}
                        {visibleColumns.name && (
                          <TableCell
                            className="whitespace-nowrap py-2 border-r"
                            title={row.name}
                          >
                            {row.name}
                          </TableCell>
                        )}
                        {visibleColumns.matricNo && (
                          <TableCell className="font-mono py-2 border-r">
                            {row.matricNo}
                          </TableCell>
                        )}

                        {/* Dynamic Course Grades */}
                        {activeDepartment.courses.map(
                          (c) =>
                            visibleColumns[c.code] && (
                              <TableCell
                                key={`${row.matricNo}-${c.code}`}
                                className="text-center font-medium py-2 border-r"
                              >
                                {row.grades[c.code] || "-"}
                              </TableCell>
                            ),
                        )}

                        {visibleColumns.tgp && (
                          <TableCell className="text-center font-mono py-2 border-r">
                            {row.tgp}
                          </TableCell>
                        )}
                        {visibleColumns.gpa && (
                          <TableCell className="text-center font-mono py-2 border-r">
                            {typeof row.gpa === "number"
                              ? row.gpa.toFixed(2)
                              : row.gpa}
                          </TableCell>
                        )}
                        {visibleColumns.remark && (
                          <TableCell className="py-2">
                            <Badge
                              className="gap-1 border-transparent px-2 py-0.5 font-medium text-white transition-opacity hover:opacity-90"
                              style={{
                                backgroundColor: getDegreeClassColor(
                                  row.remark,
                                ),
                              }}
                            >
                              {row.remark}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  className="flex size-8 p-0 text-muted-foreground data-[state=open]:bg-muted"
                                  size="icon"
                                />
                              }
                            >
                              <EllipsisVerticalIcon className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleStudentPdf(row, "view");
                                }}
                              >
                                <EyeIcon className="mr-2 size-4" />
                                View PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  void handleStudentPdf(row, "download");
                                }}
                              >
                                <FileTextIcon className="mr-2 size-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                Exclude Student
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={20}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No students found in this department.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {selectedRows.size} of {filteredData.length} row(s) selected.
          </div>

          <div className="flex w-full items-center justify-between gap-4 lg:w-fit lg:justify-end">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(val) =>
                  val &&
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: Number(val),
                    pageIndex: 0,
                  }))
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-[70px]"
                  id="rows-per-page"
                >
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} of{" "}
              {pageCount}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: prev.pageIndex - 1,
                  }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: prev.pageIndex + 1,
                  }))
                }
                disabled={
                  pagination.pageIndex >= pageCount - 1 || pageCount === 0
                }
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: pageCount - 1,
                  }))
                }
                disabled={
                  pagination.pageIndex >= pageCount - 1 || pageCount === 0
                }
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <StudentResultModal
        student={previewStudent}
        department={activeDepartment}
        open={Boolean(previewStudent)}
        onOpenChange={(open) => {
          if (!open) setPreviewStudent(null);
        }}
      />
    </Tabs>
  );
}
