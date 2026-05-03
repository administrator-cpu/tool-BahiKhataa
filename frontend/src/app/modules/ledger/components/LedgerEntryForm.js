import React from 'react';
import { Plus, Edit, Save, FileText } from 'lucide-react';
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
  return (
    <div className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-colors ${editingId ? 'border-blue-300 shadow-blue-100' : 'border-slate-200'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${editingId ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
        <h2 className={`font-bold flex items-center gap-2 ${editingId ? 'text-blue-700' : 'text-slate-900'}`}>
          {editingId ? <Edit size={18} className="text-blue-600"/> : <Plus size={18} className="text-blue-600"/>} 
          {editingId ? 'Edit Ledger Entry' : 'Ledger Entry Update'}
        </h2>
        {editingId && (
          <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            Cancel Edit
          </button>
        )}
      </div>
      
      <form onSubmit={onSubmit} className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          <InputField className="sm:col-span-1" label="Date" type="date" name="date" required value={formData.date} onChange={onChange} />
          <InputField className="sm:col-span-2" label="Description" name="desc" required placeholder="e.g. Monthly Invoice" value={formData.desc} onChange={onChange} />
          <InputField className="sm:col-span-1" label="Inv / Ref No." name="ref" placeholder="e.g. INV-111" value={formData.ref} onChange={onChange} />
          <InputField className="sm:col-span-1 font-bold" label="Debit (₹)" type="number" name="debit" placeholder="0.00" value={formData.debit} onChange={onChange} />
          <InputField className="sm:col-span-1 font-bold text-green-600" label="Credit (₹)" type="number" name="credit" placeholder="0.00" value={formData.credit} onChange={onChange}  />
          <InputField className="sm:col-span-6" icon={FileText} label="Remarks (Optional)" name="remarks" placeholder="Enter bank details, mode of payment..." value={formData.remarks} onChange={onChange} />
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