"use client";

import * as React from "react";
import {
  Calculator,
  Award,
  BookOpen,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEGREE_CLASS_COLORS } from "@/lib/degree-class-colors";

const GRADES_DATA = [
  { grade: "A", score: "75% – 100%", gp: "4.00", description: "Excellent", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { grade: "AB", score: "70% – 74%", gp: "3.50", description: "Very Good", color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
  { grade: "B", score: "65% – 69%", gp: "3.25", description: "Good", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { grade: "BC", score: "60% – 64%", gp: "3.00", description: "Fairly Good", color: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30" },
  { grade: "C", score: "55% – 59%", gp: "2.75", description: "Fair", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  { grade: "CD", score: "50% – 54%", gp: "2.50", description: "Marginal Pass", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { grade: "D", score: "45% – 49%", gp: "2.25", description: "Poor", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  { grade: "E", score: "40% – 44%", gp: "2.00", description: "Very Poor", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { grade: "F", score: "0% – 39%", gp: "0.00", description: "Fail", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
];

const REMARKS_DATA = [
  {
    remark: "DISTINCTION",
    cgpaRange: "3.50 – 4.00",
    standing: "Highest Academic Distinction",
    badgeColor: "bg-emerald-500 text-white",
    accentColor: DEGREE_CLASS_COLORS.DISTINCTION,
    description: "Conferred on candidates with exemplary performance across all registered courses.",
  },
  {
    remark: "UPPER CREDIT",
    cgpaRange: "3.00 – 3.49",
    standing: "High Academic Standing",
    badgeColor: "bg-amber-600 text-white",
    accentColor: DEGREE_CLASS_COLORS["UPPER CREDIT"],
    description: "Awarded for highly commendable and strong academic achievements.",
  },
  {
    remark: "LOWER CREDIT",
    cgpaRange: "2.50 – 2.99",
    standing: "Satisfactory Credit",
    badgeColor: "bg-cyan-600 text-white",
    accentColor: DEGREE_CLASS_COLORS["LOWER CREDIT"],
    description: "Awarded for consistent, satisfactory fulfillment of syllabus requirements.",
  },
  {
    remark: "PASS",
    cgpaRange: "2.00 – 2.49",
    standing: "Graduation Pass Threshold",
    badgeColor: "bg-blue-600 text-white",
    accentColor: DEGREE_CLASS_COLORS.PASS,
    description: "Minimum academic threshold required for diploma conferment.",
  },
  {
    remark: "FAIL",
    cgpaRange: "0.00 – 1.99",
    standing: "Below Passing Standard",
    badgeColor: "bg-rose-600 text-white",
    accentColor: DEGREE_CLASS_COLORS.FAIL,
    description: "Does not meet the graduation requirement and requires remediation/probation.",
  },
];

export function CalculationSummary() {
  return (
    <div className="px-4 lg:px-6 space-y-4">
      <Card className="border-border/60 shadow-sm overflow-hidden bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calculator className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
                  Grading Scheme & Calculation Guide
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Official NBTE (National Board for Technical Education) 4.00 Grade Point Evaluation System
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium border-primary/20 text-primary">
              Standard 4.00 Scale
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-0">
          {/* 1. Mathematical Formulas & Calculation Method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5 text-primary" />
                  <span>1. Total Credit Units (TCU)</span>
                </div>
                <div className="font-mono text-sm font-bold text-foreground bg-background/80 p-2.5 rounded-lg border">
                  TCU = ∑ Course Unit
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  The sum of all academic credit units assigned to registered courses in the semester.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>2. Total Credit Points (TCP/TGP)</span>
                </div>
                <div className="font-mono text-sm font-bold text-foreground bg-background/80 p-2.5 rounded-lg border">
                  TCP = ∑ (Grade Point × Unit)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Obtained by multiplying the numerical grade point earned in each course by its assigned credit unit.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Award className="size-3.5 text-emerald-500" />
                  <span>3. Grade Point Average (GPA)</span>
                </div>
                <div className="font-mono text-sm font-bold text-foreground bg-background/80 p-2.5 rounded-lg border">
                  GPA = TCP / TCU
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Calculated by dividing Total Credit Points (TCP) by Total Credit Units (TCU), rounded to 2 decimal places.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Grid split: Grading Scale & Class of Diploma Remarks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left column: NBTE 4.0 Letter Grade Scale */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" />
                  NBTE Letter Grade & Score Scale
                </h4>
                <span className="text-[11px] text-muted-foreground">9-tier standard</span>
              </div>

              <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                <div className="grid grid-cols-4 bg-muted/50 p-2.5 text-[11px] font-semibold text-muted-foreground border-b uppercase tracking-wider">
                  <span>Grade</span>
                  <span>Score Range</span>
                  <span className="text-center">Grade Point</span>
                  <span className="text-right">Remark</span>
                </div>
                <div className="divide-y divide-border/40 text-xs">
                  {GRADES_DATA.map((item) => (
                    <div
                      key={item.grade}
                      className="grid grid-cols-4 items-center p-2.5 hover:bg-muted/20 transition-colors"
                    >
                      <span className="font-bold">
                        <span className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded text-[11px] font-mono border ${item.color}`}>
                          {item.grade}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[11px] font-mono">
                        {item.score}
                      </span>
                      <span className="text-center font-mono font-semibold">
                        {item.gp}
                      </span>
                      <span className="text-right text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Class of Diploma Remarks */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-500" />
                  Diploma Classification & Remarks
                </h4>
                <span className="text-[11px] text-muted-foreground">CGPA Thresholds</span>
              </div>

              <div className="space-y-2">
                {REMARKS_DATA.map((rem) => (
                  <div
                    key={rem.remark}
                    className="p-3 rounded-xl border border-border/60 bg-background/80 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge className={`${rem.badgeColor} text-[10px] font-semibold tracking-wide shadow-none px-2 py-0.5`}>
                          {rem.remark}
                        </Badge>
                        <span className="text-xs font-medium text-foreground">
                          {rem.standing}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {rem.description}
                      </p>
                    </div>
                    <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        CGPA Range
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border">
                        {rem.cgpaRange}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Practical Example Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Info className="size-4" />
            </div>
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-foreground">Quick Example:</span> If a student takes <strong>COM 111 (3 Units)</strong> with grade <strong>A (4.00)</strong> and <strong>COM 112 (2 Units)</strong> with grade <strong>AB (3.50)</strong>, their Total Points are <span className="font-mono text-foreground font-semibold">(3×4.00) + (2×3.50) = 19.00 TCP</span> across <span className="font-mono text-foreground font-semibold">5 TCU</span>, yielding a GPA of <span className="font-mono text-foreground font-semibold">19.00 / 5 = 3.80</span> which is classified as <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">DISTINCTION</Badge>.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
