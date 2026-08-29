import mammoth from "mammoth";
import { DepartmentData, StudentResult } from "@/lib/cgpa-calculator";
import { recalculateStudentScores } from "./cgpa-calculator";

export async function processDocxFile(file: File): Promise<{ parsedData: DepartmentData[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  fetch("/api/dump", { method: "POST", body: text }).catch(() => {});

  const chunks = text.split("NAME -").map((c) => c.trim()).filter((c) => c.length > 0);

  if (!chunks[0].includes("MATRIC NUMBER")) {
    chunks.shift();
  }

  const students: StudentResult[] = [];
  let name_val = "Unknown Department";
  let programmeName = "Unknown Programme";
  let session_val = "N/A";
  let semester_val = "N/A";
  let level_val = "N/A";
  const globalCoursesMap = new Map<string, { code: string; unit: number; title?: string }>();

  chunks.forEach((chunk, index) => {
    const nameMatch = chunk.match(/^(.*?)\s*\(Surname first\)/im) || chunk.match(/^(.*?)\s*MATRIC/im);
    let name = nameMatch ? nameMatch[1].trim() : "Unknown Student";
    name = name.replace(/\s+/g, ' ');

    const matricMatch =
      chunk.match(/MATRIC NUMBER\s*(ECT.*?)\s*FACULTY/im) ||
      chunk.match(/MATRIC NUMBER\s*(.*?)\s*(?:FACULTY|DEPARTMENT)/im);
    let matricNo = matricMatch ? matricMatch[1].trim() : "Unknown Matric";
    matricNo = matricNo.replace(/\s+/g, '').toUpperCase();

    const deptMatch = chunk.match(/DEPARTMENT\s*–\s*(.*?)\s*LEVEL OF STUDY/im) || chunk.match(/DEPARTMENT\s*-\s*(.*?)\s*LEVEL OF STUDY/im);
    if (deptMatch && name_val === "Unknown Department") {
      name_val = deptMatch[1].trim();
    }

    const levelMatch = chunk.match(/LEVEL OF STUDY\s*[–-]\s*(.*?)\s*SESSION/im);
    if (levelMatch && programmeName === "Unknown Programme") {
      const levelText = levelMatch[1].trim().toUpperCase();
      level_val = levelText;
      if (levelText.includes("ND")) {
        programmeName = "NATIONAL DIPLOMA";
      } else if (levelText.includes("HND")) {
        programmeName = "HIGHER NATIONAL DIPLOMA";
      } else {
        programmeName = levelText;
      }
    }

    const sessionMatch = chunk.match(/SESSION\s*[–-]\s*([\d\s/]+)\s*SEMESTER/im);
    if (sessionMatch && session_val === "N/A") {
      session_val = sessionMatch[1].replace(/\s+/g, ''); // e.g. 2025/2026
    }

    const semMatch = chunk.match(/SEMESTER\s*[–-]\s*(.*?)\s*RESULT/im);
    if (semMatch && semester_val === "N/A") {
      semester_val = semMatch[1].trim().toUpperCase();
    }

    const gpaMatch = chunk.match(/GPA\s*=\s*([\d.]+)/im);
    const gpa = gpaMatch ? parseFloat(gpaMatch[1]) : 0;

    const remarkMatch = chunk.match(/Remark\s*[-–]\s*(.*)/im);
    const remark = remarkMatch ? remarkMatch[1].trim().toUpperCase() : "PASS";

    const creditsMatch = chunk.match(/Total Credit\s*units\s*=\s*([\d.]+)/im);
    const totalCredits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;

    const pointsMatch = chunk.match(/Total Grade Points\s*=\s*([\d.]+)/im);
    const totalPoints = pointsMatch ? parseFloat(pointsMatch[1]) : 0;

    const grades: Record<string, string> = {};
    const scores: Record<string, number | string> = {};

    const lines = chunk.split("\n").map((l) => l.trim()).filter((l) => l !== "");
    let currentCourseCode: string | null = null;
    let courseNumbers: number[] = [];
    let courseGrades: string[] = [];
    let currentTitle: string | null = null;

    const finalizeCourse = () => {
      if (!currentCourseCode) return;
      
      let unit: number | null = null;
      let score: number | null = null;
      
      for (const num of courseNumbers) {
         if (unit === null && num >= 1 && num <= 15) unit = num;
         else if (score === null && num >= 0 && num <= 100) score = num;
      }

      const validGrades = courseGrades.filter(g => g !== "-");
      const finalGrade = validGrades.length > 0 ? validGrades[0] : (courseGrades.length > 0 ? "-" : null);

      if (finalGrade !== null) {
         grades[currentCourseCode] = finalGrade;
      }
      if (score !== null) {
         scores[currentCourseCode] = score;
      }
      if (unit !== null) {
         globalCoursesMap.set(currentCourseCode, {
           code: currentCourseCode,
           unit: unit,
           title: currentTitle || "-"
         });
      }
    };

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].toUpperCase();
      
      // Match course code (e.g. GNS 111, PAD 212)
      if (/^[A-Z]{2,4}\s*\d{2,4}$/.test(line)) {
        finalizeCourse();
        currentCourseCode = line.replace(/\s+/g, ' ');
        courseNumbers = [];
        courseGrades = [];
        currentTitle = null;
        continue;
      }

      if (currentCourseCode) {
        // Match numbers (could be score or unit), allow decimals
        if (/^\d{1,3}(?:\.\d+)?$/.test(line)) {
           courseNumbers.push(parseFloat(line));
        }
        else if (/^(A|AB|B|BC|C|CD|D|E|F|ABS|INC|-)$/.test(line)) {
           courseGrades.push(line);
        }
        else if (currentTitle === null && line !== "") {
           currentTitle = lines[j];
        }
      }
    }
    finalizeCourse();

    const newStudent: StudentResult = {
      sn: index + 1,
      name,
      matricNo,
      gpa,
      remark,
      tgp: totalPoints,
      grades,
      scores,
    };

    // Automatically recalculate to fix any human errors in the source document
    recalculateStudentScores(newStudent, Array.from(globalCoursesMap.values()));
    
    students.push(newStudent);
  });

  // Since we already populated globalCoursesMap in the first pass, we can just use it directly!

  const allCourses = Array.from(globalCoursesMap.values());

  const deptData: DepartmentData = {
    name: name_val,
    session: session_val,
    semester: semester_val,
    level: level_val,
    courses: allCourses,
    students,
  };

  return { parsedData: [deptData] };
}
