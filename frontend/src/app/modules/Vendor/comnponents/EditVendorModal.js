import React, { useState } from 'react';
import { X, Building2, MapPin, FileText, Mail, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';
import { vendorService } from '../vendor.service';

export default function EditVendorModal({ vendor, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: vendor?.companyName || "",
    address: vendor?.address || "",
    gstNumber: vendor?.gstNumber || "",
    email: vendor?.email || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Updating vendor...");

    try {
      await vendorService.editVendor(vendor._id, formData);
      toast.success("Vendor updated successfully!", { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to update vendor.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-purple-600" /> Edit Vendor Profile
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <InputField
            label="Company / Vendor Name"
            name="companyName"
            icon={Building2}
            required
            value={formData.companyName}
            onChange={handleChange}
            className="uppercase"
          />

          <InputField
            label="Billing Address"
            name="address"
            icon={MapPin}
            required
            value={formData.address}
            onChange={handleChange}
          />

          <div className="grid grid-cols-2 gap-5">
            <InputField
              label="GST Number"
              name="gstNumber"
              icon={FileText}
              value={formData.gstNumber}
              onChange={handleChange}
              className="uppercase font-mono"
            />

            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              className="lowercase"
            />
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Save} isLoading={isSubmitting} className="!bg-purple-600 hover:!bg-purple-700">
              Save Changes
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}