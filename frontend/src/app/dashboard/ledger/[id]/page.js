"use client";

import React, { useState, useEffect } from 'react';  
import { Receipt, UserCircle, MapPin, Loader2, Info, Edit, FileSpreadsheet, FileDown } from 'lucide-react';
import { useParams } from 'next/navigation';

// Layout & Context
import DashboardLayout from '@/app/common/layout/DashboardLayout';
import { useAuth } from '@/app/common/context/AuthContext';
import { useLedger } from '@/app/modules/ledger/hooks/useLedger';
import { useAsyncAction } from '@/app/common/hooks/useAsyncAction';

// Services & Utils
import { ledgerService } from '@/app/modules/ledger/ledger.service';
import { userService } from '@/app/modules/users/user.service';
import { customerService } from '@/app/modules/customers/customer.service';
import { safeFormatCurrency } from '@/app/common/lib/utils';

// Components
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
  const [employees, setEmployees] = useState([]);

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

  // 1. Fetch Employees for the Assign Manager Dropdown (Admin Only)
  useEffect(() => {
    if (currentUserRole === 'admin') {
      userService.getEmployees()
        .then(res => {
          const allUsers = res?.data?.data?.users || res?.data?.users || [];
          setEmployees(allUsers);
        })
        .catch(err => console.error("Failed to load employees", err));
    }
  }, [currentUserRole]);

  // 2. Assign Manager Handler
  const handleManagerChange = async (e) => {
    const newManagerId = e.target.value;
    if (!newManagerId) return;

    await execute(
      () => ledgerService.assignManager(customerId, newManagerId),
      {
        loadingMessage: 'Assigning manager...',
        successMessage: 'Manager successfully assigned!',
        onSuccess: () => refresh() 
      }
    ).catch(() => {});
  };

  // 3. Admin Submit (Create / Edit)
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    
    // Explicitly map frontend 'ref' to backend 'invoiceNo'
    
const payload = {
      date: adminFormData.date,
      description: adminFormData.desc,
      invoiceNo: adminFormData.ref,
      debit: adminFormData.debit,
      credit: adminFormData.credit,
      remarks: adminFormData.remarks,
      isUsingAdvance: adminFormData.isUsingAdvance,
      billId: adminFormData.billId,
      bankInfo: {
        bankName: adminFormData.bankName,
        utrReference: adminFormData.utrReference
      }
    }

if (editingId) {
      await execute(
        () => ledgerService.editLedgerEntry(editingId, payload),
        {
          successMessage: 'Entry updated successfully!',
          onSuccess: () => { resetForms(); refresh(); }
        }
      ).catch(() => {});
    } else {
      await execute(
        () => ledgerService.addDirectEntry({ ...payload, customer: customerId }),
        {
          successMessage: 'Entry saved!',
          onSuccess: () => { resetForms(); refresh(); }
        }
      ).catch(() => {});
    }
  };

  

  const handleSalesSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const updatePayload = {
        date: salesFormData.date,
        credit: salesFormData.amount,
        bankInfo: { bankName: salesFormData.bank, utrReference: salesFormData.utr },
        remarks: salesFormData.remarks,
      };
      await execute(
        () => ledgerService.editLedgerEntry(editingId, updatePayload),
        {
          successMessage: 'Pending request updated!',
          onSuccess: () => { resetForms(); refresh(); }
        }
      ).catch(() => {});
    } else {
      await execute(
        () => ledgerService.addPendingPayment({ ...salesFormData, customerId }),
        {
          successMessage: 'Submitted for approval!',
          onSuccess: () => { resetForms(); refresh(); }
        }
      ).catch(() => {});
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? If this is an approved payment, related invoice balances will be reversed.")) {
      return; 
    }
    await execute(
      () => ledgerService.deleteLedgerEntry(id),
      {
        successMessage: 'Entry deleted successfully!',
        onSuccess: () => { resetForms(); refresh(); }
      }
    ).catch(() => {});
  };

  const handleApproveLog = async (logId) => {
    await execute(
      () => ledgerService.reviewPendingLog(logId, 'approve'),
      {
        successMessage: 'Log approved successfully!',
        onSuccess: () => refresh()
      }
    ).catch(() => {});
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
          setRejectModal({ isOpen: false, logId: null });
          refresh();
        }
      }
    ).catch(() => {});
  };

  // 7. Download Handlers
  const handleDownloadExcel = async () => {
    await execute(
      async () => {
        const response = await ledgerService.downloadExcel(customerId);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const safeName = customerProfile.company.replace(/[^a-zA-Z0-9]/g, '_');
        link.setAttribute('download', `${safeName}_Ledger.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
      { loadingMessage: 'Generating Excel...', successMessage: 'Excel downloaded!' }
    ).catch(() => {});
  };

  const handleDownloadPDF = async () => {
    await execute(
      async () => {
        const response = await ledgerService.downloadPDF(customerId);
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        const safeName = customerProfile.company.replace(/[^a-zA-Z0-9]/g, '_');
        link.setAttribute('download', `${safeName}_Ledger.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
      { loadingMessage: 'Generating PDF...', successMessage: 'PDF downloaded!' }
    ).catch(() => {});
  };

const handlePayClick = (row) => {
    resetForms(); // Clear editingId, because this is a NEW entry
    
    if (currentUserRole === 'admin') {
      setAdminFormData({
        date: new Date().toISOString().split('T')[0],
        desc: `Payment for ${row.invoiceNo || 'Bill'}`,
        ref: row?.invoiceNo || '',
        debit: '',
        credit: row.balanceDue?.toString() || row.debit?.toString() || '',
        remarks: '',
        billId: row._id || row.id, 
        isUsingAdvance: false,
        bankName: '',     // 💡 Force admin to enter Bank Name
        utrReference: ''  // 💡 Force admin to enter UTR
      });
    } else {
      setSalesFormData({
        date: new Date().toISOString().split('T')[0],
        amount: row.balanceDue?.toString() || row.debit?.toString() || '',
        utr: '',
        bank: '',
        remarks: '',
        billId: row._id || row.id, 
        isUsingAdvance: false
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                
                <div className="flex flex-wrap items-center gap-4">
                   <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5"><Receipt size={14}/> {customerProfile.gst}</div>
                   
                   <div className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                     <UserCircle size={14}/> 
                     {currentUserRole === 'admin' ? (
                       <select 
                         value={customerProfile.managerId}
                         onChange={handleManagerChange}
                         disabled={isSubmitting}
                         className="bg-blue-50 border border-blue-200 text-blue-700 py-1 px-2 rounded-lg text-xs outline-none cursor-pointer hover:bg-blue-100 transition-colors disabled:opacity-50"
                       >
                         <option value="" disabled>Unassigned</option>
                         {employees.map(emp => (
                           <option key={emp._id || emp.id} value={emp._id || emp.id}>
                             {emp.name}
                           </option>
                         ))}
                       </select>
                     ) : (
                       <span>{customerProfile.manager}</span>
                     )}
                   </div>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14}/> {customerProfile.address}</div>
              </div>
           </div>

           {/* TOTALS & ACTIONS */}
           <div className="flex flex-col gap-3 relative z-10 min-w-[250px]">
              {totals.availableAdvance > 0 && (
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-right shadow-sm">
                  <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Available Advance</p>
                  <p className="text-xl font-black text-purple-700">{safeFormatCurrency(totals.availableAdvance)}</p>
                </div>
              )}
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-right shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Net Outstanding</p>
                <p className="text-4xl font-black text-slate-900">{safeFormatCurrency(totals.outstanding)}</p>
              </div>

              {/* Export Actions */}
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={handleDownloadExcel}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <FileDown size={16} /> PDF
                </button>
              </div>
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
        ) : (editingId || salesFormData.billId) ? (
          <div className="relative">
            <SalesPaymentForm 
              formData={salesFormData} 
              onChange={(e) => setSalesFormData(p => ({...p, [e.target.name]: e.target.value}))}
              onSubmit={handleSalesSubmit} 
              isSubmitting={isSubmitting} 
            />
            {/* Cancel button so employees can close the form */}
            <div className="absolute top-4 right-4">
              <button 
                type="button" 
                onClick={resetForms} 
                className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm"
              >
                Cancel 
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-center text-blue-700 font-medium flex items-center justify-center gap-2">
            <Info size={18} /> Click the Pay (₹) icon on a bill or the Edit icon to log a payment.
          </div>
        )}

        {/* TABLE */}
        <LedgerTable 
          ledgerData={ledgerData} 
          editingId={editingId} 
          onEditClick={handleEditClick} 
          onDelete={handleDeleteEntry}
          currentUserRole={currentUserRole}
          onPayClick={handlePayClick}
          onApprove={handleApproveLog}
          onReject={handleRejectClick}
          agingTotals={agingTotals} 
        />
      </div>
    </DashboardLayout>
  );
}