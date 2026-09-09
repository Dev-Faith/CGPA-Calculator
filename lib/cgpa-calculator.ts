
// Define the exact student result interface for our UI
export interface StudentResult {
  sn: number;
  name: string;
  matricNo: string;
  grades: Record<string, string>; // e.g. { "MTH 101": "A" }
  scores?: Record<string, number | string>; // e.g. { "MTH 101": 75 }
  tgp: number;
  gpa: number | string;
  remark: string;
}

// Group data by sheet/department for the UI
export interface DepartmentData {
  name: string;
  session?: string;
  semester?: string;
  level?: string;
  courses: {
    code: string;
    unit: number;
    title?: string;
  }[];
  students: StudentResult[];
};

type SheetCell = string | number | boolean | Date | null | undefined;

// NBTE 4.0 Grading Scale Mapping
const NBTE_SCALE: Record<string, number> = {
  'A': 4.00,
  'AB': 3.50,
  'B': 3.00,
  'BC': 2.50,
  'C': 2.00,
  'CD': 1.50,
  'D': 1.00,
  'E': 0.50,
  'F': 0.00,
};

/**
 * Converts a raw cell value (either a letter grade like "AB" or a numeric score like 72)
 * into the corresponding NBTE grade point.
 */
function getGradePoint(value: string | number): number | null {
  if (value === undefined || value === null || value === '') return null;

  // If the lecturer entered raw numeric scores (e.g., 76 instead of 'A')
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const score = Number(value);
    if (score >= 75) return 4.00; // A
    if (score >= 70) return 3.50; // AB
    if (score >= 65) return 3.00; // B
    if (score >= 60) return 2.50; // BC
    if (score >= 55) return 2.00; // C
    if (score >= 50) return 1.50; // CD
    if (score >= 45) return 1.00; // D
    if (score >= 40) return 0.50; // E
    return 0.00; // F
  }

  // If the lecturer entered letter grades (e.g., "AB")
  const letterGrade = String(value).toUpperCase().trim();
  if (NBTE_SCALE[letterGrade] !== undefined) {
    return NBTE_SCALE[letterGrade];
  }

  // Treat unrecognized strings (like "ABS" or "NR") as null so they don't crash the math
  return null;
}

export function gradeForScore(score: number): string {
  if (score >= 75) return "A";
  if (score >= 70) return "AB";
  if (score >= 65) return "B";
  if (score >= 60) return "BC";
  if (score >= 55) return "C";
  if (score >= 50) return "CD";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}


function getRemark(cgpa: number): string {
  if (cgpa >= 3.50) return "DISTINCTION";
  if (cgpa >= 3.00) return "UPPER CREDIT";
  if (cgpa >= 2.50) return "LOWER CREDIT";
  if (cgpa >= 2.00) return "PASS";
  return "FAIL";
}

export const KNOWN_DEPT_CODES: Record<string, string> = {
  PAD: "DEPARTMENT OF PUBLIC ADMINISTRATION",
  COM: "DEPARTMENT OF COMPUTER SCIENCE",
  CSE: "DEPARTMENT OF COMPUTER SOFTWARE ENGINEERING",
  CS: "DEPARTMENT OF COMPUTER SCIENCE",
  BAM: "DEPARTMENT OF BUSINESS ADMINISTRATION",
  BUS: "DEPARTMENT OF BUSINESS ADMINISTRATION",
  ACC: "DEPARTMENT OF ACCOUNTANCY",
  MAC: "DEPARTMENT OF MASS COMMUNICATION",
  MCM: "DEPARTMENT OF MASS COMMUNICATION",
  SLT: "DEPARTMENT OF SCIENCE LABORATORY TECHNOLOGY",
  EEE: "DEPARTMENT OF ELECTRICAL & ELECTRONICS ENGINEERING",
  EEC: "DEPARTMENT OF ELECTRICAL & ELECTRONICS ENGINEERING",
  STA: "DEPARTMENT OF STATISTICS",
  BF: "DEPARTMENT OF BANKING & FINANCE",
  BNF: "DEPARTMENT OF BANKING & FINANCE",
  MKT: "DEPARTMENT OF MARKETING",
  OTM: "DEPARTMENT OF OFFICE TECHNOLOGY AND MANAGEMENT",
  LIS: "DEPARTMENT OF LIBRARY AND INFORMATION SCIENCE",
  ARC: "DEPARTMENT OF ARCHITECTURAL TECHNOLOGY",
  BLD: "DEPARTMENT OF BUILDING TECHNOLOGY",
  QS: "DEPARTMENT OF QUANTITY SURVEYING",
  URP: "DEPARTMENT OF URBAN AND REGIONAL PLANNING",
  CIV: "DEPARTMENT OF CIVIL ENGINEERING",
  CVE: "DEPARTMENT OF CIVIL ENGINEERING",
  MEC: "DEPARTMENT OF MECHANICAL ENGINEERING",
  MEE: "DEPARTMENT OF MECHANICAL ENGINEERING",
  CTE: "DEPARTMENT OF COMPUTER ENGINEERING",
  FST: "DEPARTMENT OF FOOD SCIENCE AND TECHNOLOGY",
};

/**
 * Returns the full official department title (e.g. "DEPARTMENT OF PUBLIC ADMINISTRATION")
 * for any raw tab name, department string, or abbreviation.
 * e.g. "MASTER SHEET FOR PAD25" -> "DEPARTMENT OF PUBLIC ADMINISTRATION"
 * e.g. "PAD25" -> "DEPARTMENT OF PUBLIC ADMINISTRATION"
 */
export function formatDepartmentDisplayName(name?: string): string {
  if (!name) return "DEPARTMENT";
  const trimmed = name.trim();

  // If already clean "DEPARTMENT OF ..." without "MASTER SHEET"
  if (/^DEPARTMENT OF [A-Z0-9 &]+$/i.test(trimmed) && !/MASTER\s+SHEET/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Strip common sheet prefixes like "MASTER SHEET FOR", "BROADSHEET FOR", etc.
  let clean = trimmed.replace(/^(?:MASTER\s+SHEET\s+FOR|BROADSHEET\s+FOR|RESULT\s+FOR|SHEET\s+FOR)\s+/i, "").trim();
  clean = clean.replace(/^(?:DEPARTMENT|DEPT\.?|PROGRAMME|PROGRAM)\s+(?:OF|IN|:)\s*/i, "").trim();
  clean = clean.replace(/^DEPARTMENT\s*:\s*/i, "").trim();
  clean = clean.replace(/,\s*ERIN\s+OSUN.*$/i, "").trim();

  // Extract alphanumeric code like "PAD25" -> "PAD"
  const lettersOnly = clean.replace(/[^A-Za-z]/g, "").trim().toUpperCase();
  if (KNOWN_DEPT_CODES[lettersOnly]) {
    return KNOWN_DEPT_CODES[lettersOnly];
  }

  // Check known abbreviations anywhere in text
  for (const [code, fullName] of Object.entries(KNOWN_DEPT_CODES)) {
    const regex = new RegExp(`\\b${code}\\b`, "i");
    if (regex.test(trimmed) || regex.test(clean)) {
      return fullName;
    }
  }

  if (clean && clean.length > 2) {
    const withoutNumbers = clean.replace(/\d+/g, "").trim().toUpperCase();
    if (withoutNumbers) {
      return `DEPARTMENT OF ${withoutNumbers}`;
    }
  }

  return trimmed;
}

/**
 * Normalizes and extracts the actual department name from the broadsheet contents.
 */
export function extractDepartmentName(
  rows: SheetCell[][],
  headerRowIndex: number,
  sheetName: string,
  courses: { code: string }[] = [],
  sampleMatrics: string[] = []
): string {
  // 1. Scan rows before the header row for explicit "DEPARTMENT OF ..." or "DEPT OF ..."
  const scanLimit = headerRowIndex > 0 ? headerRowIndex : Math.min(rows.length, 12);

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i];
    if (!row) continue;

    for (const cell of row) {
      if (!cell) continue;
      const str = String(cell).replace(/\s+/g, " ").trim();
      const upper = str.toUpperCase();

      // Skip institution headers like "ELERINMOSA COLLEGE OF TECHNOLOGY..." unless it has "DEPARTMENT OF"
      if (
        (upper.includes("COLLEGE OF") || upper.includes("INSTITUTE OF") || upper.includes("POLYTECHNIC")) &&
        !upper.includes("DEPARTMENT OF") &&
        !upper.includes("DEPT OF") &&
        !upper.includes("DEPT.")
      ) {
        continue;
      }

      // Check for explicit "DEPARTMENT OF ..." / "DEPT OF ..." / "PROGRAMME OF ..."
      const match = str.match(/(?:DEPARTMENT|DEPT\.?|PROGRAMME|PROGRAM)\s+(?:OF|IN|:)\s*([^,;\n\r]+)/i);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Clean trailing location like ", ERIN OSUN"
        extracted = extracted.replace(/,\s*ERIN\s+OSUN.*$/i, "").trim();
        if (extracted.length > 2) {
          const cleanTitle = extracted.toUpperCase().replace(/^(?:DEPARTMENT|DEPT\.?|PROGRAMME|PROGRAM)\s+OF\s+/i, "");
          return `DEPARTMENT OF ${cleanTitle}`;
        }
      }

      // Direct startsWith
      if (upper.startsWith("DEPARTMENT OF ") || upper.startsWith("DEPT OF ") || upper.startsWith("DEPT. OF ")) {
        const extracted = str.trim().replace(/,\s*ERIN\s+OSUN.*$/i, "").trim().toUpperCase();
        return extracted;
      }
    }
  }

  // 2. Check course codes prefix (e.g., PAD 111, PAD 112 -> PAD)
  const codePrefixCounts: Record<string, number> = {};
  for (const course of courses) {
    const m = course.code.match(/^([A-Z]{2,5})/i);
    if (m) {
      const p = m[1].toUpperCase();
      if (!["GNS", "GST", "EED", "ED", "MTH", "STP"].includes(p)) {
        codePrefixCounts[p] = (codePrefixCounts[p] || 0) + 1;
      }
    }
  }

  const topPrefix = Object.keys(codePrefixCounts).sort((a, b) => codePrefixCounts[b] - codePrefixCounts[a])[0];
  if (topPrefix && KNOWN_DEPT_CODES[topPrefix]) {
    return KNOWN_DEPT_CODES[topPrefix];
  }

  // 3. Check sample matric numbers (e.g. ECT25/PAD/001 -> PAD)
  for (const matric of sampleMatrics) {
    const match = matric.match(/\/(?:ND|NID|HND|[A-Z]{2,4}\d{0,2})\/([A-Z]{2,5})\//i) || matric.match(/\/([A-Z]{2,5})\//i);
    if (match && match[1]) {
      const code = match[1].toUpperCase();
      if (KNOWN_DEPT_CODES[code]) {
        return KNOWN_DEPT_CODES[code];
      }
    }
  }

  // 4. Fallback: Normalize the sheet tab name (e.g. "MASTER SHEET FOR PAD25" -> "DEPARTMENT OF PUBLIC ADMINISTRATION")
  return formatDepartmentDisplayName(sheetName);
}

/**
 * Extracts the clean Programme / Discipline name for the NID award certificate.
 * e.g., "DEPARTMENT OF PUBLIC ADMINISTRATION" -> "PUBLIC ADMINISTRATION"
 * e.g., "MASTER SHEET FOR PAD25" -> "PUBLIC ADMINISTRATION"
 */
export function formatProgrammeName(departmentName?: string): string {
  if (!departmentName) return "NID";
  const deptDisplay = formatDepartmentDisplayName(departmentName);
  return deptDisplay.replace(/^DEPARTMENT\s+OF\s+/i, "").trim() || "NID";
}
