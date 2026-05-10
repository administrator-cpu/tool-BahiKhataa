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
