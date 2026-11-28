// src/app/modules/ledger/hooks/useLedger.js
import { useState, useEffect, useCallback } from 'react';
import { ledgerService } from '../ledger.service';
import toast from 'react-hot-toast';
import { peek, load, isFresh, invalidate } from '@/app/common/lib/swrCache';
import { customerLedgerKey, fetchCustomerLedger } from '@/app/common/lib/ledgerPrefetch';

// Pure field mapping of the two API responses (unchanged from the original fetch)
const mapLedgerResponses = ([ledgerRes, profileRes]) => {
  const backendAging = ledgerRes?.data?.aging || {};
  const dbCustomer = profileRes?.data?.data?.customer || profileRes?.data?.customer;
  return {
    transactions: ledgerRes?.data?.transactions || [],
    totals: ledgerRes?.data?.totals || { outstanding: 0, availableAdvance: 0 },
    aging: {
      current: backendAging.current || 0,
      d30: backendAging.thirtyPlus || 0,
      d60: backendAging.sixtyPlus || 0,
      d90: backendAging.ninetyPlus || 0
    },
    profile: dbCustomer ? {
      company: dbCustomer.companyName || 'Unknown',
      gst: dbCustomer.gstNumber || 'N/A',
      address: dbCustomer.address || 'N/A',
      email: dbCustomer.email || '',
      manager: dbCustomer.manager?.name || 'Unassigned',
      managerId: dbCustomer.manager?._id || ''
    } : null
  };
};

export function useLedger(customerId, currentUserRole) {
  // Paint from the hover-prefetched response when we have one (same server data, just earlier)
  const [cachedAtMount] = useState(() => {
    const hit = customerId ? peek(customerLedgerKey(customerId)) : undefined;
    return hit ? mapLedgerResponses(hit) : null;
  });
  const [isLoading, setIsLoading] = useState(!cachedAtMount?.profile);
  const [isRevalidating, setIsRevalidating] = useState(!!cachedAtMount && !isFresh(customerLedgerKey(customerId)));
  const [customerProfile, setCustomerProfile] = useState(cachedAtMount?.profile || null);
  const [ledgerData, setLedgerData] = useState(cachedAtMount?.transactions || []);
  const [dashboardTotals, setDashboardTotals] = useState(cachedAtMount?.totals || { outstanding: 0, availableAdvance: 0 });
  const [agingTotals, setAgingTotals] = useState(cachedAtMount?.aging || { current: 0, d30: 0, d60: 0, d90: 0 });

  const [editingId, setEditingId] = useState(null);
  const [adminFormData, setAdminFormData] = useState({ 
    date: '', desc: '', ref: '', debit: ''||0, credit: '', remarks: '', isUsingAdvance: false, 
    bankName: '', utrReference: '', billId: '', allocations: [] 
  });
  const [salesFormData, setSalesFormData] = useState({ date: '', amount: '', utr: '', bank: '', remarks: '', billId: "", allocations: [], isUsingAdvance: false });

  const applyLedger = useCallback((responses) => {
    const mapped = mapLedgerResponses(responses);
    setLedgerData(mapped.transactions);
    setDashboardTotals(mapped.totals);
    setAgingTotals(mapped.aging);
    if (mapped.profile) setCustomerProfile(mapped.profile);
  }, []);

  // `fresh` (refresh after a write) drops the cached copy first, so it always hits the server
  const loadLedger = useCallback(async (fresh) => {
    if (!customerId) return;
    const key = customerLedgerKey(customerId);
    try {
      if (fresh) invalidate(key);
      applyLedger(await load(key, () => fetchCustomerLedger(customerId)));
    } catch (error) {
      console.error("Ledger Fetch Error:", error);
      toast.error("Failed to load ledger data.");
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [customerId, applyLedger]);

  const fetchLedgerData = useCallback(() => loadLedger(true), [loadLedger]);

  // First load: joins the in-flight hover prefetch instead of starting a second request
  useEffect(() => {
    if (!customerId || !currentUserRole) return;
    if (isFresh(customerLedgerKey(customerId))) return;
    loadLedger(false);
  }, [customerId, currentUserRole, loadLedger]);

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
    isRevalidating,
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