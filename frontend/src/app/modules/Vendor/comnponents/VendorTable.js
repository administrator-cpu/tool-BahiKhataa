"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { safeFormatCurrency } from "@/app/common/lib/utils";

const COLS = "grid-cols-[2.8fr_1.05fr_1fr_0.85fr_0.85fr_1fr_0.5fr]";
const HEAD = "font-mono text-[10px] tracking-[0.11em] text-[#8A8780]";
const WEAVE =
  "repeating-linear-gradient(135deg,rgba(16,16,20,0.022) 0 1px,transparent 1px 8px)";

function Bucket({ value, tone, weight = "font-semibold" }) {
  const n = Number(value) || 0;
  return (
    <span
      className={
        "text-right text-[12.5px] " + (n ? `${weight} ${tone}` : "font-medium text-[#8A8780]")
      }
    >
      {safeFormatCurrency(value)}
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className={`grid ${COLS} items-center gap-2.5 border-b border-[#F3EFE6] px-[22px] py-[15px]`}>
      <i className="h-3 w-[62%] animate-pulse rounded-md bg-[#EFEBE2]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className="h-3 w-full animate-pulse justify-self-end rounded-md bg-[#EFEBE2]" />
      ))}
      <i className="h-8 w-8 justify-self-end rounded-[10px] bg-[#F4F0E7]" />
    </div>
  );
}

export default function VendorTable({ vendors = [], isLoading = false }) {
  const router = useRouter();
  const [openingId, setOpeningId] = useState(null);
  const safeVendors = Array.isArray(vendors) ? vendors : [];

  const totals = safeVendors.reduce(
    (acc, curr) => ({
      outstanding: acc.outstanding + (curr?.aging?.total || 0),
      current: acc.current + (curr?.aging?.current || 0),
      d30: acc.d30 + (curr?.aging?.thirtyPlus || 0),
      d60: acc.d60 + (curr?.aging?.sixtyPlus || 0),
      d90: acc.d90 + (curr?.aging?.ninetyPlus || 0),
    }),
    { outstanding: 0, current: 0, d30: 0, d60: 0, d90: 0 }
  );

  return (
    <div className="min-w-0 flex-[3_1_640px] overflow-hidden rounded-3xl border border-[#E7E1D6] bg-[#FFFDF9] shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
      <div className="overflow-x-auto customScroller">
        <div className="min-w-[940px]">
          <div className={`grid ${COLS} gap-2.5 border-y border-[#EDE7DB] bg-[#F4F0E7] px-[22px] py-[11px]`}>
            <span className={HEAD}>VENDOR / SUPPLIER</span>
            <span className="font-mono text-[10px] tracking-[0.11em] text-[#101014] text-right">TOTAL PAYABLE</span>
            <span className={`${HEAD} text-right`}>CURRENT</span>
            <span className={`${HEAD} text-right`}>30+</span>
            <span className={`${HEAD} text-right`}>60+</span>
            <span className="font-mono text-[10px] tracking-[0.11em] text-[#8E1B14] text-right">90+</span>
            <span />
          </div>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
          ) : safeVendors.length ? (
            safeVendors.map((vendor, index) => {
              const name = String(vendor?.name || "Unknown");
              return (
                <motion.div
                  key={vendor?.id ?? index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className={`grid ${COLS} items-center gap-2.5 border-b border-[#F3EFE6] px-[22px] py-[13px] transition-colors hover:bg-[#FFF9EC]`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span title={name} className="min-w-0 truncate text-[13.5px] font-semibold text-[#101014]">
                      {name}
                    </span>
                    {vendor.availableAdvance > 0 && (
                      <span
                        title="Advance paid"
                        className="shrink-0 rounded-md bg-[#F1F8F3] px-[7px] py-[3px] text-[10.5px] font-semibold text-[#1F6B43]"
                      >
                        {safeFormatCurrency(vendor.availableAdvance)} adv
                      </span>
                    )}
                  </div>

                  <span className="text-right text-[14px] font-bold tracking-[-0.01em] text-[#101014]">
                    {safeFormatCurrency(vendor?.aging?.total)}
                  </span>
                  <span className="text-right text-[12.5px] font-medium text-[#55524C]">
                    {safeFormatCurrency(vendor?.aging?.current)}
                  </span>
                  <Bucket value={vendor?.aging?.thirtyPlus} tone="text-[#8A5B00]" />
                  <Bucket value={vendor?.aging?.sixtyPlus} tone="text-[#B4301C]" />
                  <Bucket value={vendor?.aging?.ninetyPlus} tone="text-[#8E1B14]" weight="font-bold" />

                  <span className="text-right">
                    <button
                      type="button"
                      title="Open purchase ledger"
                      disabled={openingId === vendor?.id}
                      onClick={() => {
                        setOpeningId(vendor?.id);
                        router.push(`/dashboard/purchase-ledger/${vendor?.id}`);
                      }}
                      className="inline-grid h-8 w-8 place-items-center rounded-[10px] border border-[#EDE7DB] bg-white transition hover:bg-[#F7F3EA] hover:shadow-[0_1px_3px_rgba(16,16,20,0.10)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4301C] disabled:cursor-progress"
                    >
                      {openingId === vendor?.id ? (
                        <Loader2 size={14} className="animate-spin text-[#55524C]" />
                      ) : (
                        <ArrowRight size={15} className="text-[#55524C] opacity-70" />
                      )}
                    </button>
                  </span>
                </motion.div>
              );
            })
          ) : (
            <div className="px-[22px] py-14 text-center">
              <div className="text-[15px] font-bold text-[#101014]">No vendors found</div>
              <div className="mt-1.5 text-[13px] font-medium text-[#6B6862]">
                Clear the search, or add your first supplier.
              </div>
            </div>
          )}

          <div
            className={`grid ${COLS} items-center gap-2.5 border-t border-[#E3DCCC] bg-[#EFE9DC] px-[22px] py-[19px]`}
            style={{ backgroundImage: WEAVE }}
          >
            <span className="font-mono text-[10px] tracking-[0.11em] text-[#6B6862]">ALL VENDORS</span>
            <span className="text-right text-[15px] font-bold text-[#101014]">
              {isLoading ? "—" : safeFormatCurrency(totals.outstanding)}
            </span>
            <span className="text-right text-[13px] font-semibold text-[#55524C]">
              {isLoading ? "—" : safeFormatCurrency(totals.current)}
            </span>
            <span className="text-right text-[13px] font-semibold text-[#8A5B00]">
              {isLoading ? "—" : safeFormatCurrency(totals.d30)}
            </span>
            <span className="text-right text-[13px] font-semibold text-[#B4301C]">
              {isLoading ? "—" : safeFormatCurrency(totals.d60)}
            </span>
            <span className="text-right text-[13px] font-bold text-[#8E1B14]">
              {isLoading ? "—" : safeFormatCurrency(totals.d90)}
            </span>
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
