import React from 'react';
import { Plus, Edit, Save, FileText, Landmark, Hash, Wallet } from 'lucide-react';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';

export default function LedgerEntryForm({ 
  formData, 
  onChange, 
  onSubmit, 
  editingId, 
  onCancel, 
  isSubmitting 
}) {
  // 💡 NEW LOGIC: Show bank details by default. 
  // Only hide them if explicitly entering a Sales Invoice (Debit) or using an existing Advance
  const isEnteringDebit = Number(formData.debit) > 0;
  const showBankDetails = !isEnteringDebit && !formData.isUsingAdvance;
  const isCreditEntered = Number(formData.credit) > 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          {/* Row 1: Core Details */}
          <InputField className="sm:col-span-1" label="Date" type="date" name="date" required value={formData.date} onChange={onChange} />
          <InputField className="sm:col-span-3" label="Description" name="desc" required placeholder="e.g. Sales Invoice or Advance Payment" value={formData.desc} onChange={onChange} />
          <InputField className="sm:col-span-2" label="Inv / Ref No." name="ref" placeholder="Internal Reference" value={formData.ref} onChange={onChange} />
          
          {/* Row 2: Financials */}
          <InputField 
            className="sm:col-span-3 font-bold" 
            label="Debit (Dr) / Sale Value" 
            type="number" 
            name="debit" 
            placeholder="0.00" 
            value={formData.debit} 
            onChange={onChange}
            disabled={formData.isUsingAdvance} 
          />
          <InputField 
            className="sm:col-span-3 font-bold text-green-600" 
            label="Credit (Cr) / Receipt Amount" 
            type="number" 
            name="credit" 
            placeholder="0.00" 
            value={formData.credit} 
            onChange={onChange}  
          />

          {/* Row 3: Advance Toggle */}
          <div className="sm:col-span-6 flex items-center gap-2 px-1 py-1">
            <input
              type="checkbox"
              id="isUsingAdvance"
              name="isUsingAdvance"
              checked={formData.isUsingAdvance || false}
              onChange={(e) => onChange({ target: { name: 'isUsingAdvance', value: e.target.checked } })}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="isUsingAdvance" className="text-sm font-bold text-purple-700 cursor-pointer flex items-center gap-1.5">
              <Wallet size={14} /> Deduct this from Customer's available Advance Balance
            </label>
          </div>

          {/* 💡 Row 4: Bank Details */}
          {showBankDetails && (
            <div className="sm:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <InputField 
                icon={Landmark} 
                label="Bank Name" 
                name="bankName" 
                placeholder="e.g. HDFC Bank, Cash, etc." 
                value={formData.bankName} 
                onChange={onChange} 
                required={isCreditEntered} // Only required if they are actually submitting a Credit
              />
              <InputField 
                icon={Hash} 
                label="UTR / Transaction ID" 
                name="utrReference" 
                placeholder="Enter Transaction Reference" 
                value={formData.utrReference} 
                onChange={onChange} 
                required={isCreditEntered} // Only required if they are actually submitting a Credit
              />
            </div>
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