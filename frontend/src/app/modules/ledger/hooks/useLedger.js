// src/app/modules/ledger/hooks/useLedger.js
import { useState, useEffect, useCallback } from 'react';
import { ledgerService } from '../ledger.service';
import { customerService } from '../../customers/customer.service';
import toast from 'react-hot-toast';

export function useLedger(customerId, currentUserRole) {
  const [isLoading, setIsLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [dashboardTotals, setDashboardTotals] = useState({ outstanding: 0, availableAdvance: 0 });
  const [agingTotals, setAgingTotals] = useState({ current: 0, d30: 0, d60: 0, d90: 0 });

  const [editingId, setEditingId] = useState(null);
  const [adminFormData, setAdminFormData] = useState({ 
    date: '', desc: '', ref: '', debit: '', credit: '', remarks: '', isUsingAdvance: false, 
    bankName: '', utrReference: '', billId: '', allocations: [] 
  });
  const [salesFormData, setSalesFormData] = useState({ date: '', amount: '', utr: '', bank: '', remarks: '', billId: "", isUsingAdvance: false });

  const fetchLedgerData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [ledgerRes, profileRes] = await Promise.all([
        ledgerService.getCustomerDashboard(customerId),
        customerService.getCustomerById(customerId)
      ]);

      const transactions = ledgerRes?.data?.transactions || [];
      const backendAging = ledgerRes?.data?.aging || {};
      const backendTotals = ledgerRes?.data?.totals || { outstanding: 0, availableAdvance: 0 };

      setLedgerData(transactions);
      setDashboardTotals(backendTotals);

      setAgingTotals({
        current: backendAging.current || 0,
        d30: backendAging.thirtyPlus || 0,
        d60: backendAging.sixtyPlus || 0,
        d90: backendAging.ninetyPlus || 0
      });

      const dbCustomer = profileRes?.data?.data?.customer || profileRes?.data?.customer;

      if (dbCustomer) {
        setCustomerProfile({
          company: dbCustomer.companyName || 'Unknown',
          gst: dbCustomer.gstNumber || 'N/A',
          address: dbCustomer.address || 'N/A',
          email: dbCustomer.email || '',
          manager: dbCustomer.manager?.name || 'Unassigned',
          managerId: dbCustomer.manager?._id || ''
        });
      }
    } catch (error) {
      console.error("Ledger Fetch Error:", error);
      toast.error("Failed to load ledger data.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId && currentUserRole) fetchLedgerData();
  }, [customerId, currentUserRole, fetchLedgerData]);

  const handleEditClick = (row) => {
    setEditingId(row?._id || row?.id);

    if (currentUserRole === 'admin') {
      setAdminFormData({
        date: row?.date ? new Date(row?.date).toISOString().split('T')[0] : '',
        desc: row?.description || row?.desc,
        ref: row?.invoiceNo || row?.bankInfo?.utrReference || '',
        debit: row?.debit?.toString() || '',
        credit: row?.credit?.toString() || '',
        remarks: row?.remarks || '',
        isUsingAdvance: row?.isUsingAdvance || false,
        billId: row?.allocations?.[0]?.billId || '',
        bankName: row?.bankInfo?.bankName || '',       // 💡 Map for editing
        utrReference: row?.bankInfo?.utrReference || '' // 💡 Map for editing
      });
    } else {
      // 💡 THE FIX: For employees, map the existing pending payment data back into the form!
      setSalesFormData({
        date: row?.date ? new Date(row?.date).toISOString().split('T')[0] : '',
        amount: row?.credit?.toString() || '', // Employees edit their pending CREDIT payments
        utr: row?.bankInfo?.utrReference || '',
        bank: row?.bankInfo?.bankName || '',
        remarks: row?.remarks || '',
        billId: row?.allocations?.[0]?.billId || "", // Preserve bill link if it exists
        isUsingAdvance: row?.isUsingAdvance || false,
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForms = () => {
    setEditingId(null);
    setAdminFormData({ 
      date: '', desc: '', ref: '', debit: '', credit: '', remarks: '', isUsingAdvance: false, 
      bankName: '', utrReference: '', billId: '', allocations: [] 
    });
    setSalesFormData({ date: '', amount: '', utr: '', bank: '', remarks: '', billId: "", isUsingAdvance: false });
  };

  return {
    isLoading,
    customerProfile,
    ledgerData,
    agingTotals,
    totals: dashboardTotals,
    editingId,
    adminFormData,
    salesFormData,
    setAdminFormData,
    setSalesFormData,
    handleEditClick,
    resetForms,
    refresh: fetchLedgerData
  };
}