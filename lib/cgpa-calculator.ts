import * as XLSX from 'xlsx';

// Define the exact student result interface for our UI
export interface StudentResult {
  sn: number;
  name: string;
  matricNo: string;
  grades: Record<string, string>;
  tgp: number; // Total Grade Points (TCP)
  gpa: number;
  remark: string;
}

// Group data by sheet/department for the UI
export type DepartmentData = {
  name: string;
  session?: string;
  semester?: string;
  courses: { code: string; unit: number }[];
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

    const newSheet = XLSX.utils.aoa_to_sheet(rows);
    workbook.Sheets[sheetName] = newSheet;

    departments.push({
      name: sheetName,
      session,
      semester,
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