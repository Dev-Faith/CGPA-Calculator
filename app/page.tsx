"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { DownloadIcon, RefreshCcwIcon, FileUpIcon } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartBar } from "@/components/bar-chart";
import { CalculationSummary } from "@/components/calculation-summary";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileUploadDropzone } from "@/components/dropzone";
import { DepartmentData } from "@/lib/cgpa-calculator";
import { loadParsedResults, saveParsedResults } from "@/lib/parsed-results-cache";

import {
  processBroadsheetFile,
  downloadProcessedSheet,
  mergeDocxScoresIntoData,
} from "@/lib/cgpa-calculator";
import { processDocxFile } from "@/lib/docx-parser";

export default function Page() {
  // State management for the parsing workflow
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);

  // Data states retrieved from the Excel parser
  const [tableData, setTableData] = useState<DepartmentData[]>([]);
  
  useEffect(() => {
    const cachedResults = loadParsedResults();
    if (cachedResults.length === 0) return;

    queueMicrotask(() => {
      setTableData(cachedResults);
      setIsProcessed(true);
    });
  }, []);
  const [processedWorkbook, setProcessedWorkbook] = useState<any>(null);
  const [originalFilename, setOriginalFilename] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMergeClick = () => {
    fileInputRef.current?.click();
  };

  const handleMergeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error("Please select a valid DOCX file to merge.");
      return;
    }

    setIsProcessing(true);
    toast.loading(`Merging scores from ${file.name}...`, { id: "merging" });

    try {
      const { parsedData: docxData } = await processDocxFile(file);
      const merged = mergeDocxScoresIntoData(tableData, docxData);
      setTableData(merged);
      saveParsedResults(merged);
      toast.success("DOCX scores merged successfully!", { id: "merging" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to merge DOCX file.", { id: "merging" });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // The core handler that wires the dropzone to the math engine
  const handleFileUpload = async (file: File) => {
    const hadPreviousResults = tableData.length > 0;
    setIsProcessing(true);
    toast.loading(`Parsing ${file.name}...`, { id: "parsing" });

    try {
      let parsedData: DepartmentData[];
      let workbook: any = null;

      if (file.name.toLowerCase().endsWith('.docx')) {
        const result = await processDocxFile(file);
        parsedData = result.parsedData;
      } else {
        const result = await processBroadsheetFile(file);
        parsedData = result.parsedData;
        workbook = result.processedWorkbook;
      }

      // Save the structured department results and Excel file to state
      setTableData(parsedData);
      saveParsedResults(parsedData);
      setProcessedWorkbook(workbook);
      setOriginalFilename(file.name);

      // Transition to the dashboard view
      setIsProcessed(true);
      toast.success("Broadsheet calculated successfully!", { id: "parsing" });
    } catch (error) {
      console.error(error);
      if (hadPreviousResults) setIsProcessed(true);
      toast.error(
        "Failed to parse the Excel file. Please ensure it is a valid broadsheet.",
        { id: "parsing" },
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedWorkbook) {
      downloadProcessedSheet(processedWorkbook, originalFilename);
      toast.success("Excel file downloaded!");
    }
  };

  const handleReset = () => {
    // Retain the current result until a replacement upload finishes successfully.
    setIsProcessed(false);
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))] overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {}
            {isProcessed ? (
              /* --- DASHBOARD VIEW (Shows after successful calculation) --- */
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Action Bar */}
                <div className="mx-4 lg:mx-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/30 p-4 rounded-xl border gap-4">
                  {/* <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      Processed Results
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {tableData.length} students calculated.
                    </p>
                  </div> */}

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* <Button
                      onClick={handleDownload}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex-1 sm:flex-none"
                    >
                      <DownloadIcon className="mr-2 size-4" />
                      Download Processed Excel
                    </Button> */}
                    <Button
                      onClick={handleMergeClick}
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isProcessing}
                    >
                      <FileUpIcon className="mr-2 size-4" />
                      Merge DOCX Scores
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                      onChange={handleMergeFileChange} 
                    />
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1 sm:flex-none"
                    >
                      <RefreshCcwIcon className="mr-2 size-4" />
                      Upload New
                    </Button>
                  </div>
                </div>

                <SectionCards tableData={tableData} />

                <div className="px-4 lg:px-6">
                  <ChartBar tableData={tableData} />
                </div>

                {/* Pass the dynamically calculated data to our table */}
                <DataTable departments={tableData} />

                {/* Calculation breakdown and remarks grading guide */}
                <CalculationSummary />
              </div>
            ) : (
              /* --- DROPZONE VIEW (Initial State) --- */
              <div className="flex flex-1 items-center justify-center p-6 lg:p-10 h-full min-h-[50vh]">
                <div className="w-full max-w-3xl">
                  <FileUploadDropzone
                    onUpload={handleFileUpload}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
