"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, IndianRupee, AlertCircle, Edit, MapPin, Mail, FileText, CreditCard, UploadCloud, Download, FileSpreadsheet } from "lucide-react"
import toast from "react-hot-toast";

import DashboardLayout from "@/app/common/layout/DashboardLayout";
import { purchaseLedgerService } from "@/app/modules/purchaseLedger/purchaseLedger.service";
import { safeFormatCurrency } from "@/app/common/lib/utils";

import PurchaseLedgerForm from "@/app/modules/purchaseLedger/components/PurchaseLedgerForm";
import PurchaseLedgerTable from "@/app/modules/purchaseLedger/components/PurchaseLedgerTable";
import EditVendorModal from "@/app/modules/Vendor/comnponents/EditVendorModal";
import VendorCircuitBilling from "@/app/modules/circuitBilling/components/VendorCircuitBilling";
import RevalidatingBadge from "@/app/common/components/RevalidatingBadge";
import { peek, load, isFresh, invalidate, cachedLoad, FRESH_MS } from "@/app/common/lib/swrCache";
import { vendorLedgerKey, fetchVendorLedger, fetchVendorLedgerPage, startEarlyLedgerFetch, LEDGER_PAGE_SIZE } from "@/app/common/lib/ledgerPrefetch";
import LedgerPageSkeleton from "@/app/common/components/LedgerPageSkeleton";

startEarlyLedgerFetch();

export default function VendorPurchaseLedgerPage() {
  const params = useParams();
  const vendorId = params.id;
  const router = useRouter();

  // Paint from the hover-prefetched response when we have one (same server data, just earlier)
  const ledgerKey = vendorLedgerKey(vendorId);
  const [cachedAtMount] = useState(() => peek(ledgerKey));
  const [isLoading, setIsLoading] = useState(!cachedAtMount);
  const [isRevalidating, setIsRevalidating] = useState(!!cachedAtMount && !isFresh(ledgerKey));
  const [ledgerData, setLedgerData] = useState(cachedAtMount?.data?.transactions || []);
  const [totals, setTotals] = useState(cachedAtMount?.data?.totals || { outstanding: 0, availableAdvance: 0 });
  const [aging, setAging] = useState(cachedAtMount?.data?.aging || null);
  const [editingLog, setEditingLog] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(cachedAtMount?.data?.vendorProfile || null);
  // Paging + whole-history figures computed on the server (same rules as before)
  const [columnTotals, setColumnTotals] = useState(cachedAtMount?.data?.columnTotals || null);
  const [unpaidBills, setUnpaidBills] = useState(cachedAtMount?.data?.unpaidBills || []);
  const [nextCursor, setNextCursor] = useState(cachedAtMount?.data?.nextCursor || null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const generation = useRef(0); // bumps on every full reload so a late "load more" can't append stale rows
  const loadedRows = useRef(0);  // rows on screen, read by refresh without re-creating it
  useEffect(() => { loadedRows.current = ledgerData.length; }, [ledgerData.length]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const applyLedger = useCallback((res) => {
    generation.current += 1;
    setLedgerData(res.data.transactions || []);
    setNextCursor(res.data.nextCursor || null);
    setColumnTotals(res.data.columnTotals || null);
    setUnpaidBills(res.data.unpaidBills || []);
    setTotals(res.data.totals);
    setAging(res.data.aging);
    setVendorProfile(res.data.vendorProfile);
  }, []);

  // After any write: drop the cache and load fresh from the server. The current figures stay
  // on screen (with an "Updating" badge) instead of blanking the page, and as many rows as
  // are loaded are fetched again so the scroll position holds.
  const fetchLedger = useCallback(async () => {
    const limit = Math.min(Math.max(LEDGER_PAGE_SIZE, loadedRows.current), 500);
    try {
      setIsRevalidating(true);
      invalidate(vendorLedgerKey(vendorId));
      const res = await load(vendorLedgerKey(vendorId), () => fetchVendorLedger(vendorId, limit));
      applyLedger(res);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load purchase ledger.");
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [vendorId, applyLedger]);

  // Infinite scroll: next 50 rows (display only; totals and unpaid bills come from the server)
  const loadMore = useCallback(async () => {
    if (!vendorId || !nextCursor || isLoadingMore) return;
    const startedIn = generation.current;
    setIsLoadingMore(true);
    try {
      const res = await fetchVendorLedgerPage(vendorId, nextCursor);
      if (startedIn !== generation.current) return;
      const more = res?.data?.transactions || [];
      setLedgerData((rows) => {
        const seen = new Set(rows.map((r) => String(r._id)));
        return rows.concat(more.filter((r) => !seen.has(String(r._id))));
      });
      setNextCursor(res?.data?.nextCursor || null);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load older entries.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [vendorId, nextCursor, isLoadingMore]);

  // First load: joins the in-flight hover prefetch instead of starting a second request
  useEffect(() => {
    if (!vendorId) return;
    const key = vendorLedgerKey(vendorId);
    if (cachedAtMount && isFresh(key)) return; // already painted from a fresh copy
    // Reuses a just-finished early/hover fetch, joins one in flight, or fetches
    cachedLoad(key, () => fetchVendorLedger(vendorId), FRESH_MS)
      .then(applyLedger)
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load purchase ledger.");
      })
      .finally(() => {
        setIsLoading(false);
        setIsRevalidating(false);
      });
  }, [vendorId, applyLedger, cachedAtMount]);

  // unpaidBills: same filter as before (credit > 0, balanceDue > 0, approved), applied on the server to the full history

  if (isLoading) {
    return (
      <DashboardLayout>
        <LedgerPageSkeleton />
      </DashboardLayout>
    );
  }

  const handleDownloadPDF = async () => {
    const toastId = toast.loading("Generating PDF Ledger...");
    setShowExportMenu(false);
    try {
      const response = await purchaseLedgerService.downloadVendorLedgerPDF(vendorId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${vendorProfile?.companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Vendor'}_Ledger.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to download PDF.", { id: toastId });
    }
  };

  const handleDownloadExcel = async () => {
    const toastId = toast.loading("Generating Excel Ledger...");
    setShowExportMenu(false);
    try {
      const response = await purchaseLedgerService.downloadVendorLedgerExcel(vendorId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${vendorProfile?.companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Vendor'}_Ledger.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel downloaded successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to download Excel.", { id: toastId });
    }
  };

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
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                <Download size={16} /> Export
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>

                  <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-20 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-b border-slate-100"
                    >
                      <FileText size={16} /> Download PDF
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <FileSpreadsheet size={16} /> Download Excel
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => router.push(`/dashboard/vendors/${vendorId}/bulk-upload`)}
              className="flex justify-center items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              <UploadCloud size={16} /> Bulk Upload
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex justify-center items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-200 hover:bg-purple-50 rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              <Edit size={16} /> Edit Vendor
            </button>
          </div>
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

      <RevalidatingBadge show={isRevalidating} />

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

        {/* CRM circuits this vendor has billed (loads on open); above the table so long ledgers don't bury it */}
        <VendorCircuitBilling vendorId={vendorId} vendorName={vendorProfile?.companyName} />

        {/* Full Width Transaction History */}
        <PurchaseLedgerTable
          ledgerData={ledgerData}
          columnTotals={columnTotals}
          hasMore={!!nextCursor}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
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