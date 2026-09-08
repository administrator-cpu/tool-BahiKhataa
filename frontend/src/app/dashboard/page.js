"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Users, Loader2, LogOut, ChartLine, Building2, Briefcase, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// Hooks & Context
import { useAuth } from "../common/context/AuthContext";
import { useCustomers } from "../modules/customers/hooks/useCustomers";
import { vendorService } from "../modules/Vendor/vendor.service";
import { purchaseLedgerService } from "../modules/purchaseLedger/purchaseLedger.service"

// Components
import Button from "../common/components/Button";
import DashboardLayout from "../common/layout/DashboardLayout";
import CustomerTable from "../modules/customers/components/CustomerTable";
import VendorTable from "../modules/Vendor/comnponents/VendorTable";
import NotificationMenu from "../common/components/NotificationDrawer";

export default function UnifiedDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const [activeTab, setActiveTab] = useState("customers");

  const [vendors, setVendors] = useState([]);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);

  const { userRole, isAuthChecking, logout } = useAuth();
  const { customers, isLoading: isCustomersLoading, refresh: refreshCustomers } = useCustomers();

  useEffect(() => {
    if (userRole === "admin" && activeTab === "vendors" && vendors.length === 0) {
      const fetchVendors = async () => {
        setIsVendorsLoading(true);
        try {
          const res = await vendorService.getVendorsDashboard();
          setVendors(res.data.vendors);
        } catch (error) {
          console.error("Failed to load vendors", error);
        } finally {
          setIsVendorsLoading(false);
        }
      };
      fetchVendors();
    }
  }, [activeTab, userRole, vendors.length]);

  // 3. Handle Search based on active tab
  const visibleCustomers = (customers || []).filter((c) => {
    const companyStr = String(c.company || c.companyName || "").toLowerCase();
    const managerStr = String(c.managerName || c.manager || "").toLowerCase();
    const searchStr = searchQuery.toLowerCase();

    return companyStr.includes(searchStr) || managerStr.includes(searchStr);
  });

  const visibleVendors = vendors.filter(
    (v) => (v.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAuthChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-slate-900">
        <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
        <p className="text-lg font-medium">Authenticating Workspace...</p>
      </div>
    );
  }

  const handleDownloadTDS = async () => {
    const toastId = toast.loading("Generating TDS Report...");
    try {
      const response = await purchaseLedgerService.exportTdsReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Vendor_TDS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download TDS Report.", { id: toastId });
    }
  };

  return (
    <DashboardLayout
      hideBack={true}
      breadcrumbs={
        <span className="font-bold text-slate-900 text-lg">
          BahiKhata Dashboard
        </span>
      }
    >

      {userRole === "admin" && (
        <div className="flex justify-center mb-6">
          <div className="bg-slate-200/50 p-1 rounded-xl inline-flex shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab("customers")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "customers"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <Briefcase size={16} /> Receivables (Sales)
            </button>
            <button
              onClick={() => setActiveTab("vendors")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "vendors"
                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <Building2 size={16} /> Payables (Purchases)
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={activeTab === 'customers' ? "Search customers or managers..." : "Search vendors..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium shadow-sm text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <>
              {activeTab === "customers" ? (
                <Button variant="primary" icon={Plus} onClick={() => router.push(`/dashboard/customers/create`)}>
                  Onboard Customer
                </Button>
              ) : (
                <>
                  <Button variant="secondary" icon={FileSpreadsheet} className="!text-emerald-700 !bg-emerald-50 hover:!bg-emerald-100 !border-emerald-200" onClick={handleDownloadTDS}>
                    TDS Report
                  </Button>
                  <Button variant="primary" icon={Plus} className="!bg-purple-600 hover:!bg-purple-700" onClick={() => router.push(`/dashboard/vendors/create`)}>
                    Add Vendor
                  </Button>
                </>
              )}

              <Button variant="secondary" icon={Users} onClick={() => router.push(`/dashboard/agents/create`)}>
                Add User
              </Button>
              <Button variant="secondary" icon={ChartLine} onClick={() => router.push(`/dashboard/audit`)}>
                Audit Log
              </Button>
            </>
          )}
          <Button variant="danger" icon={LogOut} onClick={() => logout()} />
          {userRole === "admin" && <NotificationMenu />}
        </div>
      </div>

      {activeTab === "customers" ? (
        isCustomersLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500 font-medium text-sm">Syncing Receivables...</p>
          </div>
        ) : (
          <CustomerTable
            customers={visibleCustomers}
            currentUserRole={userRole}
            onRefresh={refreshCustomers}
          />
        )
      ) : (
        isVendorsLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Loader2 size={32} className="animate-spin text-purple-600 mb-4" />
            <p className="text-slate-500 font-medium text-sm">Syncing Payables...</p>
          </div>
        ) : (
          <VendorTable vendors={visibleVendors} />
        )
      )}
    </DashboardLayout>
  );
}