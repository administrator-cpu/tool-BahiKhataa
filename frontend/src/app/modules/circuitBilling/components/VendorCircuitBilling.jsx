"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Network, ChevronDown, ChevronUp, Loader2, RefreshCw, Search, FileSpreadsheet, AlertTriangle, History } from "lucide-react";
import toast from "react-hot-toast";

import { safeFormatCurrency } from "@/app/common/lib/utils";
import { circuitBillingService } from "../circuitBilling.service";
import {
  formatRate, formatBandwidth, formatDate, matchesSearch, STATUS_STYLES, circuitExportRow, downloadSheet,
} from "../circuitFormat";

const TABS = [
  { key: "billed", label: "Billed circuits" },
  { key: "notInCrm", label: "Bills not in CRM" },
  { key: "ambiguous", label: "Ambiguous" },
];

const SEARCH_KEYS = {
  billed: ["customerName", "fabCircuitId", "telcoCircuitId", "serviceType", "lastInvoiceNo"],
  notInCrm: ["circuitId", "invoiceNo"],
  ambiguous: ["circuitId", "invoiceNo"],
};

const Th = ({ children, right }) => (
  <th className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${right ? "text-right" : "text-left"}`}>{children}</th>
);
const Td = ({ children, right, mono, className = "" }) => (
  <td className={`px-4 py-3 text-sm ${right ? "text-right" : ""} ${mono ? "font-mono text-[12.5px]" : ""} ${className}`}>{children}</td>
);

export default function VendorCircuitBilling({ vendorId, vendorName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("billed");
  const [query, setQuery] = useState("");

  const load = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await circuitBillingService.getVendorCircuitBilling(vendorId, { refresh });
      setReport(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load circuit billing.");
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  // Only call the CRM when the section is opened
  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !report && !isLoading) load();
  };

  const rows = useMemo(() => {
    if (!report) return [];
    const source = tab === "billed" ? report.billedCircuits : tab === "notInCrm" ? report.notInCrm : report.ambiguous;
    return (source || []).filter((r) => matchesSearch(r, query, SEARCH_KEYS[tab]));
  }, [report, tab, query]);

  const handleExport = () => {
    if (!report) return;
    const safeName = (vendorName || "Vendor").replace(/[^a-zA-Z0-9]/g, "_");
    if (tab === "billed") {
      downloadSheet(rows.map((r) => ({
        ...circuitExportRow(r),
        "Bills": r.billCount,
        "Total Billed": r.totalBilled,
        "Last Bill Date": formatDate(r.lastBillDate),
        "Last Invoice No": r.lastInvoiceNo || "",
        "Matched On Old Circuit ID": r.matchedViaPreviousId ? "Yes" : "No",
      })), "Billed circuits", `${safeName}_Billed_Circuits.xlsx`);
    } else {
      downloadSheet(rows.map((r) => ({
        "Bill Date": formatDate(r.date),
        "Invoice No": r.invoiceNo || "",
        "Circuit ID on Bill": r.circuitId,
        Amount: r.amount,
        Status: r.status,
        ...(tab === "ambiguous" && { "Possible Connections": r.candidates.map((c) => `${c.fabCircuitId} (${c.telcoProvider || "?"})`).join(", ") }),
      })), tab === "notInCrm" ? "Bills not in CRM" : "Ambiguous", `${safeName}_${tab === "notInCrm" ? "Bills_Not_In_CRM" : "Ambiguous_Bills"}.xlsx`);
    }
    toast.success("Excel downloaded");
  };

  const s = report?.summary;
  const counts = { billed: s?.billedCircuits ?? 0, notInCrm: s?.billsNotInCrm ?? 0, ambiguous: s?.ambiguousBills ?? 0 };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between gap-3 p-5 hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center"><Network size={20} /></div>
          <div>
            <h3 className="text-base font-black text-slate-900">Circuit Billing</h3>
            <p className="text-xs font-medium text-slate-500">CRM connections this vendor has billed, matched by Logical Circuit ID</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          {isLoading && !report && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm font-medium">
              <Loader2 size={18} className="animate-spin text-purple-600" /> Loading connections from the CRM…
            </div>
          )}

          {error && (
            <div className="m-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</span>
              <button onClick={() => load(true)} className="font-bold underline">Retry</button>
            </div>
          )}

          {report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
                {[
                  { label: "Billed circuits", value: s.billedCircuits, tone: "text-emerald-700" },
                  { label: "Bills not in CRM", value: s.billsNotInCrm, tone: s.billsNotInCrm ? "text-red-600" : "text-slate-900" },
                  { label: "Ambiguous bills", value: s.ambiguousBills, tone: s.ambiguousBills ? "text-amber-600" : "text-slate-900" },
                  { label: "Bills without circuit ID", value: s.billsWithoutCircuitId, tone: s.billsWithoutCircuitId ? "text-amber-600" : "text-slate-900" },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                    <p className={`text-2xl font-black ${c.tone}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 pb-4">
                <div className="flex flex-wrap gap-2">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === t.key ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {t.label} <span className="opacity-75">({counts[t.key]})</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search customer or circuit ID"
                      className="pl-8 pr-3 py-2 w-56 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button onClick={() => load(true)} disabled={isLoading} title="Reload from CRM" className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-slate-100">
                {tab === "billed" ? (
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <Th>Customer</Th><Th>Service</Th><Th>Bandwidth</Th><Th>FAB Circuit ID</Th>
                        <Th right>FAB Rate/Mb</Th><Th right>Telco Rate/Mb</Th><Th>Logical Circuit ID</Th>
                        <Th>CRM Status</Th><Th right>Bills</Th><Th>Last Bill</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <tr key={r.crmConnectionId} className="hover:bg-slate-50/60">
                          <Td className="font-bold text-slate-900">{r.customerName || "—"}</Td>
                          <Td>{r.serviceType || "—"}</Td>
                          <Td>
                            {formatBandwidth(r.bandwidth)}
                            {r.changePending && <span className="ml-1.5 text-[10px] font-bold text-amber-600" title="An upgrade/downgrade/shift is pending in the CRM; live values shown">CHANGE PENDING</span>}
                          </Td>
                          <Td mono>{r.fabCircuitId || "—"}</Td>
                          <Td right>{formatRate(r.fabRatePerMb)}</Td>
                          <Td right>{formatRate(r.telcoRatePerMb)}</Td>
                          <Td mono>
                            {r.telcoCircuitId || "—"}
                            {r.matchedViaPreviousId && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600" title={`Bills use an old circuit ID: ${r.previousTelcoCircuitIds.join(", ")}`}>
                                <History size={11} /> OLD ID ON BILL
                              </span>
                            )}
                          </Td>
                          <Td>
                            <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${STATUS_STYLES[r.status] || "bg-blue-50 text-blue-700 border-blue-200"}`}>{r.status || "—"}</span>
                          </Td>
                          <Td right>{r.billCount}</Td>
                          <Td>{formatDate(r.lastBillDate)}<span className="block text-[11px] text-slate-400">{r.lastInvoiceNo}</span></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <Th>Bill Date</Th><Th>Invoice No</Th><Th>Circuit ID on Bill</Th><Th right>Amount</Th><Th>Status</Th>
                        {tab === "ambiguous" && <Th>Possible Connections</Th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => (
                        <tr key={`${r.billId}-${r.circuitId}-${i}`} className="hover:bg-slate-50/60">
                          <Td>{formatDate(r.date)}</Td>
                          <Td className="font-bold text-slate-900">{r.invoiceNo || "—"}</Td>
                          <Td mono>{r.circuitId}</Td>
                          <Td right>{safeFormatCurrency(r.amount)}</Td>
                          <Td className="capitalize">{r.status}</Td>
                          {tab === "ambiguous" && (
                            <Td>{r.candidates.map((c) => `${c.fabCircuitId} (${c.telcoProvider || "?"})`).join(", ")}</Td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rows.length === 0 && (
                  <p className="py-10 text-center text-sm font-medium text-slate-400">
                    {query ? "No rows match your search." : tab === "billed" ? "No bills from this vendor match a CRM circuit yet." : "Nothing here."}
                  </p>
                )}
              </div>

              <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
                Rates are per Mb per month, excluding GST. “—” means the CRM has no live rate (e.g. a change is pending).
                CRM data as of {report.crmFetchedAt ? new Date(report.crmFetchedAt).toLocaleTimeString("en-IN") : "—"}.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
