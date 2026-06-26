import apiClient from "@/app/common/lib/apiClient";

export const customerService = {
  // 💡 MERGED: Keeps your security mapping AND supports the new CRM integration
  createCustomer: async (customerData) => {
    const payload = {
      companyName: customerData.companyName,
      address: customerData.address,
      gstNumber: customerData.gst,       
      manager: customerData.manager,  
      email: customerData.email,
      crmId: customerData.crmId // 🆕 Support for CRM Flow 1
    };
    return await apiClient.post('/customers', payload);
  },

  // Maps to: GET /api/customers (Admin only)
  getAllCustomers: async (managerId = null) => {
    const url = managerId ? `/customers?manager=${managerId}` : '/customers';
    return await apiClient.get(url);
  },

  // Generic fetch with Axios params
  getCustomers: async (params) => {
    return await apiClient.get('/customers', { params });
  },

  // Maps to: GET /api/customers/me (Employee)
  getMyCustomers: async () => {
    return await apiClient.get('/customers/portfolio');
  },

  getPortfolioDashboard: async () => {
    return await apiClient.get('/customers/portfolio');
  },

  getManagerPortfolio: async (managerId) => {
    return await apiClient.get(`/customers/portfolio?manager=${managerId}`);
  },

  // 💡 DEDUPLICATED: Kept only one version
  getCustomerById: async (id) => {
    return await apiClient.get(`/customers/${id}`);
  },

  // 💡 DEDUPLICATED: Standardized to use your original PATCH method
  updateCustomer: async (customerId, updatedData) => {
    const response = await apiClient.patch(`/customers/${customerId}`, updatedData);
    return response.data; // Note: Ensure you want to return .data here, whereas other endpoints return the full Axios response!
  },


  /**
   * Step 1: Search the central CRM for a company name
   * @param {string} query - The search string (e.g., "reliance")
   */
  searchCRM: async (query) => {
    if (!query) return { data: { data: [] } };
    return await apiClient.get(`/customers/crm-search?query=${encodeURIComponent(query)}`);
  },

  /**
   * Step 2: Fetch full CRM profile to get addresses and GST details
   * @param {string} crmId - The ID from the CRM database
   */
  getCRMProfile: async (crmId) => {
    return await apiClient.get(`/customers/crm-profile/${crmId}`);
  },



  /**
   * Step 1: Fetch side-by-side preview to verify match before linking
   * @param {string} bahiKhataId - The local Bahi Khata customer ID
   */
  getCRMPreview: async (bahiKhataId) => {
    return await apiClient.get(`/customers/${bahiKhataId}/crm-preview`);
  },

  /**
   * Step 2: Officially link the local account to the CRM account
   * @param {string} bahiKhataId - The local Bahi Khata customer ID
   * @param {string} crmId - The matched CRM ID to link
   */
  linkCRMCustomer: async (bahiKhataId, crmId) => {
    return await apiClient.patch(`/customers/${bahiKhataId}/link-crm`, { crmId });
  },


  getCRMAudit: async () => {
    return await apiClient.get('/customers/crm-audit');
  }
};