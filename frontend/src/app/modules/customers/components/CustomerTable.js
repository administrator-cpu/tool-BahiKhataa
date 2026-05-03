"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 1. Import our new clean logic!
import { safeFormatCurrency } from '@/app/common/lib/utils';
import { useCustomerTotals } from '../hooks/useCustomerTotals';

export default function CustomerTable({ customers = [], currentUserRole }) {

  console.log(customers);
  
  const router = useRouter();
  
  // 2. Guarantee array safety and grab totals from our custom hook
  const safeCustomers = Array.isArray(customers) ? customers : [];
  
  const totals = useCustomerTotals(safeCustomers);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col flex-1 overflow-hidden relative">
      <div className="overflow-x-auto customScroller flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          
          {/* STICKY HEADER */}
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4">Customer Name</th>
              {currentUserRole === 'admin' && <th className="px-6 py-4 w-32">Manager</th>}
              <th className="px-6 py-4 text-right bg-slate-100/50">Total O/S</th>
              <th className="px-6 py-4 text-right">Current</th>
              <th className="px-6 py-4 text-right">30+ Days</th>
              <th className="px-6 py-4 text-right">60+ Days</th>
              <th className="px-6 py-4 text-right text-red-500">90+ Days</th>
              <th className="px-6 py-4 text-center w-32">Action</th>
            </tr>
          </thead>
          
          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-100 text-sm">
            {safeCustomers.length > 0 ? (
              safeCustomers.map((customer, index) => {
                const companyName = (customer?.company||customer?.companyName) ? String(customer.company) : 'Unknown';
                const initial = companyName.charAt(0).toUpperCase();

                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    key={customer?.id || index} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Customer Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <p className="font-bold text-slate-900">{companyName}</p>
                      </div>
                    </td>

                    {/* Manager Link (Admin Only) */}
                    {currentUserRole === 'admin' && (
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => router.push(`/dashboard/sales/${customer?.managerId}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <UserCircle size={14} /> {customer?.manager || 'N/A'}
                        </button>
                      </td>
                    )}

                    {/* Aging Buckets */}
                    <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30">{safeFormatCurrency(customer?.outstanding)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">{safeFormatCurrency(customer?.current)}</td>
                    <td className="px-6 py-4 text-right font-medium text-orange-600">{safeFormatCurrency(customer?.d30)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">{safeFormatCurrency(customer?.d60)}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600 bg-red-50/30">
                      <div className="flex items-center justify-end gap-1.5">
                        {Number(customer?.d90) > 0 && <AlertCircle size={14} className="text-red-500" />}
                        {safeFormatCurrency(customer?.d90)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => router.push(`/dashboard/ledger/${customer?.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                      >
                        Ledger <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DYNAMIC TOTALS FOOTER */}
      <div className="bg-slate-900 text-white border-t border-slate-800 sticky bottom-0 z-10 shrink-0">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <tfoot>
            <tr>
              <td className="px-6 py-5 font-bold uppercase tracking-widest text-xs text-slate-400 text-right">
                {currentUserRole === 'admin' ? 'Global Totals' : 'My Portfolio'}
              </td>
              {currentUserRole === 'admin' && <td className="w-32"></td>}
              <td className="px-6 py-5 text-right font-black text-lg text-white bg-slate-800/50">{safeFormatCurrency(totals.outstanding)}</td>
              <td className="px-6 py-5 text-right font-bold text-slate-300">{safeFormatCurrency(totals.current)}</td>
              <td className="px-6 py-5 text-right font-bold text-orange-400">{safeFormatCurrency(totals.d30)}</td>
              <td className="px-6 py-5 text-right font-bold text-red-400">{safeFormatCurrency(totals.d60)}</td>
              <td className="px-6 py-5 text-right font-black text-red-500 bg-red-950/30">{safeFormatCurrency(totals.d90)}</td>
              <td className="px-6 py-5 w-32"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}