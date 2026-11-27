"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Network, Loader2, RefreshCw, Search, FileSpreadsheet, AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import DashboardLayout from "@/app/common/layout/DashboardLayout";
import Button from "@/app/common/components/Button";
import { useAuth } from "@/app/common/context/AuthContext";
import { circuitBillingService } from "@/app/modules/circuitBilling/circuitBilling.service";
import {
  formatRate, formatBandwidth, formatDate, matchesSearch, STATUS_STYLES, circuitExportRow, downloadSheet,
} from "@/app/modules/circuitBilling/circuitFormat";

const SEARCH_KEYS = ["customerName", "fabCircuitId", "telcoCircuitId", "serviceType", "telcoProvider"];

export default function UnbilledCircuitsPage() {
  const router = useRouter();
  const { userRole, isAuthChecking } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [telcoFilter, setTelcoFilter] = useState("all");
  const [hideNoCircuitId, setHideNoCircuitId] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await circuitBillingService.getUnbilledCircuits({ refresh });
      setReport(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load unbilled circuits.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthChecking) return;
    if (userRole !== "admin") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [isAuthChecking, userRole, router, load]);

  const circuits = useMemo(() => report?.circuits || [], [report]);
  const statuses = useMemo(() => [...new Set(circuits.map((c) => c.status || "Unknown"))].sort(), [circuits]);
  const telcos = useMemo(() => [...new Set(circuits.map((c) => c.telcoProvider || "Unknown"))].sort(), [circuits]);

  const rows = useMemo(() => circuits.filter((c) =>
    (statusFilter === "all" || (c.status || "Unknown") === statusFilter) &&
    (telcoFilter === "all" || (c.telcoProvider || "Unknown") === telcoFilter) &&
    (!hideNoCircuitId || !c.noCircuitId) &&
    matchesSearch(c, query, SEARCH_KEYS)
  ), [circuits, statusFilter, telcoFilter, hideNoCircuitId, query]);

  const handleExport = () => {
    downloadSheet(rows.map((r) => ({
      ...circuitExportRow(r),
      "First Activated": formatDate(r.firstActivatedAt),
      "Terminated On": formatDate(r.terminatedOn),
      "No Circuit ID in CRM": r.noCircuitId ? "Yes" : "No",
    })), "Unbilled circuits", "Unbilled_Circuits.xlsx");
    toast.success("Excel downloaded");
  };

  if (isAuthChecking || userRole !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]"><Loader2 size={32} className="animate-spin text-purple-600" /></div>
      </DashboardLayout>
    );
  }

  const s = report?.summary;
  const selectClass = "px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200";

  return (
    <DashboardLayout
      breadcrumbs={
        <div className="flex items-center gap-2 text-lg">
          <Network size={20} className="text-purple-600" />
          <span className="font-bold text-slate-900">Unbilled Circuits</span>
          <span className="text-slate-400 font-normal ml-2">| CRM connections no vendor has billed</span>
        </div>
      }
    >
      <div className="mb-4">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/dashboard")}>Back</Button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</span>
          <button onClick={() => load(true)} className="font-bold underline">Retry</button>
        </div>
      )}

      {isLoading && !report && (
        <div className="flex items-center justify-center gap-2 h-[40vh] text-slate-500 text-sm font-medium">
          <Loader2 size={20} className="animate-spin text-purple-600" /> Loading connections from the CRM…
        </div>
      )}

      {report && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
            {[
              { label: "Activated connections", value: s.totalConnections, tone: "text-slate-900" },
              { label: "Billed by a vendor", value: s.billed, tone: "text-emerald-700" },
              { label: "Not billed", value: s.unbilled, tone: s.unbilled ? "text-red-600" : "text-slate-900" },
              { label: "Not billed: no circuit ID in CRM", value: s.unbilledWithoutCircuitId, tone: s.unbilledWithoutCircuitId ? "text-amber-600" : "text-slate-900" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
                <p className={`text-2xl font-black ${c.tone}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="all">All statuses</option>
                {statuses.map((st) => <option key={st} value={st}>{st} ({s.unbilledByStatus[st] ?? 0})</option>)}
              </select>
              <select value={telcoFilter} onChange={(e) => setTelcoFilter(e.target.value)} className={selectClass}>
                <option value="all">All telcos</option>
                {telcos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 px-2">
                <input type="checkbox" checked={hideNoCircuitId} onChange={(e) => setHideNoCircuitId(e.target.checked)} />
                Hide connections without circuit ID
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer or circuit ID"
                  className="pl-8 pr-3 py-2 w-60 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100">
                <FileSpreadsheet size={14} /> Excel ({rows.length})
              </button>
              <button onClick={() => load(true)} disabled={isLoading} title="Reload from CRM" className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full min-w-[1150px]">
              <thead className="bg-slate-50/80">
                <tr>
                  {["Customer", "Service", "Bandwidth", "FAB Circuit ID", "FAB Rate/Mb", "Telco Rate/Mb", "Logical Circuit ID", "Telco", "CRM Status", "Activated"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${i === 4 || i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.crmConnectionId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{r.customerName || "—"}</td>
                    <td className="px-4 py-3 text-sm">{r.serviceType || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {formatBandwidth(r.bandwidth)}
                      {r.changePending && <span className="ml-1.5 text-[10px] font-bold text-amber-600">CHANGE PENDING</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px]">{r.fabCircuitId || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatRate(r.fabRatePerMb)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatRate(r.telcoRatePerMb)}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px]">
                      {r.telcoCircuitId || <span className="font-sans text-[11px] font-bold text-amber-600">NO CIRCUIT ID IN CRM</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.telcoProvider || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${STATUS_STYLES[r.status] || "bg-blue-50 text-blue-700 border-blue-200"}`}>{r.status || "—"}</span>
                      {r.terminatedOn && <span className="block text-[11px] text-slate-400 mt-0.5">until {formatDate(r.terminatedOn)}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(r.firstActivatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-10 text-center text-sm font-medium text-slate-400">
                {circuits.length === 0 ? "Every activated CRM connection has a vendor bill." : "No circuits match these filters."}
              </p>
            )}
          </div>

          <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
            A circuit counts as billed when any vendor bill (not rejected) carries its Logical Circuit ID, current or old.
            Deleted and Cancelled CRM connections are not included.
            Rates are per Mb per month, excluding GST. CRM data as of {report.crmFetchedAt ? new Date(report.crmFetchedAt).toLocaleTimeString("en-IN") : "—"}.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
