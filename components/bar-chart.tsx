"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
import { DepartmentData } from "./data-table"; // Adjust path if needed

export const description = "A bar chart";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartBar({ tableData }: { tableData: DepartmentData[] }) {
  // Dynamically calculate the chart data from the uploaded Excel sheet
  const dynamicChartData = React.useMemo(() => {
    if (!tableData) return [];

    // Flatten all students into one array
    const allStudents = tableData.flatMap((d) => d.students);

    return [
      {
        class: "Distinction",
        headcount: allStudents.filter((s) => s.remark === "DISTINCTION").length,
      },
      {
        class: "Upper Credit",
        headcount: allStudents.filter((s) => s.remark === "UPPER CREDIT")
          .length,
      },
      {
        class: "Lower Credit",
        headcount: allStudents.filter((s) => s.remark === "LOWER CREDIT")
          .length,
      },
      {
        class: "Pass",
        headcount: allStudents.filter((s) => s.remark === "PASS").length,
      },
      // Grouping all poor standings into the Fail column
      {
        class: "Fail",
        headcount: allStudents.filter((s) =>
          ["FAIL", "PROBATION", "WITHDRAWAL"].includes(s.remark),
        ).length,
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
          {/* Passed dynamicChartData here instead of the static chartData */}
          <BarChart accessibilityLayer data={dynamicChartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="class"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="headcount" fill="var(--color-desktop)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  );
}
