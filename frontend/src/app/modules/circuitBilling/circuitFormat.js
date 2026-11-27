import * as XLSX from "xlsx";

export const formatRate = (value) =>
  value === null || value === undefined
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatBandwidth = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return /^\d+(\.\d+)?$/.test(String(value).trim()) ? `${value} Mbps` : String(value);
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const matchesSearch = (row, query, keys) => {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  return keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
};

export const STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Notice Period": "bg-amber-50 text-amber-700 border-amber-200",
  Disconnected: "bg-slate-100 text-slate-600 border-slate-200",
  Deleted: "bg-red-50 text-red-700 border-red-200",
};

// Circuit columns shared by the vendor section and the unbilled page (Excel export)
export const circuitExportRow = (r) => ({
  "Customer Name": r.customerName || "",
  "Service Type": r.serviceType || "",
  Bandwidth: formatBandwidth(r.bandwidth),
  "FAB Circuit ID": r.fabCircuitId || "",
  "FAB Rate per Mb (excl. GST)": r.fabRatePerMb ?? "",
  "Telco Rate per Mb (excl. GST)": r.telcoRatePerMb ?? "",
  "Logical Circuit ID (Telco)": r.telcoCircuitId || "",
  Telco: r.telcoProvider || "",
  "CRM Status": r.status || "",
});

export const downloadSheet = (rows, sheetName, fileName) => {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No rows" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
};
