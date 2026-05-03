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
    <div className="bg-white border border-blue-200 rounded-3xl shadow-sm shadow-blue-100 overflow-hidden transition-colors">
      
      {/* FORM HEADER */}
      <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2 text-blue-800">
          <IndianRupee size={18} className="text-blue-600"/> Log Payment Details
        </h2>
      </div>
      
      {/* FORM BODY */}
      <form onSubmit={onSubmit} className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* ========================================== */}
          {/* 1. THE NEW DATE FIELD FOR EMPLOYEES          */}
          {/* ========================================== */}
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

          {/* 4. BANK NAME */}
          <InputField 
            label="Bank Name" 
            name="bank" 
            placeholder="e.g. HDFC, SBI..." 
            value={formData.bank} 
            onChange={onChange} 
            icon={Building2}
          />
          
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
        <div className="mt-6 flex justify-end">
          <Button 
            type="submit" 
            isLoading={isSubmitting} 
            variant="primary" 
            icon={Send} 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-8 shadow-sm shadow-blue-200"
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
}