import Ledger from '../modules/ledger/ledger.model.js';
import Customer from '../modules/customer/customer.model.js';

/*
==========================================
------ MASTER HTML TEMPLATE WRAPPER ------
==========================================
*/
const wrapInTemplate = (htmlContent) => {
  const currentYear = new Date().getFullYear();
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="font-family: system-ui, Arial, sans-serif; font-size: 14px; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #333;">
        
        <div style="line-height: 1.6;">
          ${htmlContent}
        </div>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eaeaea; text-align: center;">
          <a href="https://fab5network.com" target="_blank" style="text-decoration: none; outline: none;">
            <img src="https://res.cloudinary.com/drrour6hl/image/upload/v1774876669/crm/fab5-logo.webp" alt="FAB5 Network Private Limited" height="80" style="height: 80px; display: block; margin: 0 auto;" />
          </a>
          <p style="margin: 8px 0 4px; font-size: 12px; color: #999;">
            © ${currentYear} Fab Five Network Private Limited. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            <a href="https://fab5network.com" style="color: #999; text-decoration: none;">https://fab5network.com</a>
          </p>
        </div>

      </div>
    </body>
  </html>
  `;
};

/*
==========================================
-- CORE MAILING MICROSERVICE DISPATCHER --
==========================================
*/
const dispatchEmail = async (to, subject, htmlContent) => {
  const payload = {
    to,
    subject,
    html: wrapInTemplate(htmlContent),
    text: subject,
    fromName: "Fab Five"
  };
  if (bcc) {
    payload.bcc = bcc;
  }

  const response = await fetch('https://mailing-hxzo.onrender.com/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MAILING_SERVICE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Mailing Microservice Error: ${errorData}`);
  }

  return true;
};

/*
==========================================
------ OTP / AUTH EMAIL CONTROLLER ------
==========================================
*/
export const sendEmail = async ({ email, subject, message }) => {
  try {
    await dispatchEmail(email, subject, message);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

/* 
==========================================
-- LEDGER PAYMENT ADJUSTMENT CONTROLLER --
========================================== 
*/
export const sendPaymentAdjustmentEmail = async (paymentLog) => {
  try {
    if (!paymentLog.allocations || paymentLog.allocations.length === 0) return;

    const customer = await Customer.findById(paymentLog.customer);
    if (!customer || !customer.email) {
      console.log(`Skipping email: No email found for customer ${customer?.companyName}`);
      return;
    }

    const aging = await Ledger.getAgingReport(paymentLog.customer);
    const outstanding = aging.total;
    const balanceText = outstanding > 0 ? `₹${outstanding}` : `nil`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <p>Dear Customer,</p>
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

    await dispatchEmail(
      customer.email,
      'Fab5 - Payment Adjustment Notification',
      htmlContent,
      process.env.INTERNAL_BCC_EMAIL
    );
    console.log(`Payment Adjustment Email sent successfully to ${customer.email}`);

  } catch (error) {
    console.error('Failed to send payment adjustment email:', error);
  }
};