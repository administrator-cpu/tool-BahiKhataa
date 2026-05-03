import apiClient from "@/app/common/lib/apiClient";

export const customerService = {
  // Maps to: POST /api/customers (Admin only)
  createCustomer: async (customerData) => {
    // SECURITY MAPPING: Translate Frontend UI state to Backend Schema
    const payload = {
      companyName: customerData.companyName,
      address: customerData.address,
      gstNumber: customerData.gst,       
      manager: customerData.manager   
    };
    return await apiClient.post('/customers', payload);
  },

  // Maps to: GET /api/customers (Admin only)
  getAllCustomers: async (managerId = null) => {
    const url = managerId ? `/customers?manager=${managerId}` : '/customers';
    return await apiClient.get(url);
  },

  // Maps to: GET /api/customers/me (Employee)
  getMyCustomers: async () => {
     const data=  await apiClient.get('/customers/portfolio');
     console.log(data);
     
     return data
  },
  updateCustomer: async (customerId, updatedData) => {
    console.log(updatedData);
    
    const response = await apiClient.patch(`/customers/${customerId}`, updatedData);
    return response.data;
  },
  getPortfolioDashboard: async () => {
    return await apiClient.get('/customers/portfolio');
  },
  getManagerPortfolio: async (managerId) => {
    return await apiClient.get(`/customers/portfolio?manager=${managerId}`);
  },
  getCustomerById: async (id) => {
    return await apiClient.get(`/customers/${id}`);
  }
};