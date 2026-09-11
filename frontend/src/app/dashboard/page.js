"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, Users, Loader2, LogOut, ChartLine, Building2, Briefcase,
  FileSpreadsheet, Bell, Filter, Calendar, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { useAuth } from "../common/context/AuthContext";
import { useCustomers } from "../modules/customers/hooks/useCustomers";
import { vendorService } from "../modules/Vendor/vendor.service";
import { purchaseLedgerService } from "../modules/purchaseLedger/purchaseLedger.service";

import Button from "../common/components/Button";
import SummaryRail from "../common/components/SummaryRail";
import CustomerTable from "../modules/customers/components/CustomerTable";
import VendorTable from "../modules/Vendor/comnponents/VendorTable";
import NotificationMenu from "../common/components/NotificationDrawer";
import { buildAgeing, customerAgeing, vendorAgeing } from "../common/lib/ageing";

const TAB_KEY = "bahiKhata_dashboardTab";

export default function UnifiedDashboard() {
  const router = useRouter();
  const { userRole, isAuthChecking, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);
  const [isTdsLoading, setIsTdsLoading] = useState(false);
  const [tdsDone, setTdsDone] = useState(false);

  const { customers, isLoading: isCustomersLoading, refresh: refreshCustomers } = useCustomers();
  const isPay = activeTab === "vendors";

  useEffect(() => {
    const saved = sessionStorage.getItem(TAB_KEY);
    if (saved === "vendors" || saved === "customers") setActiveTab(saved);
  }, []);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setOverdueOnly(false);
    sessionStorage.setItem(TAB_KEY, tab);
  };

  useEffect(() => {
    if (userRole === "admin" && isPay && vendors.length === 0) {
      (async () => {
        setIsVendorsLoading(true);
        try {
          const res = await vendorService.getVendorsDashboard();
          setVendors(res.data.vendors);
        } catch (error) {
          console.error("Failed to load vendors", error);
        } finally {
          setIsVendorsLoading(false);
        }
      })();
    }
  }, [isPay, userRole, vendors.length]);

  const handleDownloadTDS = async () => {
    const toastId = toast.loading("Generating TDS report…");
    setIsTdsLoading(true);
    try {
      const response = await purchaseLedgerService.exportTdsReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Vendor_TDS_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report downloaded", { id: toastId });
      setTdsDone(true);
      setTimeout(() => setTdsDone(false), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download TDS report", { id: toastId });
    } finally {
      setIsTdsLoading(false);
    }
  };

  const isOverdue = (row) =>
    isPay
      ? (row?.aging?.thirtyPlus || 0) + (row?.aging?.sixtyPlus || 0) + (row?.aging?.ninetyPlus || 0) > 0
      : (row?.d30 || 0) + (row?.d60 || 0) + (row?.d90 || 0) > 0;

  const q = searchQuery.trim().toLowerCase();

  const visibleCustomers = useMemo(
    () =>
      (customers || []).filter((c) => {
        const company = String(c.company || c.companyName || "").toLowerCase();
        const manager = String(c.managerName || c.manager || "").toLowerCase();
        const match = !q || company.includes(q) || manager.includes(q);
        return match && (!overdueOnly || isOverdue(c));
      }),
    [customers, q, overdueOnly, isPay]
  );

  const visibleVendors = useMemo(
    () =>
      vendors.filter((v) => {
        const match = !q || (v.name || "").toLowerCase().includes(q);
        return match && (!overdueOnly || isOverdue(v));
      }),
    [vendors, q, overdueOnly, isPay]
  );

  const ageing = useMemo(
    () =>
      isPay
        ? buildAgeing(vendors, vendorAgeing)
        : buildAgeing(customers || [], customerAgeing),
    [isPay, vendors, customers]
  );

  const isTableLoading = isPay ? isVendorsLoading : isCustomersLoading;

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#EFEBE4] text-[#101014]">
        <Loader2 size={34} className="mb-4 animate-spin text-[#B4301C]" />
        <p className="text-[14px] font-semibold text-[#6B6862]">Authenticating workspace…</p>
      </div>
    );
  }

  const isAdmin = userRole === "admin";

  return (
    <div
      className="min-h-screen bg-[#EFEBE4] px-4 pb-11 pt-6 font-sans sm:px-6 lg:px-10"
      style={{
        backgroundImage: "radial-gradient(rgba(16,16,20,0.035) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[18px]">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#E7E1D6] bg-[#FFFDF9] px-4 py-3 shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
          {/* <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-gradient-to-r from-[#FF0091] to-[#FFAC00]" />
            <span className="text-[17px] font-bold tracking-[-0.02em] text-[#101014]">BahiKhata</span>
          </div> */}

          {isAdmin && (
            <div className="flex gap-1 rounded-full bg-[#F1EDE5] p-1">
              {[
                { key: "customers", label: "Receivables", Icon: Briefcase },
                { key: "vendors", label: "Payables", Icon: Building2 },
              ].map(({ key, label, Icon }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabSwitch(key)}
                    className={
                      "flex items-center gap-[7px] whitespace-nowrap rounded-full px-4 py-[9px] text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4301C] " +
                      (active
                        ? "bg-[#FFFDF9] font-bold text-[#101014] shadow-[0_1px_3px_rgba(16,16,20,0.10)]"
                        : "font-semibold text-[#6B6862]")
                    }
                  >
                    <Icon size={15} className="opacity-80" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-[7px]">
            {isAdmin && <NotificationMenu />}

            {isAdmin && isPay && (
              <Button
                variant="success"
                icon={FileSpreadsheet}
                isLoading={isTdsLoading}
                isSuccess={tdsDone}
                onClick={handleDownloadTDS}
                className="!px-[15px] !py-[10px] !text-[12.5px] !font-semibold"
              >
                {isTdsLoading ? "Generating" : tdsDone ? "Downloaded" : "TDS report"}
              </Button>
            )}

            {isAdmin && (
              <>
                <Button variant="secondary" icon={ChartLine} iconOnly title="Audit log" onClick={() => router.push("/dashboard/audit")} />
                <Button variant="secondary" icon={Users} iconOnly title="Add user" onClick={() => router.push("/dashboard/agents/create")} />
              </>
            )}
            <Button variant="danger" icon={LogOut} iconOnly title="Log out" onClick={() => logout()} />

            {isAdmin && (
              <>
                <span className="mx-[3px] h-[26px] w-px bg-[#E7E1D6]" />
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => router.push(isPay ? "/dashboard/vendors/create" : "/dashboard/customers/create")}
                >
                  {isPay ? "Add vendor" : "Onboard customer"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Purpose of the page */}
        {/* <div className="flex flex-wrap items-end justify-between gap-5 px-1.5 py-1">
          <div>
            <h1 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold tracking-[-0.035em] text-[#101014]">
              {isPay ? "Payables ageing" : "Receivables ageing"}
            </h1>
            <p className="mt-[7px] max-w-[62ch] text-[14px] font-medium text-[#6B6862]">
              {isPay
                ? "What you owe suppliers, oldest first. Approve bills, release payments, open a purchase ledger."
                : "Who owes you and for how long. Chase the 90+ column first, then open a ledger to record the payment."}
            </p>
          </div>
          <span className="flex items-center gap-2 font-mono text-[12px] text-[#8A8780]">
            <Calendar size={14} className="opacity-60" />
            AGEING AS OF {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </span>
        </div> */}

        <div className="flex flex-wrap items-start gap-[18px]">
          <SummaryRail
            ageing={ageing}
            noun={isPay ? "vendors" : "customers"}
            label={isPay ? "OWED TO VENDORS" : "OWED TO YOU"}
            isLoading={isTableLoading}
            onChase={() => {
              setOverdueOnly(true);
              setSearchQuery("");
            }}
          />

          <div className="flex min-w-0 flex-[3_1_640px] flex-col gap-[18px]">
            {/* Search + filter */}
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#E7E1D6] bg-[#FFFDF9] px-5 py-4 shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
              <label className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 rounded-xl border border-[#E7E1D6] bg-[#F4F0E7] px-3.5 py-2.5 transition-colors focus-within:border-[#B4301C]">
                <Search size={16} className="shrink-0 text-[#8A8780]" />
                <input
                  type="text"
                  value={searchQuery}
                  disabled={isTableLoading}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isPay ? "Search vendors" : "Search customers or managers"}
                  className="w-full border-0 bg-transparent text-[13.5px] font-medium text-[#101014] outline-none placeholder:text-[#A29E96]"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} title="Clear search">
                    <X size={14} className="text-[#8A8780]" />
                  </button>
                )}
              </label>

              <button
                type="button"
                disabled={isTableLoading}
                onClick={() => setOverdueOnly((v) => !v)}
                title="Show only accounts with dues past due date"
                className={
                  "flex items-center gap-[7px] whitespace-nowrap rounded-xl px-[15px] py-2.5 text-[12.5px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4301C] disabled:cursor-not-allowed disabled:border-[#E7E1D6] disabled:bg-[#F1EDE5] disabled:text-[#A5A19A] " +
                  (overdueOnly
                    ? "border border-[#24231F] bg-[#24231F] font-bold text-[#FFFDF7]"
                    : "border border-[#E7E1D6] bg-white font-semibold text-[#101014] hover:bg-[#F7F3EA]")
                }
              >
                <Filter size={15} className="opacity-70" />
                Overdue only
              </button>
            </div>

            {isPay ? (
              <VendorTable vendors={visibleVendors} isLoading={isVendorsLoading} />
            ) : (
              <CustomerTable
                customers={visibleCustomers}
                currentUserRole={userRole}
                onRefresh={refreshCustomers}
                isLoading={isCustomersLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
