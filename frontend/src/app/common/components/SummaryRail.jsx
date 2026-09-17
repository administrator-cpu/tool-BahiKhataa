"use client";

import React from "react";
import { Users, AlertCircle, ArrowRight } from "lucide-react";
import { safeFormatCurrency } from "@/app/common/lib/utils";

const WEAVE =
  "repeating-linear-gradient(135deg,rgba(16,16,20,0.022) 0 1px,transparent 1px 8px)";

function Skeleton({ className = "" }) {
  return (
    <div
      className={
        "animate-pulse rounded-md bg-[#EFEBE2] " + className
      }
    />
  );
}

/**
 * Left summary rail: total owed, ageing split, % in terms, 90+ risk.
 * `noun` = "customers" | "vendors". `onChase` filters the table to overdue rows.
 */
export default function SummaryRail({ ageing, noun, label, isLoading, onChase }) {
  return (
    <div className="flex min-w-[278px] flex-1 basis-[296px] flex-col gap-3.5">
      {/* Total owed + ageing bar */}
      <div
        className="rounded-3xl border border-[#EBDFC2] bg-[#FCEFCE] p-[26px] shadow-[0_1px_2px_rgba(16,16,20,0.05)]"
        style={{
          backgroundImage: `linear-gradient(165deg,rgba(255,253,247,0.95),rgba(252,239,206,0.2)),${WEAVE}`,
        }}
      >
        {isLoading ? (
          <>
            <Skeleton className="h-3 w-[46%]" />
            <Skeleton className="mt-4 h-10 w-[72%]" />
            <Skeleton className="mt-3.5 h-3 w-[38%]" />
            <Skeleton className="mt-6 h-3 w-full rounded-full" />
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] tracking-[0.1em] text-[#8A7A44]">
              {label}
            </span>
            <div className="my-3.5 text-[clamp(34px,3.2vw,44px)] font-bold leading-none tracking-[-0.04em] text-[#101014]">
              {safeFormatCurrency(ageing.total)}
            </div>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#7A6B3C]">
              <Users size={14} className="opacity-60" />
              {ageing.count} {noun}
            </div>
            <div className="mt-[22px] flex h-3 overflow-hidden rounded-full bg-[rgba(16,16,20,0.07)]">
              {ageing.buckets.map((b) => (
                <div
                  key={b.key}
                  style={{
                    width: `${b.pct}%`,
                    background: b.key === "current" ? "#4A4843" : b.color,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bucket breakdown */}
      <div className="rounded-3xl border border-[#E7E1D6] bg-[#FFFDF9] px-[22px] py-1.5 shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
        {(isLoading ? [0, 1, 2, 3] : ageing.buckets).map((b, i) => (
          <div
            key={isLoading ? i : b.key}
            className="flex items-center justify-between gap-3 border-b border-[#F3EFE6] py-4"
          >
            {isLoading ? (
              <>
                <Skeleton className="h-3 w-[74px]" />
                <Skeleton className="h-3 w-[92px]" />
              </>
            ) : (
              <>
                <span className="flex items-center gap-[11px] text-[13.5px] font-medium text-[#55524C]">
                  <i
                    className="h-[11px] w-[11px] rounded-full"
                    style={{ background: b.color }}
                  />
                  {b.label}
                </span>
                <span className="flex items-baseline gap-2.5">
                  <span className="text-[14px] font-bold tracking-[-0.01em] text-[#101014]">
                    {safeFormatCurrency(b.value)}
                  </span>
                  <span className="font-mono text-[11px] text-[#8A8780]">
                    {b.pct}%
                  </span>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
<div className="flex gap-3.5">
      {/* % in terms */}
      <div className="rounded-3xl border border-[#E7E1D6] bg-[#FFFDF9] flex-1 p-[22px] shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
        {isLoading ? (
          <>
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="mt-4 h-9 w-[56%]" />
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] tracking-[0.1em] text-[#8A8780]">
              IN TERMS
            </span>
            <div className="mt-3.5 text-[40px] font-bold leading-none tracking-[-0.04em] text-[#101014]">
              {ageing.pctCurrent}%
            </div>
          </>
        )}
      </div>

      {/* 90+ risk → filters the table */}
      {isLoading ? (
        <div className="rounded-3xl border border-[#F3D2C7] bg-[#FBE4DC] p-[22px]">
          <Skeleton className="h-3 w-[34%] bg-[rgba(142,27,20,0.12)]" />
          <Skeleton className="mt-4 h-8 w-[60%] bg-[rgba(142,27,20,0.12)]" />
          <Skeleton className="mt-3 h-3 w-[44%] bg-[rgba(142,27,20,0.12)]" />
        </div>
      ) : (
        <button
          type="button"
          onClick={onChase}
          style={{ backgroundImage: WEAVE }}
          className="flex items-center justify-between gap-3.5 rounded-3xl border border-[#F3D2C7] bg-[#FBE4DC] p-[22px] text-left transition-[box-shadow,transform] duration-150 hover:shadow-[0_4px_14px_rgba(142,27,20,0.16)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E1B14]"
        >
          <div>
            <span className="flex items-center gap-[7px] font-mono text-[11px] tracking-[0.1em] text-[#95341F]">
              <AlertCircle size={14} className="opacity-75" />
              90+ DAYS
            </span>
            <div className="mt-3 text-[32px] font-bold leading-none tracking-[-0.035em] text-[#8E1B14]">
              {safeFormatCurrency(ageing.d90)}
            </div>
            <div className="mt-[7px] text-[12.5px] font-semibold text-[#95341F]">
              {ageing.risk} {ageing.risk === 1 ? "account" : "accounts"} to chase today
            </div>
          </div>
          <ArrowRight size={20} className="opacity-60" />
        </button>
      )}
      </div>
    </div>
  );
}
