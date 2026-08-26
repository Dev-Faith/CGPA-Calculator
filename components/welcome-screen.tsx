"use client";

import * as React from "react";
import Image from "next/image";
import {
  FileSpreadsheetIcon,
  BarChart3Icon,
  DownloadIcon,
  CheckCircle2Icon,
  FileTextIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  ZapIcon,
  ArrowRightIcon,
} from "lucide-react";
import { FileUploadDropzone } from "@/components/dropzone";

interface WelcomeScreenProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
  onStartTour?: () => void;
}

const STEPS = [
  {
    number: "01",
    icon: <FileSpreadsheetIcon className="size-6" />,
    title: "Upload Broadsheet",
    description:
      "Drop your semester Excel broadsheet (.xlsx) or Word result slip (.docx) into the upload area.",
    color: "from-indigo-500 to-blue-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  {
    number: "02",
    icon: <ZapIcon className="size-6" />,
    title: "Auto-Calculate",
    description:
      "ECOTEMS instantly computes GPA, CGPA, Total Credit Points, and classifies each student's performance.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    number: "03",
    icon: <DownloadIcon className="size-6" />,
    title: "Export & Share",
    description:
      "Download individual student transcripts, result statements, or the full department broadsheet as Excel.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
];

const FEATURES = [
  {
    icon: <GraduationCapIcon className="size-5" />,
    title: "NBTE 4.0 Standard",
    description: "Fully compliant with the National Board for Technical Education grading system.",
  },
  {
    icon: <FileTextIcon className="size-5" />,
    title: "Official Transcripts",
    description: "Generate printable, QR-verified academic transcripts and result statements.",
  },
  {
    icon: <ShieldCheckIcon className="size-5" />,
    title: "QR Verification",
    description: "Every document includes a scannable QR code for online result verification.",
  },
  {
    icon: <BarChart3Icon className="size-5" />,
    title: "Visual Analytics",
    description: "Interactive charts showing CGPA distribution and cohort performance at a glance.",
  },
];

export function WelcomeScreen({ onUpload, isProcessing, onStartTour }: WelcomeScreenProps) {
  return (
    <div className="min-h-full flex flex-col" data-tour="welcome">
      {/* Hero Brand Bar */}
      <div className="relative overflow-hidden border-b border-white/20 dark:border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-10 md:py-14 lg:py-16">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-600/20 to-teal-500/15 blur-[80px]" />

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="flex flex-col items-center gap-3">
            {/* Real School Logo */}
            <div className="relative size-20 md:size-24 rounded-full overflow-hidden shadow-2xl shadow-white/20 ring-4 ring-white/30">
              <Image
                src="/ecotems-logo.png"
                alt="ECOTEMS Logo"
                fill
                className="object-contain bg-white p-1"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-300 mb-1">
                ECOTEMS Academic Portal
              </p>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                ELERINMOSA COLLEGE OF
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  TECHNOLOGY AND MANAGEMENT SCIENCE
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-2 font-medium">
                EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA
              </p>
            </div>
          </div>

          <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            The official broadsheet processing and result management portal. Upload your semester
            data and instantly generate CGPA calculations, student transcripts, and analytical reports.
          </p>

          {onStartTour && (
            <button
              onClick={onStartTour}
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400 rounded-full px-4 py-2 transition-all duration-300 hover:bg-indigo-600/20"
            >
              <span>✨</span>
              Take a guided tour
              <ArrowRightIcon className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="px-6 py-8 lg:px-10 bg-white/30 dark:bg-black/20 backdrop-blur-sm border-b border-white/20 dark:border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-6">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
            <div className="hidden sm:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-300 via-amber-300 to-emerald-300 opacity-40" />
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${step.bg} ${step.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center justify-center size-11 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md`}>
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-slate-200 dark:text-slate-700 select-none">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{step.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="flex-1 flex flex-col items-center px-6 py-8 lg:py-10 lg:px-10" data-tour="dropzone">
        <div className="w-full max-w-3xl space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Upload to Get Started
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Supported formats:{" "}
              <strong className="text-slate-700 dark:text-slate-300">.xlsx</strong>,{" "}
              <strong className="text-slate-700 dark:text-slate-300">.xls</strong>,{" "}
              <strong className="text-slate-700 dark:text-slate-300">.docx</strong>
            </p>
          </div>

          <FileUploadDropzone
            onUpload={onUpload}
            isProcessing={isProcessing}
            title="Drop your Broadsheet or Result Slip here"
            description="Drag & drop your semester Excel broadsheet or Word DOCX result slip, or click Browse Files to select it from your computer."
          />

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {["Processes in seconds", "NBTE 4.0 Compliant", "No data stored on server"].map(
              (item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Feature Pills */}
      <div className="border-t border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 px-6 py-6 lg:px-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="flex flex-col gap-2 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                {feat.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{feat.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
