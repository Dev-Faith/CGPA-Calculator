import QRCode from "qrcode";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import { loadLogoDataUrl } from "@/lib/logo-loader";

import { formatProgrammeName } from "@/lib/cgpa-calculator";
import {
  buildVerificationUrl,
  createVerificationPayload,
  VERIFICATION_BASE_URL,
} from "@/lib/student-result-verification";
import {
  formatDate,
  fileSafe,
  referenceForStudent,
  type ResultLetterStudent,
  type ResultLetterDepartment,
} from "@/lib/student-result-pdf";

export type TranscriptStudent = ResultLetterStudent & {
  tgp: number | string;
  scores?: Record<string, number | string>;
};

async function createTranscriptPdf(
  student: TranscriptStudent,
  department: ResultLetterDepartment,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const issuedOn = formatDate(new Date());
  const reference = referenceForStudent(student);

  const verificationPayload = createVerificationPayload(
    student,
    department,
    issuedOn,
    reference,
  );

  const verificationUrl = buildVerificationUrl(
    VERIFICATION_BASE_URL,
    verificationPayload,
  );
  
  // Validation code from verification string
  const validationCode = reference;

  // Load logo and QR code in parallel
  const [logoDataUrl, qrResult] = await Promise.allSettled([
    loadLogoDataUrl(),
    QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 0,
      width: 150,
      color: { dark: "#000000", light: "#ffffff" },
    }),
  ]);

  const logoUrl = logoDataUrl.status === "fulfilled" ? logoDataUrl.value : null;
  let qrCodeDataUrl: string | null = null;
  if (qrResult.status === "fulfilled") qrCodeDataUrl = qrResult.value;

  pdf.setDrawColor(255, 255, 255);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Use sans-serif font like the screenshot
  pdf.setFont("helvetica", "bold");

  // --- Logo Header ---
  const logoSize = 24; // mm
  const logoX = pageWidth / 2 - logoSize / 2;
  const logoY = 5;
  if (logoUrl) {
    pdf.addImage(logoUrl, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name
  pdf.setFontSize(16);
  pdf.text("ELERINMOSA COLLEGE OF TECHNOLOGY", pageWidth / 2, logoY + logoSize + 8, { align: "center" });
  pdf.text("AND MANAGEMENT SCIENCE ( ECOTEMS)", pageWidth / 2, logoY + logoSize + 15, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA.", pageWidth / 2, logoY + logoSize + 21, { align: "center" });

  // Blue divider
  pdf.setDrawColor(20, 60, 140);
  pdf.setLineWidth(0.6);
  pdf.line(margin, logoY + logoSize + 25, pageWidth - margin, logoY + logoSize + 25);

  const headerBottom = logoY + logoSize + 25;

  // Transcript title
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text(`${student.name.toUpperCase()} TRANSCRIPT`, pageWidth / 2, headerBottom + 8, { align: "center" });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Matric No: `, pageWidth / 2 - 20, headerBottom + 16, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.matricNo, pageWidth / 2 - 18, headerBottom + 16, { align: "left" });
  
  pdf.setFont("helvetica", "normal");
  pdf.text(`Remarks: `, pageWidth / 2 - 20, headerBottom + 22, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.remark, pageWidth / 2 - 18, headerBottom + 22, { align: "left" });

  // --- Student Details & QR Code ---
  const detailsY = headerBottom + 35;
  const lineSpacing = 6;
  const programmeName = formatProgrammeName(department.name);

  pdf.setFont("helvetica", "bold");
  pdf.text(`Programme:`, margin, detailsY);
  pdf.setFont("helvetica", "normal");
  pdf.text(programmeName, margin + 25, detailsY);

  pdf.setFont("helvetica", "bold");
  pdf.text(`Department:`, margin, detailsY + lineSpacing);
  pdf.setFont("helvetica", "normal");
  pdf.text(department.name, margin + 25, detailsY + lineSpacing);

  if (qrCodeDataUrl) {
    const qrSize = 25;
    const qrX = pageWidth - margin - qrSize - 5;
    const qrY = detailsY - 15;
    
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Scan to Verify", qrX + (qrSize / 2), qrY, { align: "center" });
    
    pdf.addImage(qrCodeDataUrl, "PNG", qrX, qrY + 2, qrSize, qrSize);
  }

  // --- Separator Line ---
  const lineY = detailsY + lineSpacing + 10;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, lineY, pageWidth - margin, lineY);

  // --- Session & Semester ---
  let finalY = lineY + 8;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  const sessionText = department.session && department.session !== "N/A" ? department.session : "N/A";
  const levelText = department.level && department.level !== "N/A" ? department.level : "N/A";
  
  pdf.text(`SESSION: ${sessionText}`, margin, finalY);
  pdf.text(`LEVEL: ${levelText}`, pageWidth - margin, finalY, { align: "right" });
  
  finalY += 6;
  pdf.setFont("helvetica", "normal");
  const semesterText = department.semester && department.semester !== "N/A" ? department.semester.toUpperCase() : "SINGLE SEMESTER";
  pdf.text(`SEMESTER: ${semesterText}`, margin, finalY);

  // --- Course Table ---
  const tableData: RowInput[] = [];
  let index = 1;
  
  // Calculate total units and tgp
  let totalUnits = 0;
  
  for (const course of department.courses) {
    const grade = student.grades[course.code] || "-";
    const title = course.title || "-"; 
    
    let score: string | number = "-";
    if (student.scores && student.scores[course.code] !== undefined) {
      score = student.scores[course.code];
    }
    
    // We calculate the specific GP for this course if we can
    let gpStr = "-";
    const gradePoints: Record<string, number> = { "A": 4.0, "AB": 3.5, "B": 3.0, "BC": 2.5, "C": 2.0, "CD": 1.5, "D": 1.0, "E": 0.5, "F": 0 };
    if (gradePoints[grade] !== undefined) {
      gpStr = (gradePoints[grade] * course.unit).toFixed(2);
    }

    tableData.push([
      index.toString(),
      course.code,
      title,
      course.unit.toString(),
      score.toString(),
      grade,
      gpStr
    ]);
    totalUnits += course.unit;
    index++;
  }

  // Append Semester Total and Semester GPA rows directly into the body
  const tgpValue = typeof student.tgp === 'number' ? student.tgp.toFixed(2) : student.tgp;
  const gpaValue = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa;

  tableData.push([
    { content: 'Semester Total:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalUnits.toString(), styles: { fontStyle: 'bold' } },
    '',
    '',
    { content: tgpValue, styles: { fontStyle: 'bold' } }
  ]);

  tableData.push([
    { content: 'Semester GPA:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: gpaValue, colSpan: 4, styles: { fontStyle: 'bold', halign: 'left' } },
  ]);

  finalY += 4;

  autoTable(pdf, {
    startY: finalY,
    head: [["SN", "Course Code", "Course Title", "Unit", "Score", "Grade", "GP"]],
    body: tableData,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0, // Mockup has some subtle horizontal lines, let's use plain but add horizontal lines
    },
    headStyles: {
      fontStyle: "bold",
      textColor: [0, 0, 0],
      fillColor: false,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15 },
    },
    margin: { left: margin, right: margin },
  });

  const lastAutoTable = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  finalY = (lastAutoTable?.finalY ?? finalY) + 15;

  // --- Summary Footer ---
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total Units:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(totalUnits.toString(), margin + 30, finalY);

  finalY += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total Points:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(tgpValue.toString(), margin + 30, finalY);

  finalY += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Final CGPA:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(gpaValue.toString(), margin + 30, finalY);

  finalY += 12;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Validation Code:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(validationCode, margin + 35, finalY);
  
  finalY += 5;
  pdf.setFontSize(8);
  pdf.text(`To verify transcript, visit: ${VERIFICATION_BASE_URL}`, margin, finalY);

  // --- Signatures ---
  const sigY = pageHeight - 40;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, margin + 60, sigY);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Registrar", margin, sigY + 5);

  return pdf;
}

export async function createStudentTranscriptPdfBlob(
  student: TranscriptStudent,
  department: ResultLetterDepartment,
) {
  const pdf = await createTranscriptPdf(student, department);
  const blob = pdf.output("blob");
  const filename = `${fileSafe(student.matricNo)}_transcript.pdf`;

  return { blob, filename };
}

export async function viewStudentTranscriptPdf(
  student: TranscriptStudent,
  department: ResultLetterDepartment,
) {
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) return false;

  try {
    const { blob } = await createStudentTranscriptPdfBlob(student, department);
    const url = URL.createObjectURL(blob);
    previewWindow.location.href = url;
  } catch {
    previewWindow.close();
    return false;
  }

  return true;
}

export async function downloadStudentTranscriptPdf(
  student: TranscriptStudent,
  department: ResultLetterDepartment,
) {
  const { blob, filename } = await createStudentTranscriptPdfBlob(student, department);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ============================================================================
// COMPREHENSIVE TRANSCRIPT (MULTI-SEMESTER)
// ============================================================================

export type ComprehensiveEnrollment = {
  department: string;
  session: string;
  semesterText: string;
  level: string;
  gpa: number;
  tgp: number;
  tcu: number;
  remark: string;
  grades: {
    courseCode: string;
    courseTitle?: string | null;
    unit: number;
    score?: number | null;
    grade: string;
  }[];
};

export type ComprehensiveStudentData = {
  name: string;
  matricNo: string;
  cgpa: number;
  cgpaRemark: string;
  enrollments: ComprehensiveEnrollment[];
};

async function createComprehensiveTranscriptPdf(student: ComprehensiveStudentData) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const issuedOn = formatDate(new Date());

  // Use the standard verification payload with the first enrollment's department (for reference)
  const firstEnrollment = student.enrollments[0];
  // Extract all courses across all enrollments to accurately count them in verification
  const allCourses = student.enrollments.flatMap(e => 
    e.grades.map(g => ({ code: g.courseCode, title: g.courseTitle || "", unit: g.unit }))
  );

  const placeholderDept: ResultLetterDepartment = {
    name: firstEnrollment?.department || "N/A",
    session: firstEnrollment?.session || "N/A",
    semester: "COMPREHENSIVE",
    level: firstEnrollment?.level || "N/A",
    courses: allCourses,
  };
  const placeholderStudent: ResultLetterStudent = {
    name: student.name,
    matricNo: student.matricNo,
    grades: {},
    gpa: student.cgpa,
    remark: student.cgpaRemark,
  };
  
  const reference = referenceForStudent(placeholderStudent);
  const verificationPayload = createVerificationPayload(placeholderStudent, placeholderDept, issuedOn, reference);
  const verificationUrl = buildVerificationUrl(VERIFICATION_BASE_URL, verificationPayload);
  const validationCode = reference;

  const [logoDataUrl, qrResult] = await Promise.allSettled([
    loadLogoDataUrl(),
    QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 0,
      width: 150,
      color: { dark: "#000000", light: "#ffffff" },
    }),
  ]);

  const logoUrl = logoDataUrl.status === "fulfilled" ? logoDataUrl.value : null;
  let qrCodeDataUrl: string | null = null;
  if (qrResult.status === "fulfilled") qrCodeDataUrl = qrResult.value;

  pdf.setDrawColor(255, 255, 255);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // --- Letterhead ---
  const logoSize = 24;
  const logoX = pageWidth / 2 - logoSize / 2;
  const logoY = 5;
  if (logoUrl) {
    pdf.addImage(logoUrl, "PNG", logoX, logoY, logoSize, logoSize);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ELERINMOSA COLLEGE OF TECHNOLOGY", pageWidth / 2, logoY + logoSize + 8, { align: "center" });
  pdf.text("AND MANAGEMENT SCIENCE ( ECOTEMS)", pageWidth / 2, logoY + logoSize + 15, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA.", pageWidth / 2, logoY + logoSize + 21, { align: "center" });

  pdf.setDrawColor(20, 60, 140);
  pdf.setLineWidth(0.6);
  pdf.line(margin, logoY + logoSize + 25, pageWidth - margin, logoY + logoSize + 25);

  const headerBottom = logoY + logoSize + 25;

  // --- Student Details ---
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text(`OFFICIAL ACADEMIC TRANSCRIPT`, pageWidth / 2, headerBottom + 8, { align: "center" });
  
  pdf.setFontSize(11);
  pdf.text(`Student Name: `, pageWidth / 2 - 20, headerBottom + 16, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.name.toUpperCase(), pageWidth / 2 - 18, headerBottom + 16, { align: "left" });
  
  pdf.setFont("helvetica", "normal");
  pdf.text(`Matric No: `, pageWidth / 2 - 20, headerBottom + 22, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.matricNo, pageWidth / 2 - 18, headerBottom + 22, { align: "left" });

  if (qrCodeDataUrl) {
    const qrSize = 25;
    const qrX = pageWidth - margin - qrSize - 5;
    const qrY = headerBottom + 10;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("Scan to Verify", qrX + (qrSize / 2), qrY, { align: "center" });
    pdf.addImage(qrCodeDataUrl, "PNG", qrX, qrY + 2, qrSize, qrSize);
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, headerBottom + 40, pageWidth - margin, headerBottom + 40);

  let finalY = headerBottom + 45;

  // --- Print each semester ---
  for (const enrollment of student.enrollments) {
    // Check if we need a new page for the header
    if (finalY > pageHeight - 60) {
      pdf.addPage();
      finalY = margin + 10;
    }

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    const semHeader = `${enrollment.semesterText.toUpperCase()} — ${enrollment.level} (${enrollment.session})`;
    pdf.text(semHeader, margin, finalY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Programme: ${formatProgrammeName(enrollment.department)}`, margin, finalY + 5);
    
    finalY += 8;

    const tableHeaders = [["S/N", "Course Code", "Course Title", "Units", "Score", "Grade"]];
    const tableData: RowInput[] = enrollment.grades.map((g, index) => [
      index + 1,
      g.courseCode,
      g.courseTitle ?? "-",
      g.unit,
      g.score !== null && g.score !== undefined ? g.score.toString() : "-",
      g.grade,
    ]);

    autoTable(pdf, {
      startY: finalY,
      head: tableHeaders,
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 30 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 15, halign: "center" },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // If autoTable creates a new page, keep track of it
      },
    });

    finalY = (pdf as any).lastAutoTable.finalY + 5;

    // Semester summary
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Semester GPA: ${Number(enrollment.gpa).toFixed(2)}`, margin, finalY);
    pdf.text(`Total Units: ${enrollment.tcu}`, margin + 45, finalY);
    pdf.text(`Total Points: ${Number(enrollment.tgp).toFixed(2)}`, margin + 80, finalY);
    pdf.text(`Remark: ${enrollment.remark}`, margin + 120, finalY);

    finalY += 15;
  }

  // --- Final CGPA and Signature ---
  if (finalY > pageHeight - 60) {
    pdf.addPage();
    finalY = margin + 10;
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.line(margin, finalY, pageWidth - margin, finalY);
  finalY += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`CUMULATIVE GPA:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(Number(student.cgpa).toFixed(2), margin + 45, finalY);

  finalY += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(`FINAL REMARK:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(student.cgpaRemark, margin + 45, finalY);

  finalY += 12;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Validation Code:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(validationCode, margin + 35, finalY);
  
  finalY += 5;
  pdf.setFontSize(8);
  pdf.text(`To verify transcript, visit: ${VERIFICATION_BASE_URL}`, margin, finalY);

  // --- Signatures ---
  const sigY = Math.max(finalY + 30, pageHeight - 40);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(margin, sigY, margin + 60, sigY);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Registrar", margin, sigY + 5);

  return pdf;
}

export async function downloadComprehensiveTranscriptPdf(student: ComprehensiveStudentData) {
  const pdf = await createComprehensiveTranscriptPdf(student);
  const blob = pdf.output("blob");
  const filename = `${fileSafe(student.matricNo)}_comprehensive_transcript.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
