import type { DepartmentData } from "@/lib/cgpa-calculator";

const STORAGE_KEY = "cgpa-calculator:parsed-results";

export function loadParsedResults(): DepartmentData[] {
  if (typeof window === "undefined") return [];

  try {
    const storedResults = window.sessionStorage.getItem(STORAGE_KEY);
    const parsedResults = storedResults ? JSON.parse(storedResults) : [];
    return Array.isArray(parsedResults) ? parsedResults : [];
  } catch {
    return [];
  }
}

export function saveParsedResults(results: DepartmentData[]) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}