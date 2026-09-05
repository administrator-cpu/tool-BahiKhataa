"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, FileText, Mail, Save, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

import DashboardLayout from "@/app/common/layout/DashboardLayout";
import InputField from "@/app/common/components/InputField";
import Button from "@/app/common/components/Button";
import { vendorService } from "@/app/modules/Vendor/vendor.service";

export default function CreateVendorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    gstNumber: "",
    panNumber: "",
    email: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Adding new vendor...");

    try {
      await vendorService.createVendor(formData);
      toast.success("Vendor created successfully!", { id: toastId });
      // Bounce the admin back to the main dashboard after success
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      const errorMessage = error?.response?.data?.message || "Failed to create vendor.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={
        <span className="font-bold text-slate-900 text-lg">
          Add New Vendor / Supplier
        </span>
      }
    >
      <div className="max-w-2xl mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Vendor Details</h2>
              <p className="text-xs font-medium text-slate-500">
                Create a new Accounts Payable profile.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            <InputField
              label="Company / Vendor Name"
              name="companyName"
              icon={Building2}
              placeholder="e.g. ABC Raw Materials Ltd."
              required
              value={formData.companyName}
              onChange={handleChange}
              className="uppercase"
            />

            <InputField
              label="Billing Address"
              name="address"
              icon={MapPin}
              placeholder="Full registered address..."
              required
              value={formData.address}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="GST Number"
                name="gstNumber"
                icon={FileText}
                placeholder="22AAAAA0000A1Z5"
                value={formData.gstNumber}
                onChange={handleChange}
                className="uppercase font-mono"
              />

              <InputField
                label="PAN Number"
                name="panNumber"
                icon={CreditCard}
                placeholder="ABCDE1234F"
                value={formData.panNumber}
                onChange={handleChange}
                className="uppercase font-mono"
              />
            </div>

            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="accounts@vendor.com"
              value={formData.email}
              onChange={handleChange}
              className="lowercase"
            />

            {/* Actions */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                isLoading={isSubmitting}
                className="!bg-purple-600 hover:!bg-purple-700"
              >
                Save Vendor
              </Button>
            </div>

          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}