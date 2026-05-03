"use client";

import React, { useState } from "react";
import { Search, Plus, Users, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// Hooks & Context
import { useAuth } from "../common/context/AuthContext";
import { useCustomers } from "../modules/customers/hooks/useCustomers";

// Components
import Button from "../common/components/Button";
import DashboardLayout from "../common/layout/DashboardLayout";
import CustomerTable from "../modules/customers/components/CustomerTable";

export default function UnifiedDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Grab state from our new custom layers!
  const { userRole, isAuthChecking, logout } = useAuth();
  const { customers, isLoading } = useCustomers();

  // 2. Handle Search
  const visibleCustomers = customers.filter(
    (c) =>
      (c.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.manager || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 3. Render Loading State
  if (isAuthChecking) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          color: "#0f172a",
        }}
      >
        <Loader2
          size={40}
          className="animate-spin mb-4"
          style={{ color: "#2563eb" }}
        />
        <p style={{ fontSize: "18px", fontWeight: "500" }}>
          Authenticating Workspace...
        </p>
      </div>
    );
  }

  // 4. Render Main UI
  return (
    <DashboardLayout
      hideBack={true}
      breadcrumbs={
        <span className="font-bold text-slate-900 text-lg">
          BahiKhata Dashboard
        </span>
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search customers or managers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium shadow-sm text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <>
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => router.push(`/dashboard/customers/create`)}
              >
                Onboard Customer
              </Button>

              <Button
                variant="secondary"
                icon={Users}
                onClick={() => router.push(`/dashboard/agents/create`)}
              >
                Add User
              </Button>
            </>
          )}
          <Button
            variant="danger"
            icon={LogOut}
            onClick={() => logout()}
          ></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 font-medium text-sm">
            Syncing portfolio data...
          </p>
        </div>
      ) : (
        <CustomerTable
          customers={visibleCustomers}
          currentUserRole={userRole}
        />
      )}
    </DashboardLayout>
  );
}
