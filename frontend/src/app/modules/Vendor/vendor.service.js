import apiClient from '../../common/lib/apiClient';

export const vendorService = {
  createVendor: async (vendorData) => {
    const { data } = await apiClient.post('/vendors', vendorData);
    return data;
  },

  getAllVendors: async () => {
    const { data } = await apiClient.get('/vendors');
    return data;
  },

  getVendorsDashboard: async () => {
    try {
      const { data } = await apiClient.get('/vendors/dashboard');
      return data;
    } catch (error) {
      if (error.response && (error.response.status === 403 || error.response.status === 401)) {
        return { data: { vendors: [] } }; 
      }
      throw error;
    }
  },

  editVendor: async (vendorId, updateData) => {
    const { data } = await apiClient.patch(`/vendors/${vendorId}`, updateData);
    return data;
  }
};