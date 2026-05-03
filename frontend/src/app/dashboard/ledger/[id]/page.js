"use client";

import React, { useState } from 'react'; 
import { Receipt, UserCircle, MapPin, Loader2, Info, Edit } from 'lucide-react'; 
import { useParams } from 'next/navigation';

import DashboardLayout from '@/app/common/layout/DashboardLayout';
import { useAuth } from '@/app/common/context/AuthContext';
import { useLedger } from '@/app/modules/ledger/hooks/useLedger';
import { useAsyncAction } from '@/app/common/hooks/useAsyncAction';
import { ledgerService } from '@/app/modules/ledger/ledger.service';
import { safeFormatCurrency } from '@/app/common/lib/utils';

import LedgerEntryForm from '@/app/modules/ledger/components/LedgerEntryForm';
import LedgerTable from '@/app/modules/ledger/components/LedgerTable';
import SalesPaymentForm from '@/app/modules/ledger/components/SalesPaymentForm';
import EditCustomerModal from '@/app/modules/customers/components/EditCustomerModal';
import RejectLogModal from '@/app/modules/ledger/components/RejectLogModal';

export default function CustomerLedger() {
  const { id: customerId } = useParams();
  const { userRole: currentUserRole } = useAuth();
  const { execute, isLoading: isSubmitting } = useAsyncAction();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, logId: null });

  const {
    isLoading,
    customerProfile,
    ledgerData,
    agingTotals,
    totals,
    editingId,
    adminFormData,
    salesFormData,
    setAdminFormData,
    setSalesFormData,
    handleEditClick,
    resetForms,
    refresh 
  } = useLedger(customerId, currentUserRole);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    await execute(
      () => ledgerService.addDirectEntry({ ...adminFormData, customer: customerId }),
      {
        successMessage: 'Entry saved!',
        onSuccess: () => { resetForms(); refresh(); }
      }
    );
  };

  const handleSalesSubmit = async (e) => {
    e.preventDefault();
    await execute(
      () => ledgerService.addPendingPayment({ ...salesFormData, ledgerId: editingId, customerId }),
      {
        successMessage: 'Submitted for approval!',
        onSuccess: () => { resetForms(); refresh(); }
      }
    );
  };

  // 💡 NEW: Admin Approve Handler
  const handleApproveLog = async (logId) => {
    await execute(
      () => ledgerService.reviewPendingLog(logId, 'approve'),
      {
        successMessage: 'Log approved successfully!',
        onSuccess: () => refresh()
      }
    );
  };

  const handleRejectClick = (logId) => {
    setRejectModal({ isOpen: true, logId });
  };

  const handleConfirmReject = async (reason) => {
    await execute(
      () => ledgerService.reviewPendingLog(rejectModal.logId, 'reject', reason),
      {
        successMessage: 'Log rejected.',
        onSuccess: () => {
          setRejectModal({ isOpen: false, logId: null }); // Close modal
          refresh(); // Refresh table
        }
      }
    );
  };

  // 💡 NEW: Admin Reject Handler
  const handleRejectLog = async (logId) => {
    const reason = window.prompt("Please enter the reason for rejection:");
    if (!reason) return;

    await execute(
      () => ledgerService.reviewPendingLog(logId, 'reject', reason),
      {
        successMessage: 'Log rejected.',
        onSuccess: () => refresh()
      }
    );
  };

  if (isLoading || !customerProfile) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={<span className="font-bold">Ledger Overview</span>}>
      
      {isEditModalOpen && (
        <EditCustomerModal 
            currentCustomer={customerProfile} 
            onClose={() => setIsEditModalOpen(false)} 
            isSubmitting={isSubmitting}
            onRefresh={refresh} 
        />
      )}

      {rejectModal.isOpen && (
        <RejectLogModal 
          onClose={() => setRejectModal({ isOpen: false, logId: null })}
          onConfirm={handleConfirmReject}
          isSubmitting={isSubmitting} 
        />
      )}

      <div className="space-y-6">
        
        {/* PROFILE CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col lg:flex-row justify-between gap-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
           <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-3xl shrink-0">
                {customerProfile.company.charAt(0)}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{customerProfile.company}</h1>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit Customer"
                  >
                    <Edit size={16} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-4">
                   <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5"><Receipt size={14}/> {customerProfile.gst}</div>
                   <div className="text-sm font-bold text-blue-600 flex items-center gap-1.5"><UserCircle size={14}/> {customerProfile.manager}</div>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14}/> {customerProfile.address}</div>
              </div>
           </div>
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-right min-w-62.5 relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Total Balance</p>
              <p className="text-4xl font-black text-slate-900">{safeFormatCurrency(totals.debit - totals.credit)}</p>
           </div>
        </div>

        {/* FORMS */}
        {currentUserRole === 'admin' ? (
          <LedgerEntryForm 
            formData={adminFormData} 
            onChange={(e) => setAdminFormData(p => ({...p, [e.target.name]: e.target.value}))}
            onSubmit={handleAdminSubmit} 
            editingId={editingId} 
            onCancel={resetForms} 
            isSubmitting={isSubmitting} 
          />
        ) : editingId ? (
          <SalesPaymentForm 
            formData={salesFormData} 
            onChange={(e) => setSalesFormData(p => ({...p, [e.target.name]: e.target.value}))}
            onSubmit={handleSalesSubmit} 
            isSubmitting={isSubmitting} 
          />
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-center text-blue-700 font-medium flex items-center justify-center gap-2">
            <Info size={18} /> Click the Edit icon on a row to log a payment.
          </div>
        )}

        {/* TABLE */}
        <LedgerTable 
          ledgerData={ledgerData} 
          editingId={editingId} 
          onEditClick={handleEditClick} 
          onDelete={(id) => { /* call delete service */ }} 
          
          currentUserRole={currentUserRole}
          onApprove={handleApproveLog}
          onReject={handleRejectClick}
          totalDebit={totals.debit} 
          totalCredit={totals.credit} 
          agingTotals={agingTotals} 
        />
      </div>
    </DashboardLayout>
  );
}