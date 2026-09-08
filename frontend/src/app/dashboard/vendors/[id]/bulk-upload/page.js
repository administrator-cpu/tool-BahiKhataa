"use client";

import React, { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { UploadCloud, Download, CheckCircle, AlertCircle, Save, ArrowLeft, FileSpreadsheet, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import Button from "@/app/common/components/Button";
import DashboardLayout from "@/app/common/layout/DashboardLayout";
import { safeFormatCurrency } from "@/app/common/lib/utils";
import { purchaseLedgerService } from "@/app/modules/purchaseLedger/purchaseLedger.service";

export default function BulkUploadPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.id;
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [hasErrors, setHasErrors] = useState(true);
  const [previewData, setPreviewData] = useState([]);

  // 1. Download Template
  const handleDownloadTemplate = async () => {
    const toastId = toast.loading("Downloading template...");
    try {
      const response = await purchaseLedgerService.downloadBulkTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Bulk_Bills_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template downloaded!", { id: toastId });
    } catch (error) {
      toast.error("Failed to download template.", { id: toastId });
    }
  };

  // 2. Handle File Upload & Parse Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsValidating(true);
    const toastId = toast.loading("Parsing and Validating via server...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        const billsToValidate = rawJson.map(row => ({
          date: row["Date (DD-MM-YYYY)"] || null,
          invoiceNo: row["Invoice Number"] || null,
          description: row["Description"] || null,
          baseAmount: row["Base Amount"] || 0,
          productType: row["Product Type"] || null,
          logicalCircuitId: row["Logical Circuit ID"] || null,
          tdsHead: row["TDS Head"] || null,
          tdsPercentage: row["TDS Percentage"] || 0,
          remarks: row["Remarks"] || null
        }));

        if (!billsToValidate || billsToValidate.length === 0) {
          toast.error("No data found! Please add at least one row of data below the headers.", { id: toastId });
          setIsValidating(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (!vendorId) {
          toast.error("Vendor ID is missing from the URL. Please go back and try again.", { id: toastId });
          setIsValidating(false);
          return;
        }

        const response = await purchaseLedgerService.validateBulkUpload({ vendorId, bills: billsToValidate });

        setPreviewData(response.data.data.validatedBills);
        setHasErrors(response.data.data.hasErrors);
        toast.success("Validation complete!", { id: toastId });

      } catch (error) {
        console.error(error);
        toast.error(error?.response?.data?.message || "Failed to validate file.", { id: toastId });
      } finally {
        setIsValidating(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 3. Final Commit
  const handleCommit = async () => {
    if (hasErrors) return toast.error("Please fix errors in the file and re-upload.");

    setIsLoading(true);
    const toastId = toast.loading("Saving validated bills to ledger...");

    try {
      await purchaseLedgerService.commitBulkUpload({ vendorId, bills: previewData });
      toast.success("Bulk upload successful!", { id: toastId });
      router.push('/dashboard/vendors/${vendorId}');
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to commit upload.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout hideBack={true} breadcrumbs={<span className="font-bold text-lg">Bulk Upload Pipeline</span>}>

      {/* Removed the pb-24 since we no longer have a fixed bottom footer */}
      <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-10">

        {/* Navigation */}
        <div className="flex items-center">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 bg-white border-slate-200 shadow-sm">
            Back to Vendor Ledger
          </Button>
        </div>

        {/* 🚀 STEP 1 & 2: WIZARD BOX */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-black text-xl text-slate-800 mb-6 flex items-center gap-3">
            <FileSpreadsheet className="text-purple-600" size={24} />
            Data Import Wizard
          </h2>

          <div className="flex flex-col gap-4 relative">

            {/* Step 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span>
                  Download Template
                </h3>
                <p className="text-sm text-slate-500 mt-1 pl-8">Get the standard Excel file format with strictly mapped columns to ensure your data passes the tax engine validation.</p>
              </div>
              <Button onClick={handleDownloadTemplate} icon={Download} variant="secondary" className="shrink-0 bg-white shadow-sm">
                Download .xlsx
              </Button>
            </div>

            {/* Connecting Line (Visual only) */}
            <div className="absolute left-8 top-16 bottom-16 w-0.5 bg-slate-200 hidden sm:block -z-10"></div>

            {/* Step 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-purple-50/50 border border-purple-100 rounded-2xl gap-4">
              <div>
                <h3 className="font-bold text-purple-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs">2</span>
                  Upload Filled Template
                </h3>
                <p className="text-sm text-purple-700/70 mt-1 pl-8">We will securely dry-run the math, check for duplicate invoice numbers, and generate a preview before anything is saved.</p>
              </div>
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button onClick={() => fileInputRef.current.click()} icon={UploadCloud} isLoading={isValidating} className="!bg-purple-600 hover:!bg-purple-700 shrink-0">
                Select Excel File
              </Button>
            </div>

          </div>
        </div>

        {/* 🚀 STEP 3 & 4: PREVIEW TABLE WITH ATTACHED FOOTER */}
        {previewData.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">

            {/* Table Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span>
                Validation Preview ({previewData.length} Bills)
              </h3>
              {hasErrors
                ? <span className="flex items-center gap-1.5 text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm"><AlertCircle size={16} /> Errors Detected - Fix in Excel and Re-upload</span>
                : <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm"><CheckCircle size={16} /> All rows valid. Ready to save!</span>
              }
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto customScroller max-h-[500px]">
              <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
                <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  <tr>
                    <th className="px-5 py-4">Row</th>
                    <th className="px-5 py-4">Date / Invoice</th>
                    <th className="px-5 py-4 text-right">Base Amount</th>
                    <th className="px-5 py-4 text-right">Total (GST)</th>
                    <th className="px-5 py-4 text-right">TDS Ded.</th>
                    <th className="px-5 py-4 text-right">Final Payable</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className={`transition-colors ${row.isValid ? "hover:bg-slate-50" : "bg-red-50/30"}`}>
                      <td className="px-5 py-4 font-bold text-slate-400">{row.originalRow}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{row.invoiceNo || "MISSING"}</p>
                        <p className="text-xs text-slate-500">{row.date || "No Date"}</p>
                        {row.remarks && (
                          <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1 max-w-[150px]">
                            Note: {row.remarks}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-right">{safeFormatCurrency(row.baseAmount)}</td>
                      <td className="px-5 py-4 font-medium text-right text-slate-700">{safeFormatCurrency(row.totalAmount)}</td>
                      <td className="px-5 py-4 font-medium text-right text-red-500">-{safeFormatCurrency(row.tdsAmount)}</td>
                      <td className="px-5 py-4 font-black text-right text-orange-600">{safeFormatCurrency(row.payableAmount)}</td>
                      <td className="px-5 py-4 min-w-[250px]">
                        {row.isValid ? (
                          <span className="text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">Valid</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {row.errors.map((err, i) => (
                              <span key={i} className="text-xs text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 leading-tight flex items-start gap-1.5">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" /> {err}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 🚀 STEP 4: ATTACHED FOOTER (Moved here, removed sticky positioning) */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">4</span>
                  Step 4: Commit Data
                </p>
                <p className="text-xs text-slate-500 mt-1 pl-7">Finalize and post these {previewData.length} records to the ledger.</p>
              </div>

              <Button
                variant="primary"
                className="!bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50 disabled:hover:!bg-emerald-600 w-full sm:w-auto px-8 py-3 text-lg shadow-sm shrink-0"
                icon={Save}
                onClick={handleCommit}
                disabled={hasErrors}
                isLoading={isLoading}
              >
                Confirm & Save to Ledger
              </Button>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}