"use client";

import * as React from "react";
import {
  UploadCloudIcon,
  Loader2Icon,
  FileSpreadsheetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FileUploadDropzoneProps {
  /** Callback fired when a file is selected or dropped */
  onUpload: (file: File) => void;
  /** Disables the dropzone and shows a loading spinner */
  isProcessing?: boolean;
  /** Allowed file extensions (e.g., ".xlsx, .csv") */
  accept?: string;
  /** Main heading text */
  title?: string;
  /** Subheading text */
  description?: string;
  /** Loading text shown on the button */
  loadingText?: string;
}

export function FileUploadDropzone({
  onUpload,
  isProcessing = false,
  accept = ".xlsx, .xls, .csv",
  title = "Upload Master Broadsheet",
  description = "Drag and drop your semester's Excel file here to instantly calculate CGPA.",
  loadingText = "Calculating Grades...",
}: FileUploadDropzoneProps) {
  // State to track if a file is currently hovering over the dropzone
  const [isDragging, setIsDragging] = React.useState(false);
  // Ref to trigger the hidden file input programmatically
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isProcessing) {
      onUpload(file);
    }
    // Reset the input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex w-full flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ease-in-out sm:p-16 ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]"
          : "border-muted-foreground/25 bg-background hover:bg-muted/30 hover:border-muted-foreground/40"
      } ${isProcessing ? "pointer-events-none opacity-80" : ""}`}
    >
      {/* Icon Container */}
      <div
        className={`rounded-full p-6 shadow-inner transition-colors duration-300 ${
          isDragging
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            : "bg-muted text-muted-foreground dark:bg-muted/50"
        }`}
      >
        {isProcessing ? (
          <FileSpreadsheetIcon
            className="size-12 animate-pulse"
            strokeWidth={1.5}
          />
        ) : (
          <UploadCloudIcon className="size-12" strokeWidth={1.5} />
        )}
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h3>
        <p className="mx-auto max-w-lg text-base text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>

      {/* Hidden Input & Action Button */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileSelect}
        disabled={isProcessing}
      />

      <Button
        disabled={isProcessing}
        onClick={() => fileInputRef.current?.click()}
        size="lg"
        className="mt-4 rounded-full px-8 py-6 text-base shadow-md transition-all hover:shadow-lg"
      >
        {isProcessing ? (
          <>
            <Loader2Icon className="mr-3 size-5 animate-spin" />
            {loadingText}
          </>
        ) : (
          "Select Excel File"
        )}
      </Button>
    </div>
  );
}
