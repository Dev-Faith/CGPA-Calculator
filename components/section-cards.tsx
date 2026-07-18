"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { DepartmentData } from "./data-table"; // Ensure this is imported

export function SectionCards({ tableData }: { tableData: DepartmentData[] }) {
  // 1. Flatten all students from all departments into a single array for calculations
  const allStudents = tableData?.flatMap((dept) => dept.students) || [];

  // 2. Calculate the specific metrics safely
  const totalStudentsProcessed = allStudents.length;

  const distinctionCandidates = allStudents.filter(
    (student) => Number(student.gpa) >= 3.5,
  ).length;

  const probationCandidates = allStudents.filter(
    (student) => Number(student.gpa) < 2.0,
  ).length;

  // 3. Calculate Average safely (filtering out #REF! or empty strings)
  const validGpas = allStudents
    .map((s) => Number(s.gpa))
    .filter((gpa) => !isNaN(gpa));

  const averageGpa =
    validGpas.length > 0
      ? (
          validGpas.reduce((acc, curr) => acc + curr, 0) / validGpas.length
        ).toFixed(2)
      : "0.00";

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Students Processed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalStudentsProcessed}
          </CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        {/* <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 6 months
          </div>
        </CardFooter> */}
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Distinction Candidates</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {distinctionCandidates}
          </CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              -20%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            CGPA 3.50 - 4.00 <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            These are the students that seem serious about their academics
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Cohort CGPA</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {averageGpa}
          </CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Lower Credit Average
            <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            This is the average CGPA for the current cohort
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Students on Probation</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {probationCandidates}
          </CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              +4.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            CGPA below 2.00
            <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Poorest performances</div>
        </CardFooter>
      </Card>
    </div>
  );
}
