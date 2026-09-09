import { formatDepartmentDisplayName, type DepartmentData } from "@/lib/cgpa-calculator";

const STORAGE_KEY = "cgpa-calculator:parsed-results:v2";
const CONTEXT_STORAGE_KEY = "cgpa-calculator:import-context:v2";

export type ParsedResultsContext = {
  sessionLabel: string;
  semester: number;
};

export function loadParsedResults(): DepartmentData[] {
  if (typeof window === "undefined") return [];

  try {
    const storedResults = window.sessionStorage.getItem(STORAGE_KEY);
    const parsedResults = storedResults ? JSON.parse(storedResults) : [];
    if (!Array.isArray(parsedResults)) return [];

    return parsedResults.map((dept) => ({
      ...dept,
      name: formatDepartmentDisplayName(dept.name),
    }));
  } catch {
    return [];
  }
}

export function saveParsedResults(results: DepartmentData[]) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function loadParsedResultsContext(): ParsedResultsContext | null {
  if (typeof window === "undefined") return null;

  try {
    const storedContext = window.sessionStorage.getItem(CONTEXT_STORAGE_KEY);
    const context = storedContext ? JSON.parse(storedContext) : null;
    if (
      !context ||
      typeof context.sessionLabel !== "string" ||
      !Number.isInteger(context.semester) ||
      context.semester < 1 ||
      context.semester > 4
    ) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}

export function saveParsedResultsContext(context: ParsedResultsContext) {
  window.sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
}

export function clearParsedResults() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
}
