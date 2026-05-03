import { useState, useEffect, useCallback } from 'react';
import { ledgerService } from '../ledger.service';
import { customerService } from '../../customers/customer.service';
import toast from 'react-hot-toast';

export function useLedger(customerId, currentUserRole) {
  const [isLoading, setIsLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [agingTotals, setAgingTotals] = useState({ current: 0, d30: 0, d60: 0, d90: 0 });
  
  const [editingId, setEditingId] = useState(null);
  const [adminFormData, setAdminFormData] = useState({ date: '', desc: '', ref: '', debit: '', credit: '', remarks: '' });
  const [salesFormData, setSalesFormData] = useState({ date: '', amount: '', utr: '', bank: '', remarks: '' });

 const fetchLedgerData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [ledgerRes, profileRes] = await Promise.all([
        ledgerService.getCustomerDashboard(customerId),
        customerService.getCustomerById(customerId)
      ]);

      // THE FIX: ledgerRes is already the data object because of your service return
      const transactions = ledgerRes?.data?.transactions || [];
      const aging = ledgerRes?.data?.aging || {};

      setLedgerData(transactions);
      
      setAgingTotals({
        current: aging.current || 0,
        d30: aging.thirtyPlus || 0,
        d60: aging.sixtyPlus || 0,
        d90: aging.ninetyPlus || 0
      });

      // profileRes usually comes from Axios directly, so it needs .data
      const dbCustomer = profileRes?.data?.data?.customer || profileRes?.data?.customer;
      
      if (dbCustomer) {
        setCustomerProfile({ 
          company: dbCustomer.companyName || 'Unknown', 
          gst: dbCustomer.gstNumber || 'N/A', 
          address: dbCustomer.address || 'N/A', 
          manager: dbCustomer.manager?.name || 'Unassigned' 
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
    setEditingId(row._id || row.id);
    if (currentUserRole === 'admin') {
      setAdminFormData({
        date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
        desc: row.description || row.desc,
        ref: row.invoiceNo || row.bankInfo?.utrReference || '',
        debit: row.debit?.toString() || '',
        credit: row.credit?.toString() || '',
        remarks: row.remarks || ''
      });
    } else {
      setSalesFormData({
        date: new Date().toISOString().split('T')[0],
        amount: row.credit?.toString() || '',
        utr: row.bankInfo?.utrReference || row.invoiceNo || '',
        bank: row.bankInfo?.bankName || '',
        remarks: row.remarks || ''
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForms = () => {
    setEditingId(null);
    setAdminFormData({ date: '', desc: '', ref: '', debit: '', credit: '', remarks: '' });
    setSalesFormData({ date: '', amount: '', utr: '', bank: '', remarks: '' });
  };

  const totals = (ledgerData || []).reduce((acc, row) => {
    acc.debit += (Number(row?.debit) || 0);
    acc.credit += (Number(row?.credit) || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  return {
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
    refresh: fetchLedgerData
  };
}