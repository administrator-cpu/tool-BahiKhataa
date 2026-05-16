"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Receipt,
  MapPin,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Architecture & Components
import DashboardLayout from "@/app/common/layout/DashboardLayout";
import PageHeader from "@/app/common/components/PageHeader";
import InputField from "@/app/common/components/InputField";
import Button from "@/app/common/components/Button";

// Hook
import { useCreateCustomer } from "@/app/modules/customers/hooks/useCreateCustomer";
import { userService } from "@/app/modules/users/user.service";
import toast from "react-hot-toast";
import { useAuth } from "@/app/common/context/AuthContext";

export default function CreateCustomerPage() {
  const router = useRouter();
  const [activeManagers, setActiveManagers] = useState([]);
  const { formData, currentUser, isSubmitting, handleChange, handleSubmit } =
    useCreateCustomer();
    const {userRole}=useAuth()
    
  const fetchManagers = async () => {
    try {
      const { data } = await userService.getEmployees();
      setActiveManagers(data?.data?.users || data?.users || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load manager directory.");
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);


  return (
    <DashboardLayout
      breadcrumbs={
        <>
          <span
            className="text-slate-500 cursor-pointer hover:text-slate-900"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </span>
          <span className="text-slate-300 mx-2">/</span>
          <span className="text-slate-900 font-bold">Onboard Customer</span>
        </>
      }
    >
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <PageHeader
          title="Client Registration"
          subtitle="Create a new business profile and assign an account manager."
          icon={Building2}
          theme="green"
        />

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              className="sm:col-span-2"
              label="Registered Company Name"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Reliance Industries Ltd."
            />
            <InputField
              className="sm:col-span-2"
              label="Registered Company Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. abc@company.com"
            />

            <InputField
              icon={Receipt}
              label="GST Number"
              name="gst"
              maxLength={15}
              value={formData.gst}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              className="uppercase font-mono"
            />

            {/* DYNAMIC ACCOUNT MANAGER ASSIGNMENT */}
            {userRole === "admin" ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} /> Assign Manager
                </label>
                <select
                  required
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none font-medium text-slate-900"
                >
                  <option value="" disabled>
                    Select from directory...
                  </option>
                  {activeManagers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} /> Account Manager
                </label>
                <div className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-700 flex items-center">
                  Assigning to your territory (
                  {currentUser?.name || "Loading..."})
                </div>
              </div>
            )}

            {/* ADDRESS TEXTAREA */}
            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MapPin size={14} /> Billing / Registered Address
              </label>
              <textarea
                required
                rows={3}
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                placeholder="Enter complete building, street, city, and pincode..."
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CheckCircle2 size={16} className="text-green-500" /> Ledger will
              be initialized at ₹ 0.00.
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full sm:w-auto px-8"
            >
              {isSubmitting ? "Registering..." : "Register Client"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
