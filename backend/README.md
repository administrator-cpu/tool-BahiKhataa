# BahiKhata - Frontend API & Logic Guide

This guide outlines the core APIs, data structures, and business logic for the BahiKhata frontend application.

It covers:
- Unified dashboard structures
- Customer ledger handling
- 1:1 bill settlement architecture

---

## 1. Dashboards (Admin & Agent)

Both the **Admin Main Dashboard** and the **Agent Portfolio Dashboard** are standardized.

### Key Rule
The response structure is identical across both dashboards.  
Do not implement conditional parsing.

---

### Endpoints

- Admin Dashboard  
  GET /api/customers

- Agent Portfolio  
  GET /api/customers/portfolio

### Or whatever you are using to display the data
---

### Expected Data Structure

Each item in customers (Admin) or portfolio (Agent):

{
  "id": "60d5ec...",
  "name": "Adani Jhol",
  "managerName": "Ayush Pathak",
  "managerId": "60d5eb...",
  "aging": {
    "total": 17109,
    "current": 17109,
    "thirtyPlus": 0,
    "sixtyPlus": 0,
    "ninetyPlus": 0,
    "availableAdvance": 5000
  }
}

---

### Frontend Rules

- Outstanding Balance → customer.aging.total
- 30+ Days → customer.aging.thirtyPlus
- 60+ Days → customer.aging.sixtyPlus
- 90+ Days → customer.aging.ninetyPlus
- Advance → customer.aging.availableAdvance

Do not derive values manually.

---

## 2. Customer Ledger Dashboard

The backend now returns computed totals including advance adjustments.

---

### Endpoint

GET /api/ledger/customer/:customerId/dasboard

---

### Expected Response

{
  "status": "success",
  "data": {
    "transactions": [],
    "totals": {
      "debit": 50000,
      "credit": 20000,
      "outstanding": 30000,
      "availableAdvance": 5000
    },
    "aging": {
      "total": 30000,
      "current": 10000,
      "thirtyPlus": 20000,
      "sixtyPlus": 0,
      "ninetyPlus": 0,
      "availableAdvance": 5000
    }
  }
}

---

### Frontend Rules

- Use totals.outstanding for balance display  
- Do NOT compute debit - credit on frontend  
- Backend already excludes pending and adjusts for advances

---

## 3. Recording Payments (1:1 Bill Settlement)

### Core Concept

Each payment is linked to exactly one bill (billId).

---

### Overpayment Handling (Important)

Example:
- Bill = ₹30,000  
- Payment = ₹50,000  

Backend will:
1. Close the ₹30,000 bill
2. Move ₹20,000 to availableAdvance

Frontend must not split amounts manually.

---

## 4. APIs

---

### A. Agent API (Pending Payments)

Endpoint  
POST /api/ledger/pending

Payload

{
  "customer": "CUSTOMER_ID",
  "paymentDate": "2026-05-06",
  "bankName": "HDFC",
  "utrReference": "UTR123456",
  "amount": 50000,
  "remarks": "Paid via bank transfer",
  "billId": "SPECIFIC_BILL_ID"
}

---

### B. Admin API

#### 1. Create Bill

{
  "customer": "CUSTOMER_ID",
  "date": "2026-05-05",
  "desc": "Website Hosting",
  "debit": 30000
}

---

#### 2. Record Payment

{
  "customer": "CUSTOMER_ID",
  "date": "2026-05-06",
  "desc": "Payment Received",
  "credit": 50000,
  "billId": "SPECIFIC_BILL_ID"
}

---

### C. Using Advance Balance

{
  "customer": "CUSTOMER_ID",
  "date": "2026-05-07",
  "credit": 10000,
  "billId": "SPECIFIC_BILL_ID",
  "isUsingAdvance": true
}

---

### D. Agent Requesting to Use Advance Balance (Pending Queue)
Agents can request to settle a bill using the customer's existing advance balance. This bypasses the need for Bank/UTR details but routes the request to the Admin's pending queue for final approval.

**Endpoint:** `POST /api/ledger/pending`

**Payload:**
{
  "customer": "CUSTOMER_ID",
  "paymentDate": "2026-05-07",
  "amount": 10000,
  "billId": "SPECIFIC_BILL_ID",
  "remarks": "Client requested to use advance balance",
  "isUsingAdvance": true
}
Note for Frontend: When isUsingAdvance is true, you do not need to send bankName or utrReference. The backend will automatically handle the bank descriptions and verify if the customer has enough advance balance before allowing the request to go through.

---

### E. Admin Approving Advance Requests
​When the Admin approves an Agent's pending payment that has isUsingAdvance: true, the backend will automatically deduct the amount from the customer's availableAdvance and mark the bill as paid. The Admin does not need to do any manual math during approval.

​**Endpoint**: PUT /api/ledger/review/:id

**Payload:**
{
  "action": "approve" 
}


---
### Backend Behavior

- Validates available advance
- Deducts advance amount
- Marks bill as paid if fully covered

---

## Critical Frontend Constraints

1. Never compute balances manually  
2. Always trust backend totals  
3. Always send billId for payments  
4. Do not split overpayments  
5. Treat advance as backend-controlled state  

---

## Failure Signals

Stop and debug if:

- Dashboard totals ≠ Ledger totals  
- Outstanding becomes negative unexpectedly  
- Payments without billId succeed  
- Advance is not updated after overpayment  

---

## Implementation Priority

1. Dashboard rendering using unified aging
2. Ledger screen using totals.outstanding
3. Payment flow with billId
4. Advance usage flow
5. Edge case handling (overpayment)


<!-- After v1 of the App -->
### New Changes 
**UI Update (Ledger Table):** Update the Credit column to conditionally display `advanceAmount` (e.g., "₹10,000 (Adv)") when a payment is made using advance balance, ensuring the actual `credit` field remains `0` to prevent double-counting in the running totals.
### Ledger Table UI Fix (Double-Entry Bug)
To prevent advance applications from artificially inflating the total revenue, the backend now sends `credit: 0` and populates `advanceAmount` instead. 

----

### New Updates

​1. The "Phantom Row" Concept (Crucial for UI)
- When a customer overpays, the excess is stored in their availableAdvance pool.
- When an employee later applies that advance to an unpaid invoice, the backend generates a `Clearing Document`.

​-To prevent inflating the running totals (Double-Entry bug), the backend strictly returns `credit: 0` for these entries. The actual financial value is stored in advanceAmount.
- ​These adjustment rows are `hidden by default` on the main Ledger Dashboard to keep the client's view clean.
- They will appear when a `user clicks on an invoice` to view its detailed payment history.

---

2. API Endpoints & Payloads
A. **Making a Payment with Allocations**
- When making a standard payment, the user can select multiple open invoices. You will pass an allocations array in the request body.

**Endpoint** `POST/api/ledger/entry (Admin) OR /api/ledger/payment (Employee)`

**Payload**
{
  "customer": "65ab...cdef",
  "date": "2026-05-13",
  "credit": 12000,
  "description": "Bulk payment",
  "bankInfo": {
    "bankName": "HDFC Bank",
    "utrReference": "HDFC000123456"
  },
  "allocations": [
    { "billId": "65bc...1111", "amountApplied": 4000 },
    { "billId": "65bc...2222", "amountApplied": 6000 }
  ]
}
*Note: The remaining ₹2,000 will automatically be routed to the customer's availableAdvance pool.*

B. **Applying an Advance**
- ​If the user clicks "Pay using Advance", send amount instead of credit, and flag isUsingAdvance. You do not need to send bank details.

**Endpoint** `​POST /api/ledger/entry (Admin) OR /api/ledger/payment (Employee)`

**Payload**
{
  "customer": "65ab...cdef",
  "date": "2026-05-13",
  "isUsingAdvance": true,
  "amount": 1000,
  "allocations": [
    { "billId": "65bc...3333", "amountApplied": 1000 }
  ]
}

C. **Fetching Entry Details (The Drill-Down Modal)**
- When a user clicks on a specific row in the ledger, hit this endpoint to get the exact allocation history.

**Endpoint** `GET /api/ledger/entry/:id`

**Payload**
💠 If the ID is an Invoice (Debit), the response will populate the paymentsReceived array.
💠 ​If the ID is a Payment (Credit), the response will populate the allocations array.

3. Frontend Implementation Guide
A. **The Main Dashboard Running Totals**
- Because the backend filters out advance applications and ensures credit: 0 on them, your frontend .reduce() function for the "Running Totals" bar does not need to change. Just sum the debit and credit columns as usual.

B. **Rendering the Drill-Down UI (JSX/TSX Example)**
- When rendering the details of an Invoice, map through the paymentsReceived array. Notice the conditional rendering to handle standard payments vs. advance applications.

**How To Use**
```
// 🟢 Mapping Payments applied to an Invoice
<div className="payment-history-container">
  <h3 className="font-bold">Payment History</h3>
  
  {log.paymentsReceived.map((payment, index) => {
    // 'paymentId' contains the populated transaction document
    const source = payment.paymentId; 
    
    return (
      <div key={index} className="flex justify-between border-b py-2">
        <span>
          {source.isUsingAdvance ? (
             /* UI for Advance Adjustment */
            <span className="text-blue-600 italic">
              🗓 {new Date(source.date).toLocaleDateString()} - Applied from Customer Advance
            </span>
          ) : (
             /* UI for Normal Cash Payment */
            <span className="text-green-600">
              🗓 {new Date(source.date).toLocaleDateString()} - Paid via {source.bankInfo?.bankName} (UTR: {source.bankInfo?.utrReference || 'N/A'})
            </span>
          )}
        </span>
        
        {/* ALWAYS use amountApplied for the UI value, never source.credit */}
        <span className="font-bold">
          ₹{payment.amountApplied.toLocaleString('en-IN')}
        </span>
      </div>
    );
  })}
</div>
```

```
// 🟢 Mapping Invoices paid by a Credit/Payment
<div className="allocation-history-container">
  <h3 className="font-bold">Invoices Cleared by this Payment</h3>
  
  {log.allocations.map((alloc, index) => {
    // 'billId' contains the populated invoice document
    const bill = alloc.billId; 
    
    return (
      <div key={index} className="flex justify-between border-b py-2">
        <span className="text-gray-700">
          🗓 {new Date(bill.date).toLocaleDateString()} - Invoice #{bill.invoiceNo} 
          <span className="ml-2 text-xs bg-gray-200 px-2 rounded">
             {bill.paymentStatus}
          </span>
        </span>
        
        <span className="font-bold">
          ₹{alloc.amountApplied.toLocaleString('en-IN')}
        </span>
      </div>
    );
  })}
</div>

```
🚨 Crucial Data Formatting Rule
When mapping paymentsReceived or allocations, always print amountApplied as the monetary value. Never print the parent document's total credit or advanceAmount, because a single payment might have been split into fragments across multiple invoices.