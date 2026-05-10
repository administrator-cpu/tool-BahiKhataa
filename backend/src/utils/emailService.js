import Ledger from '../modules/ledger/ledger.model.js';
import Customer from '../modules/customer/customer.model.js';

export const sendPaymentAdjustmentEmail = async (paymentLog) => {
  try {
    if (!paymentLog.allocations || paymentLog.allocations.length === 0) return;

    const customer = await Customer.findById(paymentLog.customer);
    if (!customer || !customer.email) {
      console.log(`Skipping email: No email found for customer ${customer?.companyName}`);
      return;
    }

    const billIds = paymentLog.allocations.map(a => a.billId);
    const bills = await Ledger.find({ _id: { $in: billIds } });
    const invoiceNumbers = bills.map(b => b.invoiceNo || 'N/A').join(', ');

    const aging = await Ledger.getAgingReport(paymentLog.customer);
    const outstanding = aging.total;

    const balanceText = outstanding > 0 ? `₹${outstanding}` : `nil`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <p>Dear ${customer.companyName},</p>
        <p>Greetings from Fab5 !!</p>
        <p>This is to inform you that we have adjusted your recent payment of <b>₹${paymentLog.credit}</b> against the outstanding invoices.</p>
        <p>After the above adjustment, the balance outstanding amount as of date is <b>${balanceText}</b></p>
        <br>
        <p>Please feel free to contact us in case of any clarification or discrepancy.</p>
        <p>Thank you for your continued support and cooperation.</p>
        <br>
        <p>Regards,<br>
        <b>Billing Team</b><br>
        billing@fab5network.com<br>
        Fab5 Network Pvt Ltd</p>
      </div>
    `;

    const payload = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: customer.email,
        bcc_email: process.env.INTERNAL_BCC_EMAIL,
        subject: 'Fab5 - Payment Adjustment Notification',
        html_content: htmlContent
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('EmailJS Error:', await response.text());
    } else {
      console.log(`Payment Adjustment Email sent successfully to ${customer.email}`);
    }

  } catch (error) {
    console.error('Failed to send payment adjustment email:', error);
  }
};
