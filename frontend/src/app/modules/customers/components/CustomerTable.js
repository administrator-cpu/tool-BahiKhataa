"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Link as LinkIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { safeFormatCurrency } from "@/app/common/lib/utils";
import { useCustomerTotals } from "../hooks/useCustomerTotals";
import CompareAndSyncModal from "./CompareAndSyncModal";

const COLS_ADMIN =
  "grid-cols-[2.5fr_1.05fr_1.05fr_1fr_0.85fr_0.85fr_1fr_0.5fr]";
const COLS_AGENT = "grid-cols-[2.5fr_1.05fr_1fr_0.85fr_0.85fr_1fr_0.5fr]";

const HEAD = "font-mono text-[10px] tracking-[0.11em] text-[#8A8780]";
const WEAVE =
  "repeating-linear-gradient(135deg,rgba(16,16,20,0.022) 0 1px,transparent 1px 8px)";

/** Muted when zero, toned when it carries money. */
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

function RowSkeleton({ cols }) {
  return (
    <div className={`grid ${cols} items-center gap-2.5 border-b border-[#F3EFE6] px-[22px] py-[15px]`}>
      <span className="flex items-center gap-2.5">
        <i className="h-[15px] w-[15px] rounded-full bg-[#EFEBE2]" />
        <i className="h-3 w-[62%] animate-pulse rounded-md bg-[#EFEBE2]" />
      </span>
      {Array.from({ length: cols === COLS_ADMIN ? 6 : 5 }).map((_, i) => (
        <i key={i} className="h-3 w-full animate-pulse justify-self-end rounded-md bg-[#EFEBE2]" />
      ))}
      <i className="h-8 w-8 justify-self-end rounded-[10px] bg-[#F4F0E7]" />
    </div>
  );
}

export default function CustomerTable({
  customers = [],
  currentUserRole,
  onRefresh,
  isLoading = false,
}) {
  const router = useRouter();
  const isAdmin = currentUserRole === "admin";
  const cols = isAdmin ? COLS_ADMIN : COLS_AGENT;

  const [syncModal, setSyncModal] = useState({ isOpen: false, customerId: null, customerName: "" });
  const [openingId, setOpeningId] = useState(null);

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totals = useCustomerTotals(safeCustomers);

  const openLedger = (id) => {
    setOpeningId(id);
    router.push(`/dashboard/ledger/${id}`);
  };

  return (
    <div className="min-w-0 flex-[3_1_70vh] overflow-hidden rounded-3xl border border-[#d9d9d9] bg-[#FFFDF9] shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
      {/* One scroller: vertical for rows, horizontal for columns. Header + footer pinned. */}
      <div className="customScroller max-h-[calc(100vh-230px)] min-h-[360px] overflow-auto overscroll-contain">
        <div className="min-w-[940px]">
          {/* Header — pinned */}
          <div className={`sticky top-0 z-20 grid ${cols} gap-2.5 border-y border-[#EDE7DB] bg-[#F4F0E7] px-[22px] py-[11px]`}>
            <span className={HEAD}>CUSTOMER</span>
            {isAdmin && <span className={HEAD}>MANAGER</span>}
            <span className="font-mono text-[10px] tracking-[0.11em] text-[#101014] text-right">TOTAL O/S</span>
            <span className={`${HEAD} text-right`}>CURRENT</span>
            <span className={`${HEAD} text-right`}>30+</span>
            <span className={`${HEAD} text-right`}>60+</span>
            <span className="font-mono text-[10px] tracking-[0.11em] text-[#8E1B14] text-right">90+</span>
            <span />
          </div>

          {/* Rows */}
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={cols} />)
          ) : safeCustomers.length ? (
            safeCustomers.map((customer, index) => {
              const name = String(customer?.company || customer?.companyName || "Unknown");
              const id = customer?.id ?? index;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className={`grid ${cols} items-center gap-2.5 border-b border-[#F3EFE6] px-[22px] py-[13px] transition-colors hover:bg-[#FFF9EC]`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isAdmin &&
                      (customer.isCrmLinked ? (
                        <CheckCircle2
                          size={15}
                          title="Linked to Connect CRM"
                          className="shrink-0 text-[#55524C] opacity-55"
                        />
                      ) : (
                        <button
                          type="button"
                          title="Link this customer to Connect CRM"
                          onClick={() =>
                            setSyncModal({ isOpen: true, customerId: customer.id, customerName: name })
                          }
                          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border border-[#F0DCB0] bg-[#FDF0CE] transition hover:brightness-[0.96] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4301C]"
                        >
                          <LinkIcon size={12} className="text-[#7A5A00]" />
                        </button>
                      ))}
                    <span title={name} className="min-w-0 truncate text-[13.5px] font-semibold text-[#101014]">
                      {name}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      title={customer?.manager || "Unassigned"}
                      onClick={() => router.push(`/dashboard/sales/${customer?.managerId}`)}
                      className="min-w-0 truncate text-left text-[12px] font-medium text-[#55524C] transition-colors hover:text-[#B4301C]"
                    >
                      {customer?.manager || "—"}
                    </button>
                  )}

                  <span className="text-right text-[14px] font-bold tracking-[-0.01em] text-[#101014]">
                    {safeFormatCurrency(customer?.outstanding)}
                  </span>
                  <span className="text-right text-[12.5px] font-medium text-[#55524C]">
                    {safeFormatCurrency(customer?.current)}
                  </span>
                  <Bucket value={customer?.d30} tone="text-[#8A5B00]" />
                  <Bucket value={customer?.d60} tone="text-[#B4301C]" />
                  <Bucket value={customer?.d90} tone="text-[#8E1B14]" weight="font-bold" />

                  <span className="text-right">
                    <button
                      type="button"
                      title="Open ledger"
                      onClick={() => openLedger(customer?.id)}
                      className="inline-grid h-8 w-8 place-items-center rounded-[10px] border border-[#EDE7DB] bg-white transition hover:bg-[#F7F3EA] hover:shadow-[0_1px_3px_rgba(16,16,20,0.10)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4301C] disabled:cursor-progress"
                      disabled={openingId === customer?.id}
                    >
                      {openingId === customer?.id ? (
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
              <div className="text-[15px] font-bold text-[#101014]">Nothing matches</div>
              <div className="mt-1.5 text-[13px] font-medium text-[#6B6862]">
                Clear the search or the overdue filter.
              </div>
            </div>
          )}

          {/* Totals footer — pinned to the bottom of the scroller */}
          <div
            className={`sticky bottom-0 z-20 grid ${cols} items-center gap-2.5 border-t bottom-0 border-[#E3DCCC] bg-[#EFE9DC] px-[22px] py-[19px] shadow-[0_-1px_2px_rgba(16,16,20,0.05)]`}
            style={{ backgroundImage: WEAVE }}
          >
            <span className={`font-mono text-[10px] tracking-[0.11em] text-[#6B6862] ${isAdmin ? "col-span-2" : ""}`}>
              {isAdmin ? "ALL CUSTOMERS" : "MY PORTFOLIO"}
              {!isLoading && safeCustomers.length ? ` · ${safeCustomers.length}` : ""}
            </span>
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

      <CompareAndSyncModal
        isOpen={syncModal.isOpen}
        onClose={() => setSyncModal({ isOpen: false, customerId: null, customerName: "" })}
        customerId={syncModal.customerId}
        customerName={syncModal.customerName}
        onSuccess={() => onRefresh && onRefresh()}
      />
    </div>
  );
}