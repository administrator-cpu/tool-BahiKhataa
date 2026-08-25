"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ListTree,
  IndianRupee
} from "lucide-react";
import toast from "react-hot-toast";

import { safeFormatCurrency } from "@/app/common/lib/utils";
import { purchaseLedgerService } from "../purchaseLedger.service";

export default function PurchaseLedgerTable({ ledgerData = [], onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const toggleMonth = (monthYear) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthYear]: !prev[monthYear], // Toggle between true/false
    }));
  };

  const approvedDebitTotal = ledgerData.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const approvedCreditTotal = ledgerData.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this AP entry? This will reverse the math and update balances instantly.")) return;

    setIsDeleting(true);
    const toastId = toast.loading("Deleting AP entry...");
    try {
      await purchaseLedgerService.deleteLedgerEntry(id);
      toast.success("Entry deleted successfully", { id: toastId });
      onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete entry", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExpandClick = async (rowId) => {
    if (expandedId === rowId) {
      setExpandedId(null);
      setExpandedDetails(null);
    } else {
      setExpandedId(rowId);
      setIsLoadingDetails(true);
      setExpandedDetails(null);
      try {
        const response = await purchaseLedgerService.getLedgerEntryDetails(rowId);
        const logData = response?.data?.data?.log || response?.data?.log || response?.log;
        setExpandedDetails(logData);
      } catch (error) {
        console.error("Failed to fetch entry details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  const groupedLedger = [];
  ledgerData.forEach((row) => {
    const monthYear = new Date(row.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const lastGroup = groupedLedger[groupedLedger.length - 1];

    if (lastGroup && lastGroup.monthYear === monthYear) {
      lastGroup.rows.push(row);
    } else {
      groupedLedger.push({ monthYear, rows: [row] });
    }
  });

  return (
    <div className="flex flex-col overflow-hidden bg-white border shadow-sm border-slate-200 rounded-3xl">
      <div className="overflow-x-auto customScroller">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 font-bold tracking-widest uppercase border-b bg-slate-50 border-slate-200 text-[10px] text-slate-400">
            <tr>
              <th className="w-32 px-6 py-4">Date</th>
              <th className="px-6 py-4">Transaction Details</th>
              <th className="w-32 px-6 py-4">Product Type</th>
              <th className="w-40 px-6 py-4 text-right">Payment Out (Dr)</th>
              <th className="w-40 px-6 py-4 text-right">Supplier Bill (Cr)</th>
              <th className="w-24 px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-slate-100">
            {groupedLedger.length > 0 ? (
              groupedLedger.map((group) => (
                <React.Fragment key={group.monthYear}>
                  {/* 🗓️ MONTH DIVIDER ROW */}
                  <tr
                    onClick={() => toggleMonth(group.monthYear)}
                    className="bg-slate-100/80 border-y border-slate-200 shadow-inner cursor-pointer hover:bg-slate-200 transition-colors select-none"
                  >
                    <td colSpan={6} className="px-6 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase flex items-center gap-2">
                          {collapsedMonths[group.monthYear] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                          {group.monthYear}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                          {group.rows.length} {group.rows.length === 1 ? 'Entry' : 'Entries'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* 🧾 ACTUAL TRANSACTIONS FOR THIS MONTH */}
                  {!collapsedMonths[group.monthYear] && group.rows.map((row) => {
                    const rowId = row._id || row.id;
                    const isExpanded = expandedId === rowId;
                    const canExpand = (row.allocations && row.allocations.length > 0) || (row.paymentsMade && row.paymentsMade.length > 0);

                    return (
                      <React.Fragment key={rowId}>
                        <tr className="transition-colors hover:bg-slate-50/50 group">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">
                                {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </td>

                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${row.debit > 0 ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                                {row.debit > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                                  {row.description}
                                  {(row.invoiceNo || row.bankInfo?.utrReference) && (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                                      {row.invoiceNo ? 'INV' : 'UTR'}: {row.invoiceNo || row.bankInfo?.utrReference}
                                    </span>
                                  )}

                                  {row.logicalCircuitId && (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      LCID: {row.logicalCircuitId}
                                    </span>
                                  )}

                                  {row.credit > 0 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${row.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                      : row.paymentStatus === "Partially Paid" ? "bg-amber-50 text-amber-600 border-amber-200"
                                        : "bg-red-50 text-red-600 border-red-200"
                                      }`}>
                                      {row.paymentStatus} {row.balanceDue > 0 && `(Owe: ${safeFormatCurrency(row.balanceDue)})`}
                                    </span>
                                  )}
                                </div>
                                {row.remarks && <p className="mt-1 text-xs italic text-slate-500">"{row.remarks}"</p>}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {row.productType ? (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase whitespace-nowrap">
                                {row.productType}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold text-right text-emerald-600">
                            {row.debit > 0 ? safeFormatCurrency(row.debit) : "-"}
                          </td>
                          <td className="px-6 py-4 font-bold text-right text-orange-600">
                            {row.credit > 0 ? safeFormatCurrency(row.credit) : "-"}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canExpand && (
                                <button onClick={() => handleExpandClick(rowId)} className={`p-1.5 rounded-lg transition-colors ${isExpanded ? "bg-slate-200 text-slate-800" : "text-slate-500 bg-slate-100 hover:bg-slate-200"}`}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ListTree size={16} />}
                                </button>
                              )}
                              <button onClick={() => handleDelete(rowId)} disabled={isDeleting} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* DYNAMIC EXPANDED ROW */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                            <td colSpan={6} className="px-0 py-0">
                              <div className="pl-14 pr-6 py-4 animate-in slide-in-from-top-2 fade-in duration-200 min-h-[80px]">
                                {isLoadingDetails ? (
                                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium h-full">
                                    <Loader2 className="animate-spin text-purple-600" size={16} /> Fetching detailed records...
                                  </div>
                                ) : expandedDetails ? (
                                  <>
                                    {/* AP SCENARIO A: Showing Payments made against a Supplier Bill */}
                                    {expandedDetails.paymentsMade && expandedDetails.paymentsMade.length > 0 && (
                                      <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">
                                          Payments Made for this Bill
                                        </h4>
                                        <div className="space-y-2">
                                          {expandedDetails.paymentsMade.map((payment, idx) => {
                                            const source = payment.paymentId;
                                            return (
                                              <div key={idx} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                  <CornerDownRight size={14} className="text-slate-400" />
                                                  {source?.isUsingAdvance ? (
                                                    <span className="text-purple-600 italic">Deducted from Advance Wallet</span>
                                                  ) : (
                                                    <span>
                                                      Paid via <strong className="text-slate-800">{source?.bankInfo?.bankName || "Unknown"}</strong> (Ref: {source?.bankInfo?.utrReference || "N/A"})
                                                    </span>
                                                  )}
                                                  <span className="text-xs text-slate-400"> • {source?.date ? new Date(source.date).toLocaleDateString() : "No date"}</span>
                                                </div>
                                                <span className="font-bold text-emerald-600">
                                                  +{safeFormatCurrency(payment.amountApplied)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* AP SCENARIO B: Showing Distribution of a Payment Out (Bills Cleared + Advance) */}
                                    {expandedDetails.debit > 0 && (expandedDetails.allocations?.length > 0 || expandedDetails.unallocatedAmount > 0) && (
                                      <div className="bg-white border border-slate-200 rounded-xl p-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">
                                          Payment Distribution
                                        </h4>
                                        <div className="space-y-3">
                                          {/* Part 1: Money applied to specific bills */}
                                          {expandedDetails.allocations && expandedDetails.allocations.map((alloc, idx) => {
                                            const bill = alloc.billId;
                                            return (
                                              <div key={idx} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                  <CornerDownRight size={14} className="text-slate-400" />
                                                  <span>
                                                    Applied to Bill <strong className="text-slate-800">#{bill?.invoiceNo || "Unknown"}</strong>
                                                  </span>
                                                  <span className="text-xs text-slate-400"> • {bill?.date ? new Date(bill.date).toLocaleDateString() : "No date"}</span>
                                                </div>
                                                <span className="font-bold text-orange-600">
                                                  {safeFormatCurrency(alloc.amountApplied)}
                                                </span>
                                              </div>
                                            );
                                          })}

                                          {/* Part 2: Money sent to the Advance Wallet */}
                                          {expandedDetails.unallocatedAmount > 0 && (
                                            <div className={`flex items-center justify-between text-sm ${expandedDetails.allocations?.length > 0 ? "pt-3 border-t border-slate-100" : ""}`}>
                                              <div className="flex items-center gap-2 text-slate-600">
                                                <CornerDownRight size={14} className="text-emerald-500" />
                                                <span>
                                                  Transferred to <strong className="text-emerald-700">Advance Wallet</strong> (Overpayment)
                                                </span>
                                              </div>
                                              <span className="font-bold text-emerald-600">
                                                {safeFormatCurrency(expandedDetails.unallocatedAmount)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-sm text-slate-500 italic">No detailed records found.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 italic text-center text-slate-400">
                  No transactions found in this AP ledger.
                </td>
              </tr>
            )}
          </tbody>

          {/* TFOOT */}
          <tfoot className="text-white border-t bg-slate-900 border-slate-800">
            <tr>
              <td colSpan={3} className="px-6 py-5 text-xs font-bold tracking-widest text-right uppercase text-slate-400">
                Running Totals
              </td>
              <td className="px-6 py-5 font-bold text-right text-emerald-400 border-x border-slate-800">
                {safeFormatCurrency(approvedDebitTotal)}
              </td>
              <td className="px-6 py-5 font-bold text-right text-orange-400 border-r border-slate-800">
                {safeFormatCurrency(approvedCreditTotal)}
              </td>
              <td className="px-6 py-5 bg-slate-800/20"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}