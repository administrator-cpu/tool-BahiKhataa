// src/app/modules/ledger/components/SalesPaymentForm.jsx
import React from 'react';
import { IndianRupee, Send, Building2, Calendar, FileText, Wallet } from 'lucide-react';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';

export default function SalesPaymentForm({ formData, onChange, onSubmit, isSubmitting }) {
  
  // Custom handler for the checkbox to fit your onChange structure
  const handleCheckbox = (e) => {
    onChange({ target: { name: 'isUsingAdvance', value: e.target.checked } });
  };

  return (
    <div className="overflow-hidden transition-colors bg-white border border-blue-200 shadow-sm rounded-3xl shadow-blue-100">
      <div className="flex items-center justify-between p-4 border-b bg-blue-50/50 border-blue-100">
        <h2 className="flex items-center gap-2 font-bold text-blue-800">
          <IndianRupee size={18} className="text-blue-600"/> 
          {formData.billId ? 'Log Payment for Selected Bill' : 'Log General Payment'}
        </h2>
      </div>
      
      <form onSubmit={onSubmit} className="p-6">
        
        {/* 💡 NEW: Advance Payment Toggle */}
        <div className="flex items-center gap-3 p-4 mb-6 bg-purple-50 border border-purple-100 rounded-xl">
           <Wallet className="text-purple-600" size={24} />
           <div className="flex-1">
             <h3 className="text-sm font-bold text-purple-900">Apply Customer Advance?</h3>
             <p className="text-xs text-purple-700">Check this box to deduct from the customer's available advance balance instead of a new bank transfer.</p>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="isUsingAdvance" checked={formData.isUsingAdvance} onChange={handleCheckbox} className="sr-only peer" />
              <div className="w-11 h-6 bg-purple-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
           </label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InputField label="Payment Date" type="date" name="date" required value={formData.date} onChange={onChange} icon={Calendar} />
          <InputField label="Amount to Apply (₹)" type="number" name="amount" required placeholder="0.00" value={formData.amount} onChange={onChange} className="font-bold text-green-700" />

          {/* 💡 Hide these if using advance */}
          {!formData.isUsingAdvance && (
            <>
              <InputField label="UTR / Ref Number" name="utr" required placeholder="e.g. UTR123456789" value={formData.utr} onChange={onChange} className="font-mono uppercase text-slate-700" />
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Building2 size={16} className="text-slate-400" /> Bank Name / Mode</label>
                <div className="relative">
                  <select name="bank" required value={formData.bank} onChange={onChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all text-slate-900 appearance-none cursor-pointer">
                    <option value="" disabled>Select mode...</option>
                    <option value="Kotak">Kotak</option>
                    <option value="Yes">Yes Bank</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Payment Gateway">Payment Gateway</option>
                    <option value="Others">Others</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            </>
          )}
          
          <div className={`sm:col-span-2 ${formData.isUsingAdvance ? 'lg:col-span-2' : 'lg:col-span-4'}`}>
            <InputField label="Remarks (Optional)" name="remarks" placeholder="Any additional notes..." value={formData.remarks} onChange={onChange} icon={FileText} />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" isLoading={isSubmitting} variant="primary" icon={Send} className="w-full px-8 bg-blue-600 sm:w-auto hover:bg-blue-700">
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}