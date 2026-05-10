"use client";

import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { safeFormatCurrency } from "@/app/common/lib/utils";

export default function LedgerTable({
  ledgerData = [],
  editingId,
  onEditClick,
  onDelete,
  onPayClick,
  onApprove,
  onReject,
  currentUserRole,
  // Note: We no longer need totalDebit or totalCredit from props!
}) {
  // 💡 NEW: Calculate totals ONLY for 'approved' rows
  const approvedDebitTotal = ledgerData.reduce((sum, row) => {
    return row.status === "approved" ? sum + (Number(row.debit) || 0) : sum;
  }, 0);

  const approvedCreditTotal = ledgerData.reduce((sum, row) => {
    return row.status === "approved" ? sum + (Number(row.credit) || 0) : sum;
  }, 0);

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
              ledgerData.map((row) => (
                <tr
                  key={row._id || row.id}
                  className={`transition-colors group ${editingId === (row._id || row.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50"}`}
                >
                  {/* Date */}
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">
                      {row.date
                        ? new Date(row.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </p>
                  </td>

                  {/* Details */}

                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${row.debit > 0 ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-500"}`}
                      >
                        {row.debit > 0 ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                          {row.description || row.desc}
                          {(row.invoiceNo || row.bankInfo?.utrReference) && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                              REF: {row.invoiceNo || row.bankInfo?.utrReference}
                            </span>
                          )}

                          {/* 💡 NEW: Show Payment Status for Invoices (Debits) */}
                          {row.debit > 0 && row.status === "approved" && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                row.paymentStatus === "Paid"
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : row.paymentStatus === "Partially Paid"
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                              }`}
                            >
                              {row.paymentStatus}{" "}
                              {row.balanceDue > 0 &&
                                `(Due: ${safeFormatCurrency(row.balanceDue)})`}
                            </span>
                          )}
                        </div>
                        {row.remarks && (
                          <p className="mt-1 text-xs italic text-slate-500">
                            "{row.remarks}"
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="px-6 py-4 font-medium text-right text-slate-900">
                    {row.debit > 0 ? safeFormatCurrency(row.debit) : "-"}
                  </td>
                  <td className="px-6 py-4 font-bold text-right text-green-600">
                    {row.credit > 0 ? safeFormatCurrency(row.credit) : "-"}
                  </td>

                  {/* Actions & Status */}
                 <td className="px-6 py-4">
                    {/* Use justify-between to push the badge left and buttons right */}
                    <div className="flex items-center justify-between gap-2">
                      
                      {/* 💡 ALWAYS VISIBLE STATUS BADGE */}
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

                      {/* HOVER ACTIONS */}
                      <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                        
                        {/* Pay Bill Button */}
                        {row.debit > 0 && row.balanceDue > 0 && row.status === "approved" && (
                          <button
                            onClick={() => onPayClick(row)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg mr-2"
                            title="Log Payment Against This Bill"
                          >
                            <IndianRupee size={16} />
                          </button>
                        )}

                        {currentUserRole === "admin" ? (
                          row.status === "pending" ? (
                            // Admin: Pending Actions
                            <>
                              <button onClick={() => onApprove(row._id || row.id)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="Approve"><CheckCircle size={16} /></button>
                              <button onClick={() => onReject(row._id || row.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg" title="Reject"><XCircle size={16} /></button>
                            </>
                          ) : (
                            // Admin: Approved Actions
                            <>
                              {!(row.debit > 0 && row.amountPaid > 0) && (
                                <button onClick={() => onEditClick(row)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Entry"><Edit size={16} /></button>
                              )}
                              <button onClick={() => onDelete(row._id || row.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Entry"><Trash2 size={16} /></button>
                            </>
                          )
                        ) : (
                          // Employee: Can ONLY Edit & Delete their pending entries
                          row.status === "pending" && (
                            <>
                              <button onClick={() => onEditClick(row)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Request"><Edit size={16} /></button>
                              <button onClick={() => onDelete(row._id || row.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Request"><Trash2 size={16} /></button>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  </td>`
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 italic text-center text-slate-400"
                >
                  No transactions found in this ledger.
                </td>
              </tr>
            )}
          </tbody>

          {/* TFOOT */}
          <tfoot className="text-white border-t bg-slate-900 border-slate-800">
            <tr>
              <td
                colSpan={2}
                className="px-6 py-5 text-xs font-bold tracking-widest text-right uppercase text-slate-400"
              >
                Running Totals (Approved Only)
              </td>
              <td className="px-6 py-5 font-bold text-right text-white border-x border-slate-800">
                {/* 💡 Use the new calculated value here */}
                {safeFormatCurrency(approvedDebitTotal)}
              </td>
              <td className="px-6 py-5 font-bold text-right text-green-400 border-r border-slate-800">
                {/* 💡 Use the new calculated value here */}
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
