"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  ListTree,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Loader2 // 💡 Added Loader2 for the loading spinner
} from "lucide-react";
import { safeFormatCurrency } from "@/app/common/lib/utils";
import { ledgerService } from "../ledger.service";

export default function LedgerTable({
  ledgerData = [],
  editingId,
  onEditClick,
  onDelete,
  onPayClick,
  onApprove,
  onReject,
  currentUserRole,
}) {
  const [expandedId, setExpandedId] = useState(null);
  
  // 💡 NEW: States to hold the fetched data and loading status
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const approvedDebitTotal = ledgerData.reduce((sum, row) => {
    return row.status === "approved" ? sum + (Number(row.debit) || 0) : sum;
  }, 0);

  const approvedCreditTotal = ledgerData.reduce((sum, row) => {
    return row.status === "approved" ? sum + (Number(row.credit) || 0) : sum;
  }, 0);

  // 💡 NEW: Combined function to handle expanding AND fetching
  const handleExpandClick = async (rowId) => {
    if (expandedId === rowId) {
      // If clicking the already expanded row, just collapse it
      setExpandedId(null);
      setExpandedDetails(null);
    } else {
      // Expand, show loader, and fetch data
      setExpandedId(rowId);
      setIsLoadingDetails(true);
      setExpandedDetails(null); // Clear previous details

      try {
        const { data } = await ledgerService.getLedgerEntryDetails(rowId);
        // Save the populated log data to state
        setExpandedDetails(data?.log);
      } catch (error) {
        console.error("Failed to fetch entry details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  return (
    <div className="flex flex-col overflow-hidden bg-white border shadow-sm border-slate-200 rounded-3xl">
      <div className="overflow-x-auto customScroller">
        <table className="w-full text-left border-collapse min-w-200">
          {/* THEAD */}
          <thead className="sticky top-0 z-10 font-bold tracking-widest uppercase border-b bg-slate-50 border-slate-200 text-[10px] text-slate-400">
            <tr>
              <th className="w-32 px-6 py-4">Date</th>
              <th className="px-6 py-4">Transaction Details</th>
              <th className="w-40 px-6 py-4 text-right">Debit (Dr)</th>
              <th className="w-40 px-6 py-4 text-right">Credit (Cr)</th>
              <th className="w-40 px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          {/* TBODY */}
          <tbody className="text-sm divide-y divide-slate-100">
            {ledgerData.length > 0 ? (
              ledgerData.map((row) => {
                const rowId = row._id || row.id;
                const isExpanded = expandedId === rowId;
                
                // We check the summary row to see if the button should appear at all
                const hasAllocations = row.allocations && row.allocations.length > 0;
                const hasPayments = row.paymentsReceived && row.paymentsReceived.length > 0;
                const canExpand = hasAllocations || hasPayments;

                return (
                  <React.Fragment key={rowId}>
                    {/* Main Row */}
                    <tr className={`transition-colors group ${editingId === rowId ? "bg-blue-50/50" : "hover:bg-slate-50/50"}`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">
                          {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${row.debit > 0 ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-500"}`}>
                            {row.debit > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                              {row.description || row.desc}
                              {(row.invoiceNo || row.bankInfo?.utrReference) && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                                  REF: {row.invoiceNo || row.bankInfo?.utrReference}
                                </span>
                              )}

                              {row.debit > 0 && row.status === "approved" && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                    row.paymentStatus === "Paid" ? "bg-green-50 text-green-600 border-green-200"
                                    : row.paymentStatus === "Partially Paid" ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                                  }`}
                                >
                                  {row.paymentStatus} {row.balanceDue > 0 && `(Due: ${safeFormatCurrency(row.balanceDue)})`}
                                </span>
                              )}
                            </div>
                            {row.remarks && <p className="mt-1 text-xs italic text-slate-500">"{row.remarks}"</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-right text-slate-900">
                        {row.debit > 0 ? safeFormatCurrency(row.debit) : "-"}
                      </td>
                      <td className="px-6 py-4 font-bold text-right text-green-600">
                        {row.credit > 0 ? safeFormatCurrency(row.credit) : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            {row.status === "pending" && (
                              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase bg-amber-100/50 border border-amber-200 rounded-lg">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                            {row.status === "rejected" && (
                              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold tracking-wider text-red-600 uppercase bg-red-50 border border-red-200 rounded-lg">
                                <XCircle size={12} /> Rejected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                            
                            {/* 💡 UPDATED: Calls handleExpandClick */}
                            {canExpand && (
                              <button
                                onClick={() => handleExpandClick(rowId)}
                                className={`p-1.5 rounded-lg mr-2 flex items-center gap-1 transition-colors ${isExpanded ? 'bg-slate-200 text-slate-800' : 'text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800'}`}
                                title="View Linked Entries"
                              >
                                <ListTree size={16} />
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}

                            {row.debit > 0 && row.balanceDue > 0 && row.status === "approved" && (
                              <button onClick={() => onPayClick(row)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg mr-2" title="Log Payment Against This Bill">
                                <IndianRupee size={16} />
                              </button>
                            )}

                            {currentUserRole === "admin" ? (
                              row.status === "pending" ? (
                                <>
                                  <button onClick={() => onApprove(rowId)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="Approve"><CheckCircle size={16} /></button>
                                  <button onClick={() => onReject(rowId)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg" title="Reject"><XCircle size={16} /></button>
                                </>
                              ) : (
                                <>
                                  {!(row.debit > 0 && row.amountPaid > 0) && (
                                    <button onClick={() => onEditClick(row)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Entry"><Edit size={16} /></button>
                                  )}
                                  <button onClick={() => onDelete(rowId)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Entry"><Trash2 size={16} /></button>
                                </>
                              )
                            ) : (
                              row.status === "pending" && (
                                <>
                                  <button onClick={() => onEditClick(row)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Request"><Edit size={16} /></button>
                                  <button onClick={() => onDelete(rowId)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Request"><Trash2 size={16} /></button>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* 💡 UPDATED: Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                        <td colSpan={5} className="px-0 py-0">
                          <div className="pl-14 pr-6 py-4 animate-in slide-in-from-top-2 fade-in duration-200 min-h-[80px]">
                            
                            {/* Loading State */}
                            {isLoadingDetails ? (
                              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium h-full">
                                <Loader2 className="animate-spin text-blue-600" size={16} /> Fetching detailed records...
                              </div>
                            ) : expandedDetails ? (
                              <>
                                {/* Scenario A: Showing Payments applied to an Invoice (Debit) */}
                                {expandedDetails.paymentsReceived && expandedDetails.paymentsReceived.length > 0 && (
                                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">Payments Received for this Invoice</h4>
                                    <div className="space-y-2">
                                      {expandedDetails.paymentsReceived.map((payment, idx) => {
                                        const source = payment.paymentId; 
                                        return (
                                          <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-slate-600">
                                              <CornerDownRight size={14} className="text-slate-400" />
                                              {source?.isUsingAdvance ? (
                                                <span className="text-blue-600 italic">Paid from Customer Advance Balance</span>
                                              ) : (
                                                <span>Paid via <strong className="text-slate-800">{source?.bankInfo?.bankName || 'Unknown'}</strong> (Ref: {source?.bankInfo?.utrReference || 'N/A'})</span>
                                              )}
                                              <span className="text-xs text-slate-400"> • {source?.date ? new Date(source.date).toLocaleDateString() : 'No date'}</span>
                                            </div>
                                            <span className="font-bold text-green-600">+{safeFormatCurrency(payment.amountApplied)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Scenario B: Showing Invoices cleared by a Payment (Credit) */}
                                {expandedDetails.allocations && expandedDetails.allocations.length > 0 && (
                                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-100 pb-2">Invoices Cleared by this Payment</h4>
                                    <div className="space-y-2">
                                      {expandedDetails.allocations.map((alloc, idx) => {
                                        const bill = alloc.billId; 
                                        return (
                                          <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-slate-600">
                                              <CornerDownRight size={14} className="text-slate-400" />
                                              <span>Applied to Invoice <strong className="text-slate-800">#{bill?.invoiceNo || 'Unknown'}</strong></span>
                                              <span className="text-xs text-slate-400"> • {bill?.date ? new Date(bill.date).toLocaleDateString() : 'No date'}</span>
                                            </div>
                                            <span className="font-bold text-orange-600">-{safeFormatCurrency(alloc.amountApplied)}</span>
                                          </div>
                                        );
                                      })}
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
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 italic text-center text-slate-400">
                  No transactions found in this ledger.
                </td>
              </tr>
            )}
          </tbody>

          {/* TFOOT */}
          <tfoot className="text-white border-t bg-slate-900 border-slate-800">
            <tr>
              <td colSpan={2} className="px-6 py-5 text-xs font-bold tracking-widest text-right uppercase text-slate-400">
                Running Totals (Approved Only)
              </td>
              <td className="px-6 py-5 font-bold text-right text-white border-x border-slate-800">
                {safeFormatCurrency(approvedDebitTotal)}
              </td>
              <td className="px-6 py-5 font-bold text-right text-green-400 border-r border-slate-800">
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