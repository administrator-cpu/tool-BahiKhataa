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
  if (!invoiceNo) return;
  try {
    await invoicingClient.patch(`/api/invoices/internal/${encodeURIComponent(invoiceNo)}/payment-status`, {
      paymentStatus,
      balanceDue,
      amountPaid,
      ledgerId
    });
    console.log(`Successfully synced invoice ${invoiceNo} status: ${paymentStatus}`);
  } catch (error) {
    console.error(`Failed to sync payment status for invoice ${invoiceNo}:`, error?.response?.data || error.message);
  }
};