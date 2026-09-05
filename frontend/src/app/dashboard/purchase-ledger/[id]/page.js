"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Building2, Loader2, IndianRupee, AlertCircle, Edit, MapPin, Mail, FileText, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "@/app/common/layout/DashboardLayout";
import { purchaseLedgerService } from "@/app/modules/purchaseLedger/purchaseLedger.service";
import { safeFormatCurrency } from "@/app/common/lib/utils";

import PurchaseLedgerForm from "@/app/modules/purchaseLedger/components/PurchaseLedgerForm";
import PurchaseLedgerTable from "@/app/modules/purchaseLedger/components/PurchaseLedgerTable";
import EditVendorModal from "@/app/modules/Vendor/comnponents/EditVendorModal";

export default function VendorPurchaseLedgerPage() {
  const params = useParams();
  const vendorId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState([]);
  const [totals, setTotals] = useState({ outstanding: 0, availableAdvance: 0 });
  const [aging, setAging] = useState(null);
  const [editingLog, setEditingLog] = useState(null);

  const [vendorProfile, setVendorProfile] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await purchaseLedgerService.getVendorDashboard(vendorId);

      setLedgerData(res.data.transactions || []);
      setTotals(res.data.totals);
      setAging(res.data.aging);
      setVendorProfile(res.data.vendorProfile);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load purchase ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorId) fetchLedger();
  }, [fetchLedger, vendorId]);

  const unpaidBills = ledgerData.filter(log => log.credit > 0 && log.balanceDue > 0 && log.status === 'approved');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
          <p className="text-slate-500 font-medium">Loading AP Ledger...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      breadcrumbs={
        <div className="flex items-center gap-2 text-lg">
          <Building2 size={20} className="text-purple-600" />
          <span className="font-bold text-slate-900">{vendorProfile?.companyName || 'Vendor Ledger'}</span>
          <span className="text-slate-400 font-normal ml-2">| Accounts Payable</span>
        </div>
      }
    >
      {/* 📦 UNIFIED MASTER CARD: Details + Financials */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm mb-6 overflow-hidden">

        {/* Top Half: Vendor Profile & Edit */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{vendorProfile?.companyName}</h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
              {vendorProfile?.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {vendorProfile.email}</span>
              )}
              {vendorProfile?.gstNumber && (
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400" /> GST: <span className="uppercase">{vendorProfile.gstNumber}</span></span>
              )}
              {vendorProfile?.panNumber && (
                <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400" /> PAN: <span className="uppercase font-mono">{vendorProfile.panNumber}</span></span>
              )}
              {vendorProfile?.address && (
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {vendorProfile.address}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-200 hover:bg-purple-50 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Edit size={16} /> Edit Vendor
          </button>
        </div>

        {/* Bottom Half: Financial Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          <div className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Payable</p>
              <h3 className="text-2xl font-black text-slate-900">{safeFormatCurrency(totals.outstanding)}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee size={24} />
            </div>
          </div>

          <div className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Advance Paid</p>
              <h3 className="text-2xl font-black text-emerald-600">{safeFormatCurrency(totals.availableAdvance)}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee size={24} />
            </div>
          </div>

          <div className={`p-6 flex items-center justify-between transition-colors ${aging?.ninetyPlus > 0 ? 'bg-red-50' : 'group hover:bg-slate-50'}`}>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${aging?.ninetyPlus > 0 ? 'text-red-500' : 'text-slate-400'}`}>90+ Days Overdue</p>
              <h3 className={`text-2xl font-black ${aging?.ninetyPlus > 0 ? 'text-red-700' : 'text-slate-900'}`}>{safeFormatCurrency(aging?.ninetyPlus || 0)}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${aging?.ninetyPlus > 0 ? 'bg-red-100 text-red-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 VERTICAL STACK: Full Width Form & Table */}
      <div className="flex flex-col gap-6">

        {/* Full Width Data Entry */}
        <PurchaseLedgerForm
          vendorId={vendorId}
          unpaidBills={unpaidBills}
          onSuccess={fetchLedger}
          availableAdvance={totals.availableAdvance}
          editingLog={editingLog}
          onCancelEdit={() => setEditingLog(null)}
        />

        {/* Full Width Transaction History */}
        <PurchaseLedgerTable
          ledgerData={ledgerData}
          onRefresh={fetchLedger}
          onEditClick={(log) => {
            setEditingLog(log);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

      </div>

      {/* MODAL */}
      {isEditModalOpen && vendorProfile && (
        <EditVendorModal
          vendor={vendorProfile}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchLedger}
        />
      )}

    </DashboardLayout>
  );
}