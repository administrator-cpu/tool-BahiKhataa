import apiClient from '../../common/lib/apiClient';

export const ledgerService = {
  // Maps to: POST /api/ledger/payment (Sales/Admin)
  addPendingPayment: async (paymentData) => {
    
    // Map frontend fields to the backend schema
    const payload = {
      customer: paymentData.customerId,
      paymentDate: paymentData.date,
      amount: paymentData.amount,
      bankName: paymentData.bank || 'Direct',
      utrReference: paymentData.utr,
      remarks: paymentData.remarks
    };
    return await apiClient.post('/ledger/payment', payload);
  },

  // Maps to: POST /api/ledger/entry (Admin Only)
  addDirectEntry: async (entryData) => {
    console.log(entryData);
//     credit
// : 
// ""
// customer
// : 
// "69f720d6b3b441e9c52b0411"
// date
// : 
// "2026-05-29"
// debit
// : 
// "888"
// desc
// : 
// "testing"
// ref
// : 
// "ref"
// remarks
// : 
// "jjj"
    
    return await apiClient.post('/ledger/entry', entryData);
  },

  // Maps to: PATCH /api/ledger/review/:id (Admin Only)
  reviewPendingLog: async (logId, action, rejectionReason = null) => {
    return await apiClient.patch(`/ledger/review/${logId}`, {
      action,
      rejectionReason
    });
  },

  // Maps to: GET /api/ledger/:customerId/dashboard
  getCustomerDashboard: async (customerId, page = 1, limit = 20) => {
   const {data}=await apiClient.get(`/ledger/${customerId}/dashboard?page=${page}&limit=${limit}`);
   
    return  data
  },
  
  getPendingQueue: async (managerId) => {
    return await apiClient.get(`/ledger/pending?manager=${managerId}`);
  },
  // reviewPendingLog: async (id, payload) => {
  //   return await apiClient.patch(`/ledger/review/${id}`, payload);
  // },
};

