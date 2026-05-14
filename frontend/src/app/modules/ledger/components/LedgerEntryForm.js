import React, { useState, useEffect } from 'react';
import { Plus, Edit, Save, FileText, Landmark, Hash, Wallet, ArrowUpRight, ArrowDownRight, Receipt, ChevronDown } from 'lucide-react';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';
import { safeFormatCurrency } from '@/app/common/lib/utils';

// 💡 NEW: Curated list of banks for consistency
const BANK_OPTIONS = [
 
  "Kotak Mahindra Bank",
  "YesBank",
  "Credit Card",
  "Payment Gateway",
  "Other"
];

export default function LedgerEntryForm({ 
  formData, 
  onChange, 
  onSubmit, 
  editingId, 
  onCancel, 
  isSubmitting,
  unpaidInvoices = [] 
}) {
  const [activeTab, setActiveTab] = useState('debit');

  useEffect(() => {
    if (Number(formData.credit) > 0 || formData.isUsingAdvance) {
      setActiveTab('credit');
    } else if (Number(formData.debit) > 0) {
      setActiveTab('debit');
    }
  }, [formData.credit, formData.debit, formData.isUsingAdvance, editingId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'debit') {
      onChange({ target: { name: 'credit', value: '' } });
      onChange({ target: { name: 'isUsingAdvance', value: false } });
      onChange({ target: { name: 'allocations', value: [] } });
    } else {
      onChange({ target: { name: 'debit', value: '' } });
    }
  };

  const allocations = formData.allocations || [];
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amountApplied || 0), 0);
  const creditAmount = Number(formData.credit || 0);
  const unallocatedAmount = Math.max(0, creditAmount - totalAllocated);

  const handleAllocationToggle = (bill, isChecked) => {
    let currentAlloc = [...allocations];
    if (isChecked) {
      const remainingCredit = Math.max(0, creditAmount - totalAllocated);
      const amountToApply = creditAmount > 0 ? Math.min(bill.balanceDue, remainingCredit) : bill.balanceDue; 
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

  const isCreditTab = activeTab === 'credit';
  const isDebitTab = activeTab === 'debit';
  const showBankDetails = isCreditTab && !formData.isUsingAdvance;

  return (
    <div className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-colors ${editingId ? 'border-blue-300 shadow-blue-100' : 'border-slate-200'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${editingId ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
        <h2 className={`font-bold flex items-center gap-2 ${editingId ? 'text-blue-700' : 'text-slate-900'}`}>
          {editingId ? <Edit size={18} className="text-blue-600"/> : <Plus size={18} className="text-blue-600"/>} 
          {editingId ? 'Edit Ledger Entry' : 'New Ledger Transaction'}
        </h2>
        {editingId && (
          <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            Cancel Edit
          </button>
        )}
      </div>
      
      <form onSubmit={onSubmit} className="p-6">
        {/* Toggle Switch */}
        <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => handleTabChange('debit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              isDebitTab ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpRight size={16} /> Bill / Debit (Dr)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('credit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              isCreditTab ? 'bg-white text-green-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownRight size={16} /> Payment / Credit (Cr)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          <InputField className="sm:col-span-1" label="Date" type="date" name="date" required value={formData.date} onChange={onChange} />
          <InputField className="sm:col-span-3" label="Description" name="desc" required placeholder={isDebitTab ? "e.g. Sales Invoice" : "e.g. Payment Received"} value={formData.desc} onChange={onChange} />
          <InputField className="sm:col-span-2" label={isDebitTab ? "Invoice No." : "Ref No."} name="ref" placeholder="Internal Reference" value={formData.ref} onChange={onChange} />
  
          {isDebitTab && (
            <InputField className="sm:col-span-6 font-bold" label="Debit (Dr) / Sale Value (₹)" type="number" name="debit" placeholder="0.00" value={formData.debit} onChange={onChange} required />
          )}

          {isCreditTab && (
            <>
              <InputField className="sm:col-span-3 font-bold text-green-600" label="Credit (Cr) / Receipt Amount (₹)" type="number" name="credit" placeholder="0.00" value={formData.credit} onChange={onChange} required />
              
              <div className="sm:col-span-3 flex flex-col justify-end px-1 pb-1">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl transition-colors">
                  <input
                    type="checkbox"
                    id="isUsingAdvance"
                    name="isUsingAdvance"
                    checked={formData.isUsingAdvance || false}
                    onChange={(e) => onChange({ target: { name: 'isUsingAdvance', value: e.target.checked } })}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
                    <Wallet size={14} /> Deduct from Customer Advance
                  </span>
                </label>
              </div>

              {unpaidInvoices.length > 0 && (
                <div className="sm:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
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
                            <input type="checkbox" checked={isSelected} onChange={(e) => handleAllocationToggle(bill, e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                            <div>
                              <p className="text-sm font-bold text-slate-800">{bill.invoiceNo || 'No Invoice #'} <span className="text-xs font-normal text-slate-500 ml-1">({new Date(bill.date).toLocaleDateString()})</span></p>
                              <p className="text-xs font-medium text-red-500">Due: {safeFormatCurrency(bill.balanceDue)}</p>
                            </div>
                          </label>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Apply: ₹</span>
                              <input type="number" value={allocatedObj.amountApplied || ''} onChange={(e) => handleAllocationAmountChange(billId, e.target.value)} className="w-24 px-2 py-1 text-sm font-bold text-right border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" max={bill.balanceDue} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 💡 UPDATED: Bank Details with Select Dropdown */}
              {showBankDetails && (
                <div className="sm:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1.5 uppercase tracking-wider">
                      <Landmark size={12} /> Bank Name
                    </label>
                    <div className="relative">
                      <select 
                        name="bankName"
                        value={formData.bankName}
                        onChange={onChange}
                        required={isCreditTab}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select Bank</option>
                        {BANK_OPTIONS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  <InputField 
                    icon={Hash} 
                    label="UTR / Transaction ID" 
                    name="utrReference" 
                    placeholder="Enter Reference Number" 
                    value={formData.utrReference} 
                    onChange={onChange} 
                    required={isCreditTab} 
                  />
                </div>
              )}
            </>
          )}

          <InputField className="sm:col-span-6" icon={FileText} label="Remarks (Internal)" name="remarks" placeholder="Any additional notes about this transaction..." value={formData.remarks} onChange={onChange} />
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          {editingId && <Button type="button" onClick={onCancel} variant="secondary">Cancel</Button>}
          <Button type="submit" isLoading={isSubmitting} variant="primary" icon={Save}>
            {editingId ? 'Update Record' : 'Add Record'}
          </Button>
        </div>
      </form>
    </div>
  );
}