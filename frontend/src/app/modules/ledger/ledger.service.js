// src/app/modules/ledger/ledger.service.js
import apiClient from '../../common/lib/apiClient';

export const ledgerService = {
  addPendingPayment: async (paymentData) => {
    const payload = {
      customer: paymentData.customerId,
      paymentDate: paymentData.date,
      amount: paymentData.amount,
      bankName: paymentData.bank || 'Direct',
      utrReference: paymentData.utr,
      remarks: paymentData.remarks,
      billId: paymentData.billId, 
      isUsingAdvance: paymentData.isUsingAdvance 
    };
    return await apiClient.post('/ledger/payment', payload);
  },

  addDirectEntry: async (entryData) => {
    return await apiClient.post('/ledger/entry', entryData);
  },

  reviewPendingLog: async (logId, action, rejectionReason = null) => {
    return await apiClient.patch(`/ledger/review/${logId}`, { action, rejectionReason });
  },

  getCustomerDashboard: async (customerId) => {
    const { data } = await apiClient.get(`/ledger/${customerId}/dashboard`);
    return data;
  },
  
  getPendingQueue: async (managerId) => {
    return await apiClient.get(`/ledger/pending?manager=${managerId}`);
  },
  editLedgerEntry: async (id, updateData) => {
    return await apiClient.patch(`/ledger/${id}`, updateData);
  },
  deleteLedgerEntry: async (id) => {
    return await apiClient.delete(`/ledger/${id}`);
  },
  getPendingQueue: async () => {
    return await apiClient.get(`/ledger/pending`);
  },
  getLedgerEntryDetails: async (id) => {
    const {data}= await apiClient.get(`/ledger/${id}`);
    return data
  },
  assignManager: async (customerId, managerId) => {
    return await apiClient.patch(`/customers/${customerId}/assign-manager`, { managerId });
  },
  downloadExcel: async (customerId) => {
     const data = await apiClient.get(`/customers/${customerId}/excel`, { responseType: 'blob' });
     return data
  },
  downloadPDF: async (customerId) => {
    return await apiClient.get(`/customers/${customerId}/pdf`, { responseType: 'blob' });
  }
};