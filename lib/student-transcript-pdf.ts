import QRCode from "qrcode";
import autoTable from "jspdf-autotable";

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
  
  // Validation code from verification string (just using first 10 chars of reference or a hash)
  const validationCode = reference.split('/').join('').slice(0, 10).toUpperCase();

  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 0,
      width: 150,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code for PDF:", err);
  }

  pdf.setDrawColor(255, 255, 255);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Use sans-serif font like the screenshot
  pdf.setFont("helvetica", "bold");
  
  // --- Header ---
  pdf.setFontSize(16);
  pdf.text("ELERINMOSA COLLEGE OF TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
  pdf.text("AND MANAGEMENT SCIENCE ( ECOTEMS)", pageWidth / 2, 29, { align: "center" });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA.", pageWidth / 2, 35, { align: "center" });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text(`${student.name.toUpperCase()} TRANSCRIPT`, pageWidth / 2, 45, { align: "center" });
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Matric No: `, pageWidth / 2 - 20, 53, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.matricNo, pageWidth / 2 - 18, 53, { align: "left" });
  
  pdf.setFont("helvetica", "normal");
  pdf.text(`Remarks: `, pageWidth / 2 - 20, 59, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text(student.remark, pageWidth / 2 - 18, 59, { align: "left" });

  // --- Student Details & QR Code ---
  const detailsY = 72;
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
  const levelText = (department as any).level && (department as any).level !== "N/A" ? (department as any).level : "N/A";
  
  pdf.text(`SESSION: ${sessionText}`, margin, finalY);
  pdf.text(`LEVEL: ${levelText}`, pageWidth - margin, finalY, { align: "right" });
  
  finalY += 6;
  pdf.setFont("helvetica", "normal");
  const semesterText = department.semester && department.semester !== "N/A" ? department.semester.toUpperCase() : "SINGLE SEMESTER";
  pdf.text(`SEMESTER: ${semesterText}`, margin, finalY);

  // --- Course Table ---
  const tableData = [];
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
    const gradePoints: Record<string, number> = { "A": 4.0, "AB": 3.5, "B": 3.25, "BC": 3.0, "C": 2.75, "CD": 2.5, "D": 2.25, "E": 2.0, "F": 0 };
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
    body: tableData as any,
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

  // @ts-ignore
  finalY = pdf.lastAutoTable.finalY + 15;

  // --- Summary Footer ---
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total Units:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(totalUnits.toString(), margin + 25, finalY);

  finalY += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total Points:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(tgpValue.toString(), margin + 25, finalY);

  finalY += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Final CGPA:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(gpaValue.toString(), margin + 25, finalY);

  finalY += 12;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Validation Code:`, margin, finalY);
  pdf.setFont("helvetica", "normal");
  pdf.text(validationCode, margin + 30, finalY);
  
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
