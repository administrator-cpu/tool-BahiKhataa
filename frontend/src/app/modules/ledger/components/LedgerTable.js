"use client";

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { safeFormatCurrency } from '@/app/common/lib/utils';

export default function LedgerTable({ 
  ledgerData = [], 
  editingId, 
  onEditClick, 
  onDelete,
  onApprove,       
  onReject,        
  currentUserRole 
  // Note: We no longer need totalDebit or totalCredit from props!
}) {

  // 💡 NEW: Calculate totals ONLY for 'approved' rows
  const approvedDebitTotal = ledgerData.reduce((sum, row) => {
    return row.status === 'approved' ? sum + (Number(row.debit) || 0) : sum;
  }, 0);

  const approvedCreditTotal = ledgerData.reduce((sum, row) => {
    return row.status === 'approved' ? sum + (Number(row.credit) || 0) : sum;
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
                  className={`transition-colors group ${editingId === (row._id || row.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
                >
                  {/* Date */}
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </td>
                  
                  {/* Details */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${row.debit > 0 ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                        {row.debit > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                          {row.description || row.desc} 
                          {(row.invoiceNo || row.bankInfo?.utrReference) && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                              REF: {row.invoiceNo || row.bankInfo?.utrReference}
                            </span>
                          )}
                        </p>
                        {row.remarks && <p className="mt-1 text-xs italic text-slate-500">"{row.remarks}"</p>}
                      </div>
                    </div>
                  </td>
                  
                  {/* Financials */}
                  <td className="px-6 py-4 font-medium text-right text-slate-900">
                    {row.debit > 0 ? safeFormatCurrency(row.debit) : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-right text-green-600">
                    {row.credit > 0 ? safeFormatCurrency(row.credit) : '-'}
                  </td>

                  {/* Actions & Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      
                      {/* ALWAYS VISIBLE STATUS BADGES */}
                      {row.status === 'pending' && (
                         <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase border border-amber-100" title="Pending Approval">
                           <Clock size={12} />
                           <span>Pending</span>
                         </div>
                      )}
                      {row.status === 'rejected' && (
                         <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase border border-red-100" title={row.rejectionReason}>
                           <XCircle size={12} />
                           <span>Rejected</span>
                         </div>
                      )}

                      {/* HOVER ACTIONS (Buttons) */}
                      <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                        {currentUserRole === 'admin' ? (
                          // Admin View: Approve/Reject buttons for pending logs
                          row.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => onApprove(row._id || row.id)} 
                                className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors shadow-sm" 
                                title="Approve Entry"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => onReject(row._id || row.id)} 
                                className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors shadow-sm" 
                                title="Reject Entry"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )
                        ) : (
                          // Employee View: Edit button
                          <button 
                            onClick={() => onEditClick(row)} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                            title="Edit Entry"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>

                    </div>
                  </td>
                </tr>
              ))
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