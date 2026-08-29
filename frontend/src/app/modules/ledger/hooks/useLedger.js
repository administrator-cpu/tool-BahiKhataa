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
    date: '', desc: '', ref: '', debit: ''||0, credit: '', remarks: '', isUsingAdvance: false, 
    bankName: '', utrReference: '', billId: '', allocations: [] 
  });
  const [salesFormData, setSalesFormData] = useState({ date: '', amount: '', utr: '', bank: '', remarks: '', billId: "", allocations: [], isUsingAdvance: false });

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
    const mappedAllocations = (row?.allocations || []).map(a => ({
      billId: a.billId?._id || a.billId?.id || a.billId, 
      amountApplied: Number(a.amountApplied) || 0
    }));

    if (currentUserRole === 'admin') {
      setAdminFormData({
        date: row?.date ? new Date(row?.date).toISOString().split('T')[0] : '',
        desc: row?.description || row?.desc,
        ref: row?.invoiceNo || row?.bankInfo?.utrReference || '',
        debit: row?.debit?.toString() || '',
        credit: row?.credit?.toString() || '',
        remarks: row?.remarks || '',
        isUsingAdvance: row?.isUsingAdvance || false,
        billId: mappedAllocations[0]?.billId || '',
        bankName: row?.bankInfo?.bankName || '',       
        utrReference: row?.bankInfo?.utrReference || '',
        allocations: mappedAllocations 
      });
    } else {
      setSalesFormData({
        date: row?.date ? new Date(row?.date).toISOString().split('T')[0] : '',
        amount: row?.credit?.toString() || '', 
        utr: row?.bankInfo?.utrReference || '',
        bank: row?.bankInfo?.bankName || '',
        remarks: row?.remarks || '',
        billId: mappedAllocations[0]?.billId || "", 
        isUsingAdvance: row?.isUsingAdvance || false,
        allocations: mappedAllocations 
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportReport = async (selectedCustomerIds = []) => {
  try {
    // 1. Call the service method
    const response = await ledgerService.exportFinancialReport(selectedCustomerIds);
    
    // 2. Create a Blob from the response data
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 3. Create a temporary URL for the Blob
    const url = window.URL.createObjectURL(blob);
    
    // 4. Create an invisible anchor tag to trigger the download
    const link = document.createElement('a');
    link.href = url;
    
    // Determine filename (matches backend logic)
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Financial_Report_${dateStr}.xlsx`);
    
    // 5. Append, click, and clean up
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Financial report downloaded successfully!");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Failed to download the financial report.");
  }
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
    refresh: fetchLedgerData,
    handleExportReport
  };
}