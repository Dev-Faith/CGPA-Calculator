import * as XLSX from 'xlsx';

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

// NBTE 4.0 Grading Scale Mapping
const NBTE_SCALE: Record<string, number> = {
  'A': 4.00,
  'AB': 3.50,
  'B': 3.25,
  'BC': 3.00,
  'C': 2.75,
  'CD': 2.50,
  'D': 2.25,
  'E': 2.00,
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
    if (score >= 65) return 3.25; // B
    if (score >= 60) return 3.00; // BC
    if (score >= 55) return 2.75; // C
    if (score >= 50) return 2.50; // CD
    if (score >= 45) return 2.25; // D
    if (score >= 40) return 2.00; // E
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
  rows: any[][],
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
        let extracted = str.trim().replace(/,\s*ERIN\s+OSUN.*$/i, "").trim().toUpperCase();
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

/**
 * Parses the uploaded broadsheet, calculates TCP/TCU/CGPA, and prepares a new workbook.
 * @param file The Excel file uploaded via the Dropzone.
 * @returns Parsed JSON structured by departments for the UI, and the updated Workbook for export.
 */
export async function processBroadsheetFile(file: File): Promise<{ 
  parsedData: DepartmentData[], 
  processedWorkbook: XLSX.WorkBook 
}> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  const departments: DepartmentData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    let headerRowIndex = -1;
    let unitRowIndex = -1;
    let matricColIndex = -1;
    let nameColIndex = -1;
    let snColIndex = -1;
    
    let session = "N/A";
    let semester = "N/A";
    let level = "N/A";

    // 1. Scan downwards to find Session, Semester, Header Row, and Unit Row
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!row) continue;
      
      const rowStr = row.join(" ").toUpperCase();
      
      if (rowStr.includes("SESSION:")) {
        const sessionMatch = rowStr.match(/SESSION:\s*([0-9\/]+)/);
        if (sessionMatch) session = sessionMatch[1];
        
        const semMatch = rowStr.match(/SEMESTER:\s*([A-Z0-9 ]+)/);
        if (semMatch) semester = semMatch[1].trim();

        const levelMatch = rowStr.match(/LEVEL:\s*([A-Z0-9 ]+)/);
        if (levelMatch) level = levelMatch[1].trim();
      }

      // Find the main header row (MATRIC NO)
      if (headerRowIndex === -1 && rowStr.includes('MATRIC NO')) {
        headerRowIndex = i;
        matricColIndex = row.findIndex(cell => String(cell).toUpperCase().includes('MATRIC NO'));
        nameColIndex = row.findIndex(cell => String(cell).toUpperCase().includes('NAME'));
        snColIndex = row.findIndex(cell => {
            const s = String(cell).toUpperCase().trim();
            return s === 'S/N' || s === 'SN';
        });
      }

      // Find the explicit COURSE UNIT row
      if (headerRowIndex !== -1 && i >= headerRowIndex && (rowStr.includes('COURSE UNIT') || rowStr.includes('CREDIT UNIT'))) {
        unitRowIndex = i;
        break; // We found both the header and the unit row, stop scanning
      }
    }

    if (headerRowIndex === -1) continue; // Skip junk sheets

    // Fallback: If "COURSE UNIT" label is entirely missing, assume it's right below the header
    if (unitRowIndex === -1) {
        unitRowIndex = headerRowIndex + 1;
    }

    const unitRow = rows[unitRowIndex] || [];
    const courses: { colIndex: number, code: string, unit: number }[] = [];
    let tgpCol = -1, gpaCol = -1, remarkCol = -1;

    // Safely determine max columns to scan
    let maxCols = rows[headerRowIndex].length;
    for (let r = headerRowIndex; r <= unitRowIndex; r++) {
        if (rows[r] && rows[r].length > maxCols) maxCols = rows[r].length;
    }

    // 2. Map dynamic columns and stitch multi-row headers together
    for (let c = 0; c < maxCols; c++) {
      let fullHeader = "";
      
      // Combine text from the Header Row all the way down to just above the Unit Row
      for (let r = headerRowIndex; r < unitRowIndex; r++) {
        if (rows[r] && rows[r][c]) {
          // Replace newlines inside single cells with spaces
          fullHeader += String(rows[r][c]).replace(/\n/g, " ").trim() + " ";
        }
      }
      fullHeader = fullHeader.replace(/\s+/g, " ").toUpperCase().trim();

      if (!fullHeader) continue;

      if (fullHeader.includes('TGP') || fullHeader.includes('TCP')) tgpCol = c;
      else if (fullHeader.includes('GPA') && !fullHeader.includes('CGPA')) gpaCol = c;
      else if (fullHeader.includes('REMARK') || fullHeader.includes('REAMRK')) remarkCol = c;
      
      else if (c > matricColIndex) {
         const rawUnit = unitRow[c];
         const unitValue = Number(rawUnit);
         
         // STRICT SAFEGUARD: Unit must be a number between 1 and 15. 
         // This completely blocks typos like "111" from being mapped as course units.
         if (!isNaN(unitValue) && unitValue > 0 && unitValue <= 15) {
            courses.push({ 
              colIndex: c, 
              code: fullHeader, 
              unit: unitValue 
            });
         }
      }
    }


    const sheetStudents: StudentResult[] = [];

    // 3. Loop through actual student rows (starting immediately AFTER the Unit Row)
    for (let i = unitRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip blank rows
      if (!row || !row[matricColIndex]) continue;

      const nameVal = nameColIndex !== -1 ? String(row[nameColIndex]).toUpperCase().trim() : "";
      const matricVal = String(row[matricColIndex]).toUpperCase().trim();

      // Stop parsing immediately if we hit footers or summary tables
      if (nameVal.includes("PREPARED BY")) break;
      if (
        nameVal === "REMARK" || 
        matricVal === "NO OF STUDENTS" || 
        nameVal === "DISTINCTION" || 
        matricVal === "UNDEFINED" || 
        matricVal === "SUMMARY" || 
        nameVal === "TOTAL"
      ) {
        break; 
      }

      let tcp = 0;
      let tcu = 0;
      const studentGrades: Record<string, string> = {};

      for (const course of courses) {
        const gradeVal = row[course.colIndex];
        
        if (gradeVal !== undefined && gradeVal !== null && String(gradeVal).trim() !== '') {
          const gp = getGradePoint(gradeVal);
          
          if (gp !== null) {
            tcp += (gp * course.unit);
            tcu += course.unit;
            studentGrades[course.code] = String(gradeVal).toUpperCase();
          } else {
             studentGrades[course.code] = String(gradeVal).toUpperCase();
          }
        }
      }

      const gpa = tcu > 0 ? tcp / tcu : 0;
      const finalGpa = Number(gpa.toFixed(2));
      const remark = getRemark(finalGpa);

      // 4. INJECT DATA BACK INTO EXCEL ROW ARRAY
      if (tgpCol !== -1) row[tgpCol] = tcp;
      if (gpaCol !== -1) row[gpaCol] = finalGpa;
      if (remarkCol !== -1) row[remarkCol] = remark;

      // 5. Save structured data for the UI
      sheetStudents.push({
        sn: snColIndex !== -1 ? Number(row[snColIndex]) || sheetStudents.length + 1 : sheetStudents.length + 1,
        name: nameColIndex !== -1 ? String(row[nameColIndex]).trim() : 'Unknown',
        matricNo: String(row[matricColIndex]).trim(),
        grades: studentGrades,
        tgp: tcp,
        gpa: finalGpa,
        remark
      });
    }

    const sampleMatrics = sheetStudents.slice(0, 10).map((s) => s.matricNo);
    const departmentName = extractDepartmentName(
      rows,
      headerRowIndex,
      sheetName,
      courses,
      sampleMatrics
    );

    departments.push({
      name: departmentName,
      session,
      semester,
      level,
      courses: courses.map(c => ({ code: c.code, unit: c.unit })),
      students: sheetStudents
    });
  }

  return { 
    parsedData: departments, 
    processedWorkbook: workbook 
  };
}

/**
 * Triggers the browser download of the processed Excel workbook.
 */
export function downloadProcessedSheet(workbook: XLSX.WorkBook, originalFilename: string) {
  const newFilename = `PROCESSED_${originalFilename}`;
  XLSX.writeFile(workbook, newFilename, { compression: true });
}

export function recalculateStudentScores(student: StudentResult, courses: { code: string; unit: number }[]) {
  let tcp = 0;
  let tcu = 0;

  for (const course of courses) {
    const gradeVal = student.grades[course.code];
    if (gradeVal !== undefined && gradeVal !== null && String(gradeVal).trim() !== '') {
      const gp = getGradePoint(gradeVal);
      if (gp !== null) {
        tcp += (gp * course.unit);
        tcu += course.unit;
      }
    }
  }

  const gpa = tcu > 0 ? tcp / tcu : 0;
  const finalGpa = Number(gpa.toFixed(2));
  const remark = getRemark(finalGpa);

  student.tgp = tcp;
  student.gpa = finalGpa;
  student.remark = remark;
}

export function mergeDocxScoresIntoData(
  spreadsheetData: DepartmentData[],
  docxData: DepartmentData[]
): DepartmentData[] {
  const mergedData: DepartmentData[] = JSON.parse(JSON.stringify(spreadsheetData));

  // Build a lookup map of all DOCX students across all departments
  const docxStudentMap = new Map<string, StudentResult>();
  const docxCoursesMap = new Map<string, { code: string; unit: number; title?: string }>();

  for (const dept of docxData) {
    for (const course of dept.courses) {
      docxCoursesMap.set(course.code, course);
    }
    for (const student of dept.students) {
      const normalizedMatric = student.matricNo.replace(/\s+/g, '').toUpperCase();
      docxStudentMap.set(normalizedMatric, student);
    }
  }

  for (const dept of mergedData) {
    // Collect docx courses to add missing ones to the department
    const newCoursesMap = new Map<string, { code: string; unit: number; title?: string }>();
    for (const c of dept.courses) {
      newCoursesMap.set(c.code, c);
      
      // Merge title from docx if it exists and isn't a placeholder
      if (docxCoursesMap.has(c.code)) {
        const dcourse = docxCoursesMap.get(c.code)!;
        if (dcourse.title && dcourse.title !== "-") {
          c.title = dcourse.title;
        }
      }
    }

    // Inherit level, session, semester from DOCX if missing
    const docxDept = docxData.find(d => d.name === dept.name) || docxData[0];
    if (docxDept) {
      if (docxDept.level && docxDept.level !== "N/A" && (!dept.level || dept.level === "N/A")) {
        dept.level = docxDept.level;
      }
      if (docxDept.session && docxDept.session !== "N/A" && (!dept.session || dept.session === "N/A")) {
        dept.session = docxDept.session;
      }
      if (docxDept.semester && docxDept.semester !== "N/A" && (!dept.semester || dept.semester === "N/A")) {
        dept.semester = docxDept.semester;
      }
    }

    for (const student of dept.students) {
      const normalizedMatric = student.matricNo.replace(/\s+/g, '').toUpperCase();
      const docxStudent = docxStudentMap.get(normalizedMatric);
      
      if (docxStudent) {
        // Overwrite grades ONLY if they were successfully parsed
        if (Object.keys(docxStudent.grades).length > 0) {
          student.grades = { ...docxStudent.grades };
        }
        if (docxStudent.scores && Object.keys(docxStudent.scores).length > 0) {
          student.scores = { ...docxStudent.scores };
        }
        
        // Add any missing courses that this student took
        for (const code of Object.keys(student.grades)) {
          if (!newCoursesMap.has(code) && docxCoursesMap.has(code)) {
            newCoursesMap.set(code, docxCoursesMap.get(code)!);
            dept.courses.push(docxCoursesMap.get(code)!);
          }
        }
      }
      // Recalculate GPA based on the merged grades
      recalculateStudentScores(student, Array.from(newCoursesMap.values()));
    }

    dept.courses = Array.from(newCoursesMap.values());
  }

  return mergedData;
}