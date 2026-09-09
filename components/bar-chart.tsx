"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DEGREE_CLASS_COLORS } from "@/lib/degree-class-colors";
import { DepartmentData } from "./data-table";

export const description = "A bar chart";

const chartConfig = {
  headcount: { label: "Students" },
  distinction: { label: "Distinction", color: DEGREE_CLASS_COLORS.DISTINCTION },
  upperCredit: { label: "Upper Credit", color: DEGREE_CLASS_COLORS["UPPER CREDIT"] },
  lowerCredit: { label: "Lower Credit", color: DEGREE_CLASS_COLORS["LOWER CREDIT"] },
  pass: { label: "Pass", color: DEGREE_CLASS_COLORS.PASS },
  fail: { label: "Fail", color: DEGREE_CLASS_COLORS.FAIL },
} satisfies ChartConfig;

const shortClassLabels: Record<string, string> = {
  Distinction: "Dist.",
  "Upper Credit": "Upper",
  "Lower Credit": "Lower",
  Pass: "Pass",
  Fail: "Fail",
};

function DegreeClassTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const fullLabel = payload?.value ?? "";

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text x={0} y={14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        <tspan className="sm:hidden">{shortClassLabels[fullLabel]}</tspan>
        <tspan className="hidden sm:inline">{fullLabel}</tspan>
      </text>
    </g>
  );
}

export function ChartBar({ tableData }: { tableData: DepartmentData[] }) {
  const dynamicChartData = React.useMemo(() => {
    if (!tableData) return [];

    const allStudents = tableData.flatMap((d) => d.students);
    const studentMap = new Map<string, number[]>();

    for (const student of allStudents) {
      const matric = student.matricNo.trim().toUpperCase();
      const gpa = Number(student.gpa);
      if (!matric || isNaN(gpa)) continue;

      if (!studentMap.has(matric)) {
        studentMap.set(matric, []);
      }
      studentMap.get(matric)!.push(gpa);
    }

    // Calculate each unique student's average GPA and remark
    const uniqueRemarks: Record<string, number> = {
      DISTINCTION: 0,
      "UPPER CREDIT": 0,
      "LOWER CREDIT": 0,
      PASS: 0,
      FAIL: 0,
    };

    for (const gpas of studentMap.values()) {
      const avgGpa = gpas.reduce((sum, gpa) => sum + gpa, 0) / gpas.length;

      if (avgGpa >= 3.5) uniqueRemarks["DISTINCTION"]++;
      else if (avgGpa >= 3.0) uniqueRemarks["UPPER CREDIT"]++;
      else if (avgGpa >= 2.5) uniqueRemarks["LOWER CREDIT"]++;
      else if (avgGpa >= 2.0) uniqueRemarks["PASS"]++;
      else uniqueRemarks["FAIL"]++;
    }

    return [
      {
        class: "Distinction",
        headcount: uniqueRemarks["DISTINCTION"],
        fill: DEGREE_CLASS_COLORS.DISTINCTION,
      },
      {
        class: "Upper Credit",
        headcount: uniqueRemarks["UPPER CREDIT"],
        fill: DEGREE_CLASS_COLORS["UPPER CREDIT"],
      },
      {
        class: "Lower Credit",
        headcount: uniqueRemarks["LOWER CREDIT"],
        fill: DEGREE_CLASS_COLORS["LOWER CREDIT"],
      },
      {
        class: "Pass",
        headcount: uniqueRemarks["PASS"],
        fill: DEGREE_CLASS_COLORS.PASS,
      },
      {
        class: "Fail",
        headcount: uniqueRemarks["FAIL"],
        fill: DEGREE_CLASS_COLORS.FAIL,
      },
    ];
  }, [tableData]);

  const departmentContext = React.useMemo(() => {
    if (!tableData || tableData.length === 0) return null;
    const dept = tableData[0];
    return {
      name: dept.name,
      semester: dept.semester && dept.semester !== "N/A" ? dept.semester : null,
      level: dept.level && dept.level !== "N/A" ? dept.level : null,
      session: dept.session && dept.session !== "N/A" ? dept.session : null,
    };
  }, [tableData]);

  return (
    <Card className="min-h-auto w-full @container/chart:h-[300px]">
      <CardHeader>
        <CardTitle>Class of Degree Distribution</CardTitle>
        <CardDescription>
          {departmentContext ? (
            <span className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-foreground">{departmentContext.name}</span>
              {(departmentContext.semester || departmentContext.level) && <span>•</span>}
              {departmentContext.semester && <span>{departmentContext.semester}</span>}
              {departmentContext.semester && departmentContext.level && <span>—</span>}
              {departmentContext.level && <span>{departmentContext.level}</span>}
              {departmentContext.session && (
                <>
                  <span>•</span>
                  <span>{departmentContext.session}</span>
                </>
              )}
            </span>
          ) : (
            "Distinction - Fail"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={dynamicChartData} margin={{ bottom: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="class"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={<DegreeClassTick />}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="headcount" radius={8}>
              {dynamicChartData.map((entry) => (
                <Cell key={entry.class} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
