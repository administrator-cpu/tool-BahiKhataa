import axios from 'axios';

const invoicingClient = axios.create({
  baseURL: process.env.INVOICING_APP_API_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INTERNAL_INVOICING_SECRET
  }
});

export const syncInvoicePaymentStatus = async (invoiceNo, paymentStatus, balanceDue, amountPaid, ledgerId) => {
  if (!invoiceNo) return { success: false, error: 'No invoice number provided' };

  try {
    await invoicingClient.patch(`/api/invoices/internal/${encodeURIComponent(invoiceNo)}/payment-status`, {
      paymentStatus,
      balanceDue,
      amountPaid,
      ledgerId
    });

    return { success: true };

  } catch (error) {
    const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error.message || 'Unknown network failure';

    try {
      await invoicingClient.post(`/api/invoices/internal/${encodeURIComponent(invoiceNo)}/payment-status/error`, {
        error: `Ledger write failed: ${errorMsg}`
      });
    } catch (fallbackError) {
      console.error(`CRITICAL: Could not reach error logging endpoint:`, fallbackError.message);
    }

    return { success: false, error: errorMsg };
  }
};