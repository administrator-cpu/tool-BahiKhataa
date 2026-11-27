import apiClient from '../../common/lib/apiClient';

export const circuitBillingService = {
  // Circuits this vendor has billed + its bills whose circuit ID is not in the CRM
  getVendorCircuitBilling: async (vendorId, { refresh = false } = {}) => {
    const { data } = await apiClient.get(`/circuit-billing/vendor/${vendorId}`, {
      params: refresh ? { refresh: true } : {},
      timeout: 120000,
    });
    return data;
  },

  // Activated CRM connections that no vendor has billed
  getUnbilledCircuits: async ({ refresh = false } = {}) => {
    const { data } = await apiClient.get('/circuit-billing/unbilled', {
      params: refresh ? { refresh: true } : {},
      timeout: 120000,
    });
    return data;
  },
};
