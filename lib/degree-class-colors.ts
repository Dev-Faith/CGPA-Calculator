export const DEGREE_CLASS_COLORS = {
  DISTINCTION: "var(--primary)",
  "UPPER CREDIT": "#d97706",
  "LOWER CREDIT": "#0891b2",
  PASS: "#2563eb",
  FAIL: "#dc2626",
  PROBATION: "#dc2626",
  WITHDRAWAL: "#dc2626",
} as const;

export function getDegreeClassColor(remark: string) {
  return DEGREE_CLASS_COLORS[remark as keyof typeof DEGREE_CLASS_COLORS] ?? "var(--muted-foreground)";
}