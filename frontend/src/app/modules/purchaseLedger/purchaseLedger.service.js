import apiClient from '../../common/lib/apiClient';

export const purchaseLedgerService = {
  addDirectEntry: async (entryData) => {
    return await apiClient.post('/purchase-ledger/entry', entryData);
  },

  getVendorDashboard: async (vendorId) => {
    const { data } = await apiClient.get(`/purchase-ledger/vendor/${vendorId}/dashboard`);
    return data;
  },

  getLedgerEntryDetails: async (id) => {
    return await apiClient.get(`/purchase-ledger/${id}/details`);
  },

  editLedgerEntry: async (id, updateData) => {
    return await apiClient.patch(`/purchase-ledger/${id}`, updateData);
  },

  deleteLedgerEntry: async (id) => {
    return await apiClient.delete(`/purchase-ledger/${id}`);
  },

  exportTdsReport: async () => {
    return await apiClient.get('/purchase-ledger/export-tds', {
      responseType: 'blob',
    });
  },

  downloadBulkTemplate: async () => {
    return await apiClient.get('/purchase-ledger/bulk/template', { responseType: 'blob' });
  },

  validateBulkUpload: async (payload) => {
    return await apiClient.post('/purchase-ledger/bulk/validate', payload);
  },

  commitBulkUpload: async (payload) => {
    return await apiClient.post('/purchase-ledger/bulk/commit', payload);
  },
};