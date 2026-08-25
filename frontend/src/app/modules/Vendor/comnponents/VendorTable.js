"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { safeFormatCurrency } from '@/app/common/lib/utils';

export default function VendorTable({ vendors = [] }) {
  const router = useRouter();
  const safeVendors = Array.isArray(vendors) ? vendors : [];

  // Calculate Totals inline for the footer
  const totals = safeVendors.reduce((acc, curr) => ({
    outstanding: acc.outstanding + (curr?.aging?.total || 0),
    current: acc.current + (curr?.aging?.current || 0),
    d30: acc.d30 + (curr?.aging?.thirtyPlus || 0),
    d60: acc.d60 + (curr?.aging?.sixtyPlus || 0),
    d90: acc.d90 + (curr?.aging?.ninetyPlus || 0),
  }), { outstanding: 0, current: 0, d30: 0, d60: 0, d90: 0 });

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col flex-1 overflow-hidden relative">
      <div className="overflow-x-auto customScroller flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">

          {/* STICKY HEADER */}
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4">Vendor / Supplier Name</th>
              <th className="px-6 py-4 text-right bg-slate-100/50">Total Payable</th>
              <th className="px-6 py-4 text-right">Current</th>
              <th className="px-6 py-4 text-right">30+ Days</th>
              <th className="px-6 py-4 text-right">60+ Days</th>
              <th className="px-6 py-4 text-right text-red-500">90+ Days</th>
              <th className="px-6 py-4 text-center w-32">Action</th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-100 text-sm">
            {safeVendors.length > 0 ? (
              safeVendors.map((vendor, index) => {
                const companyName = String(vendor?.name || 'Unknown');
                const initial = companyName.charAt(0).toUpperCase();

                return (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    key={vendor?.id || index}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Vendor Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <p className="font-bold text-slate-900 flex items-center gap-2">
                            {companyName}
                          </p>
                          {vendor.availableAdvance > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              Advance Paid: {safeFormatCurrency(vendor.availableAdvance)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Aging Buckets */}
                    <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30">{safeFormatCurrency(vendor?.aging?.total)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">{safeFormatCurrency(vendor?.aging?.current)}</td>
                    <td className="px-6 py-4 text-right font-medium text-orange-600">{safeFormatCurrency(vendor?.aging?.thirtyPlus)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">{safeFormatCurrency(vendor?.aging?.sixtyPlus)}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600 bg-red-50/30">
                      <div className="flex items-center justify-end gap-1.5">
                        {Number(vendor?.aging?.ninetyPlus) > 0 && <AlertCircle size={14} className="text-red-500" />}
                        {safeFormatCurrency(vendor?.aging?.ninetyPlus)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => router.push(`/dashboard/purchase-ledger/${vendor?.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-600 hover:text-white transition-all active:scale-95"
                      >
                        Ledger <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-2">
                  <Building2 size={32} className="text-slate-300" />
                  No vendors found.
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
                Total Payables
              </td>
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