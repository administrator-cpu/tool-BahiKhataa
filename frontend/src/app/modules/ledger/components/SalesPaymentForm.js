import React from 'react';
import { IndianRupee, Send, Building2, Calendar, FileText, Wallet, Receipt } from 'lucide-react';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';
import { safeFormatCurrency } from '@/app/common/lib/utils';

// Consistent Bank Options
const BANK_OPTIONS = [
  "HDFC Bank", "ICICI Bank", "State Bank of India (SBI)", "Axis Bank",
  "Kotak Mahindra Bank", "Punjab National Bank (PNB)", "Bank of Baroda",
  "IndusInd Bank", "Yes Bank", "Cash / Direct", "Other"
];

export default function SalesPaymentForm({ 
  formData, 
  onChange, 
  onSubmit, 
  isSubmitting,
  unpaidInvoices = []
}) {
  
  const handleCheckbox = (e) => {
    onChange({ target: { name: 'isUsingAdvance', value: e.target.checked } });
  };

  const allocations = formData.allocations || [];
  const amountEntered = Number(formData.amount || 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amountApplied || 0), 0);
  const unallocatedAmount = Math.max(0, amountEntered - totalAllocated);

  const handleAllocationToggle = (bill, isChecked) => {
    let currentAlloc = [...allocations];
    
    if (isChecked) {
      const remainingAmount = Math.max(0, amountEntered - totalAllocated);
      const amountToApply = amountEntered > 0 ? Math.min(bill.balanceDue, remainingAmount) : bill.balanceDue; 
      currentAlloc.push({ billId: bill._id || bill.id, amountApplied: amountToApply });
    } else {
      currentAlloc = currentAlloc.filter(a => a.billId !== (bill._id || bill.id));
    }
    
    onChange({ target: { name: 'allocations', value: currentAlloc } });
  };

  const handleAllocationAmountChange = (billId, newAmount) => {
    const currentAlloc = allocations.map(a =>
      a.billId === billId ? { ...a, amountApplied: Number(newAmount) } : a
    );
    onChange({ target: { name: 'allocations', value: currentAlloc } });
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
        
        {/* Advance Payment Toggle */}
        <div className="flex items-center gap-3 p-4 mb-6 bg-purple-50 border border-purple-100 rounded-xl">
           <Wallet className="text-purple-600 shrink-0" size={24} />
           <div className="flex-1">
             <h3 className="text-sm font-bold text-purple-900">Apply Customer Advance?</h3>
             <p className="text-xs text-purple-700">Check this box to deduct from the customer's available advance balance instead of a new bank transfer.</p>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="isUsingAdvance" checked={formData.isUsingAdvance || false} onChange={handleCheckbox} className="sr-only peer" />
              <div className="w-11 h-6 bg-purple-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
           </label>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InputField label="Payment Date" type="date" name="date" required value={formData.date} onChange={onChange} icon={Calendar} />
          <InputField label="Amount to Apply (₹)" type="number" name="amount" required placeholder="0.00" value={formData.amount} onChange={onChange} className="font-bold text-green-700" />

          {/* Hide these if using advance */}
          {!formData.isUsingAdvance && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Building2 size={16} className="text-slate-400" /> Bank Name / Mode</label>
                <div className="relative">
                  {/* 💡 UPDATED: Uses the curated BANK_OPTIONS list */}
                  <select name="bank" required value={formData.bank} onChange={onChange} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-all text-slate-900 appearance-none cursor-pointer">
                    <option value="" disabled>Select mode...</option>
                    {BANK_OPTIONS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
              <InputField label="UTR / Ref Number" name="utr" required placeholder="e.g. UTR123456789" value={formData.utr} onChange={onChange} className="font-mono uppercase text-slate-700" />
            </>
          )}

          {/* 💡 NEW: Multi-Invoice Allocation List */}
          {unpaidInvoices.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Receipt size={16} className="text-blue-600" /> Apply Payment to Open Invoices
                </h3>
                <div className="text-xs font-bold text-slate-500">
                  Unallocated: <span className={unallocatedAmount > 0 ? "text-purple-600" : ""}>{safeFormatCurrency(unallocatedAmount)}</span>
                </div>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto customScroller pr-2">
                {unpaidInvoices.map((bill) => {
                  const billId = bill._id || bill.id;
                  const allocatedObj = allocations.find(a => a.billId === billId);
                  const isSelected = !!allocatedObj;

                  return (
                    <div key={billId} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isSelected ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-slate-200 hover:bg-white'}`}>
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleAllocationToggle(bill, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {bill.invoiceNo || 'No Invoice #'} <span className="text-xs font-normal text-slate-500 ml-1">({new Date(bill.date).toLocaleDateString()})</span>
                          </p>
                          <p className="text-xs font-medium text-red-500">Due: {safeFormatCurrency(bill.balanceDue)}</p>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Apply: ₹</span>
                          <input 
                            type="number" 
                            value={allocatedObj.amountApplied || ''}
                            onChange={(e) => handleAllocationAmountChange(billId, e.target.value)}
                            className="w-24 px-2 py-1 text-sm font-bold text-right border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            max={bill.balanceDue}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="sm:col-span-2 lg:col-span-4">
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