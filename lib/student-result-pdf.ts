import QRCode from "qrcode";

import { formatProgrammeName } from "@/lib/cgpa-calculator";
import {
  buildVerificationUrl,
  createVerificationPayload,
  VERIFICATION_BASE_URL,
  type VerificationPayload,
} from "@/lib/student-result-verification";

export type ResultLetterStudent = {
  name: string;
  matricNo: string;
  grades: Record<string, string>;
  gpa: number | string;
  remark: string;
};

export type ResultLetterDepartment = {
  name: string;
  session?: string;
  semester?: string;
  courses: { code: string; unit: number; title?: string }[];
};

function ordinalSuffix(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  const year = date.getFullYear();
  return `${day}${ordinalSuffix(day)} ${month} ${year}`;
}

export function fileSafe(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
}

export function referenceForStudent(student: ResultLetterStudent) {
  const digits = student.matricNo.replace(/\D/g, "");
  const suffix = digits.slice(-6).padStart(6, "0");
  return `ECOTEMS/ACAD/${suffix.slice(0, 4)}/${suffix.slice(4) || "001"}`;
}

async function createResultPdf(
  student: ResultLetterStudent,
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

  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 260,
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

  const yOffset = 45; // Space for letterhead

  pdf.setFont("times", "bold");
  pdf.setFontSize(11);
  pdf.text(`Our ref: ${reference}`, margin, 16 + yOffset);
  pdf.text(`Date: ${issuedOn}`, pageWidth - margin, 16 + yOffset, { align: "right" });

  pdf.setDrawColor(180, 224, 180);
  pdf.setLineWidth(0.25);
  pdf.line(margin, 35 + yOffset, pageWidth - margin, 35 + yOffset);

  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.text("OFFICE OF THE REGISTRAR", pageWidth / 2, 58 + yOffset, { align: "center" });

  pdf.setFontSize(18);
  pdf.text("NOTIFICATION OF RESULT", pageWidth / 2, 71 + yOffset, { align: "center" });
  pdf.line(68, 72 + yOffset, pageWidth - 68, 72 + yOffset);

  pdf.setFont("times", "normal");
  pdf.setFontSize(16);

  const contentX = 22;
  const contentWidth = 155;
  const bodyStart = 92 + yOffset;
  const lineHeight = 10;

  const firstLinePrefix = "This is to notify that ";
  const firstLineSuffix = ` (${student.matricNo})`;
  const programmeName = formatProgrammeName(department.name);
  const bodyLines = pdf.splitTextToSize(
    `has completed the prescribed course of study and, with authority vested in the Academic Board of Elerinmosa College of Technology and Management Science (ECOTEMS), has been conferred the National Diploma (ND) in ${programmeName} with ${student.remark} classification, effective from ${issuedOn}.`,
    contentWidth,
  );

  pdf.setFont("times", "normal");
  pdf.text(firstLinePrefix, contentX, bodyStart);
  const prefixWidth = pdf.getTextWidth(firstLinePrefix);

  pdf.setFont("times", "bold");
  pdf.text(student.name.toUpperCase(), contentX + prefixWidth, bodyStart);
  const nameWidth = pdf.getTextWidth(student.name.toUpperCase());

  pdf.setFont("times", "normal");
  pdf.text(firstLineSuffix, contentX + prefixWidth + nameWidth, bodyStart);

  let y = bodyStart + lineHeight;
  for (const line of bodyLines) {
    const isImportant = /National Diploma \(ND\)|Upper Credit|Lower Credit|Distinction|Pass|Fail/i.test(line);
    pdf.setFont("times", isImportant ? "bold" : "normal");
    pdf.text(line, contentX, y);
    y += lineHeight;
  }

  pdf.setFont("times", "normal");
  y += 8;
  pdf.text("Please accept our congratulations.", contentX, y);

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(contentX, pageHeight - 34, contentX + 58, pageHeight - 34);
  pdf.setFont("times", "bold");
  pdf.setFontSize(11);
  pdf.text("Ag. Registrar", contentX, pageHeight - 28);

  if (qrCodeDataUrl) {
    const qrSize = 31;
    const qrX = pageWidth - margin - qrSize;
    const qrY = pageHeight - 51;
    pdf.addImage(qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    pdf.setFont("times", "normal");
    pdf.setFontSize(8);
    pdf.text("Scan to verify", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });
  }

  return pdf;
}

export async function createStudentResultPdfBlob(
  student: ResultLetterStudent,
  department: ResultLetterDepartment,
) {
  const pdf = await createResultPdf(student, department);
  const blob = pdf.output("blob");
  const filename = `${fileSafe(student.matricNo)}_result_notification.pdf`;

  return { blob, filename };
}

export async function viewStudentResultPdf(
  student: ResultLetterStudent,
  department: ResultLetterDepartment,
) {
  // Open window synchronously (within the click handler stack) to avoid popup blockers.
  // Must NOT use "noopener" here — it causes window.open to return null in Chrome.
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) return false;

  try {
    const { blob } = await createStudentResultPdfBlob(student, department);
    const url = URL.createObjectURL(blob);
    previewWindow.location.href = url;
  } catch {
    previewWindow.close();
    return false;
  }

  return true;
}

export async function downloadStudentResultPdf(
  student: ResultLetterStudent,
  department: ResultLetterDepartment,
) {
  const { blob, filename } = await createStudentResultPdfBlob(student, department);
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