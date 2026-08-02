"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

    return [
      {
        class: "Distinction",
        headcount: allStudents.filter((s) => s.remark === "DISTINCTION").length,
        fill: DEGREE_CLASS_COLORS.DISTINCTION,
      },
      {
        class: "Upper Credit",
        headcount: allStudents.filter((s) => s.remark === "UPPER CREDIT").length,
        fill: DEGREE_CLASS_COLORS["UPPER CREDIT"],
      },
      {
        class: "Lower Credit",
        headcount: allStudents.filter((s) => s.remark === "LOWER CREDIT").length,
        fill: DEGREE_CLASS_COLORS["LOWER CREDIT"],
      },
      {
        class: "Pass",
        headcount: allStudents.filter((s) => s.remark === "PASS").length,
        fill: DEGREE_CLASS_COLORS.PASS,
      },
      {
        class: "Fail",
        headcount: allStudents.filter((s) => ["FAIL", "PROBATION", "WITHDRAWAL"].includes(s.remark)).length,
        fill: DEGREE_CLASS_COLORS.FAIL,
      },
    ];
  }, [tableData]);

  return (
    <Card className="min-h-auto w-full @container/chart:h-[300px]">
      <CardHeader>
        <CardTitle>Class of Degree Distribution</CardTitle>
        <CardDescription>Distinction - Fail</CardDescription>
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