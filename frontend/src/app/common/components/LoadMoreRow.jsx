"use client";

import { Loader2 } from "lucide-react";
import { useInfiniteScroll } from "@/app/common/lib/useInfiniteScroll";

// Table row at the end of a paged ledger: loads the next page when it scrolls into view,
// with a button as a fallback.
export default function LoadMoreRow({ colSpan, hasMore, isLoadingMore, onLoadMore }) {
  const sentinelRef = useInfiniteScroll(onLoadMore, hasMore && !isLoadingMore);
  if (!hasMore) return null;
  return (
    <tr ref={sentinelRef}>
      <td colSpan={colSpan} className="px-6 py-5 text-center">
        {isLoadingMore ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading older entries…
          </span>
        ) : (
          <button type="button" onClick={onLoadMore} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Load older entries
          </button>
        )}
      </td>
    </tr>
  );
}
