import React from 'react';
import { IndianRupee, Send, Building2, Calendar, FileText } from 'lucide-react';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';

export default function SalesPaymentForm({ 
  formData, 
  onChange, 
  onSubmit, 
  isSubmitting 
}) {
  return (
    <div className="overflow-hidden transition-colors bg-white border border-blue-200 shadow-sm rounded-3xl shadow-blue-100">
      
      {/* FORM HEADER */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50/50 border-blue-100">
        <h2 className="flex items-center gap-2 font-bold text-blue-800">
          <IndianRupee size={18} className="text-blue-600"/> Log Payment Details
        </h2>
      </div>
      
      {/* FORM BODY */}
      <form onSubmit={onSubmit} className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. PAYMENT DATE */}
          <InputField 
            label="Payment Date" 
            type="date" 
            name="date" 
            required 
            value={formData.date} 
            onChange={onChange} 
            icon={Calendar}
          />

          {/* 2. AMOUNT COLLECTED */}
          <InputField 
            label="Amount Collected (₹)" 
            type="number" 
            name="amount" 
            required 
            placeholder="0.00" 
            value={formData.amount} 
            onChange={onChange} 
            className="font-bold text-green-700"
          />

          {/* 3. UTR / REFERENCE */}
          <InputField 
            label="UTR / Ref Number" 
            name="utr" 
            required 
            placeholder="e.g. UTR123456789" 
            value={formData.utr} 
            onChange={onChange} 
            className="font-mono uppercase text-slate-700"
          />

          {/* 4. BANK NAME / PAYMENT MODE DROPDOWN */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Building2 size={16} className="text-slate-400" />
              Bank Name / Mode
            </label>
            <div className="relative">
              <select
                name="bank"
                required
                value={formData.bank}
                onChange={onChange}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-900 appearance-none cursor-pointer"
              >
                <option value="" disabled>Select mode...</option>
                <option value="Kotak">Kotak</option>
                <option value="Yes">Yes Bank</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Payment Gateway">Payment Gateway</option>
                <option value="Others">Others</option>
              </select>
              {/* Custom Dropdown Arrow */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          
          {/* 5. REMARKS */}
          <div className="sm:col-span-2 lg:col-span-4">
            <InputField 
              label="Remarks (Optional)" 
              name="remarks" 
              placeholder="Any additional notes about this payment or bank..." 
              value={formData.remarks} 
              onChange={onChange}
              icon={FileText} 
            />
          </div>

        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end mt-6">
          <Button 
            type="submit" 
            isLoading={isSubmitting} 
            variant="primary" 
            icon={Send} 
            className="w-full px-8 bg-blue-600 shadow-sm sm:w-auto hover:bg-blue-700 shadow-blue-200"
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}
