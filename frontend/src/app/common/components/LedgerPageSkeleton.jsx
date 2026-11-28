// Placeholder in the same shape as the ledger pages (header, figures, form, table),
// so content fills in place instead of jumping from a small spinner to a full page.
const Bar = ({ className = "" }) => <div className={`rounded-lg bg-slate-200/70 ${className}`} />;

export function LedgerRowsSkeleton({ rows = 3 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <div key={i} className="flex items-center gap-6 border-b border-slate-100 px-6 py-4 last:border-0">
      <Bar className="h-3 w-20" />
      <div className="flex-1 space-y-2">
        <Bar className="h-3 w-1/2" />
        <Bar className="h-2.5 w-1/3" />
      </div>
      <Bar className="h-3 w-24" />
      <Bar className="h-3 w-24" />
      <Bar className="h-7 w-20" />
    </div>
  ));
}

export default function LedgerPageSkeleton() {
  return (
    <div role="status" aria-label="Loading ledger" className="flex animate-pulse flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Bar className="h-6 w-64" />
            <Bar className="h-3 w-80" />
            <Bar className="h-3 w-48" />
          </div>
          <div className="flex gap-3">
            <Bar className="h-10 w-28" />
            <Bar className="h-10 w-28" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-2xl border border-slate-100 p-4">
              <Bar className="h-2.5 w-16" />
              <Bar className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Bar className="mb-5 h-4 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Bar key={i} className="h-10" />)}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-11 border-b border-slate-200 bg-slate-50" />
        <LedgerRowsSkeleton rows={8} />
      </div>
    </div>
  );
}
