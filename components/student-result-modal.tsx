"use client";

import * as React from "react";
import QRCode from "qrcode";
import { DownloadIcon, PrinterIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildVerificationUrl,
  createVerificationPayload,
  VERIFICATION_BASE_URL,
  type VerificationPayload,
} from "@/lib/student-result-verification";
import {
  downloadStudentResultPdf,
  formatDate,
  referenceForStudent,
  type ResultLetterDepartment,
  type ResultLetterStudent,
} from "@/lib/student-result-pdf";

type StudentResultModalProps = {
  student: ResultLetterStudent | null;
  department: ResultLetterDepartment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StudentResultModal({
  student,
  department,
  open,
  onOpenChange,
}: StudentResultModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  const issuedOn = React.useMemo(() => formatDate(new Date()), []);
  const reference = React.useMemo(
    () => (student ? referenceForStudent(student) : ""),
    [student]
  );

  const verificationUrl = React.useMemo(() => {
    if (!student || !department) return "";
    const payload = createVerificationPayload(
      student,
      department,
      issuedOn,
      reference
    );
    return buildVerificationUrl(VERIFICATION_BASE_URL, payload);
  }, [student, department, issuedOn, reference]);

  React.useEffect(() => {
    if (!verificationUrl) {
      setQrCodeUrl(null);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 200,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [verificationUrl]);

  if (!student || !department) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    toast.loading(`Downloading PDF for ${student.matricNo}...`, {
      id: "modal-pdf",
    });
    try {
      await downloadStudentResultPdf(student, department);
      toast.success(`PDF downloaded successfully.`, { id: "modal-pdf" });
    } catch {
      toast.error(`Failed to download PDF.`, { id: "modal-pdf" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.name} - Notification of Result</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: "Times New Roman", Times, serif;
              color: #000;
              margin: 0;
              padding: 20px;
              background: #fff;
              line-height: 1.6;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .header-bar { border-bottom: 2px solid #22c55e; margin: 12px 0 24px 0; }
            .title-bar { border-bottom: 1.5px solid #000; display: inline-block; padding-bottom: 2px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; }
            .doc-title { font-size: 24px; font-weight: bold; margin-top: 16px; }
            .doc-sub { font-size: 18px; font-weight: bold; margin: 12px 0; letter-spacing: 1px; }
            .body-text { font-size: 16px; text-align: justify; margin: 30px 0; line-height: 1.8; }
            .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; }
            .signature-box { width: 200px; text-align: left; }
            .sig-line { border-bottom: 1px solid #000; margin-bottom: 8px; width: 180px; }
            .qr-box { text-align: center; }
            .qr-box img { width: 90px; height: 90px; }
            .qr-box span { display: block; font-size: 10px; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-background border-b flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold">
                Notification of Result
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {student.matricNo}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Official student result certificate preview & verification
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mr-8">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs"
            >
              <PrinterIcon className="size-3.5" />
              <span>Print</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <DownloadIcon className="size-3.5" />
              <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Certificate Paper Container */}
        <div className="overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/70 dark:bg-slate-950/80">
          <div
            ref={printRef}
            className="w-full max-w-[650px] bg-white text-slate-950 p-8 md:p-12 rounded-sm shadow-xl border border-slate-300 font-serif relative"
            style={{ minHeight: "750px" }}
          >
            {/* Top reference and date */}
            <div className="flex justify-between items-center text-xs md:text-sm font-serif font-bold text-slate-800 border-b border-emerald-300 pb-3 mb-6">
              <span>Our ref: {reference}</span>
              <span>Date: {issuedOn}</span>
            </div>

            {/* Institute Header */}
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-xl md:text-2xl font-bold tracking-wide text-slate-900 font-serif">
                OFFICE OF THE REGISTRAR
              </h2>
              <div className="inline-block border-b-2 border-slate-900 pb-1">
                <h3 className="text-base md:text-lg font-bold tracking-wider uppercase text-slate-900 font-serif">
                  NOTIFICATION OF RESULT
                </h3>
              </div>
            </div>

            {/* Letter Body */}
            <div className="space-y-6 text-sm md:text-base leading-relaxed text-justify text-slate-800 font-serif">
              <p>
                This is to notify that{" "}
                <span className="font-bold text-slate-950 uppercase">
                  {student.name}
                </span>{" "}
                (<span className="font-mono text-sm font-semibold">{student.matricNo}</span>) has completed the prescribed
                course of study and, with authority vested in the Academic Board of Elerinmosa College of Technology and Management Science (ECOTEMS),
                has been conferred the{" "}
                <span className="font-bold text-slate-950">
                  National Innovation Diploma (NID)
                </span>{" "}
                in{" "}
                <span className="font-bold text-slate-950">
                  {department.name || "NID"}
                </span>{" "}
                with{" "}
                <span className="font-bold text-slate-950">
                  {student.remark}
                </span>
                , effective from {issuedOn}.
              </p>

              <p className="font-serif">Please accept our congratulations.</p>
            </div>

            {/* Signature & QR Code Footer */}
            <div className="mt-16 md:mt-24 pt-6 flex justify-between items-end">
              {/* Signature block */}
              <div className="space-y-1">
                <div className="w-44 border-b border-slate-900 mb-2" />
                <p className="text-sm font-serif text-slate-900">Abdulazeez Thani</p>
                <p className="text-sm font-serif font-bold text-slate-900">Ag. Registrar</p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeUrl}
                    alt="Scan to verify result"
                    className="size-20 md:size-24 border border-slate-200 p-1 bg-white rounded"
                  />
                ) : (
                  <div className="size-20 md:size-24 bg-slate-100 flex items-center justify-center border text-xs text-slate-400">
                    Loading QR...
                  </div>
                )}
                <span className="text-[10px] text-slate-600 font-sans mt-1">
                  Scan to verify
                </span>
              </div>
            </div>

            {/* Subtle authentic footer watermark */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span className="flex items-center gap-1">
                <ShieldCheckIcon className="size-3 text-emerald-600" /> Official Academic Document
              </span>
              <span>Elerinmosa College of Technology and Management Science (ECOTEMS)</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 bg-background border-t flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SparklesIcon className="size-3.5 text-emerald-500" />
            <span>Digital verification QR code included</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <DownloadIcon className="size-3.5" />
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
