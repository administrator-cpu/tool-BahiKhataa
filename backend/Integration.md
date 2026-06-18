# 🔌 Bahi Khata - CRM Integration API Documentation

This document outlines the new API endpoints and data structures required to integrate Bahi Khata with our central CRM. This integration introduces a "User-in-the-Loop" architecture, allowing Admins and Employees to preview and map CRM data to Bahi Khata customers seamlessly.

## 📊 Dashboard Updates (Zero API Changes)

The existing dashboard routes (`/api/customers/portfolio` and `/api/customers`) have been updated to include CRM linkage status. You do not need to change how you call these APIs, but the response payloads now include two new fields per customer.

**New Fields Available in Dashboard Iterations:**

```json
{
  "id": "65f1a2...",
  "name": "RELIANCE INDUSTRIES",
  "isCrmLinked": true,     // 🟢 Use this for your UI Badges!
  "crmId": "60d5ec..."     // 🆔 The linked CRM ID (or null)
}

```

---

## 🌊 Flow 1: Creating a NEW Customer via CRM (Add with Existing Manual Addition)

Use this flow when adding a brand new customer to Bahi Khata.

### Step 1: Search the CRM

Fires when the user types in the "Search CRM" input box.

* **Endpoint:** `GET /api/customers/crm-search`
* **Query Params:** `?query=reliance`
* **Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "_id": "60d5ec49c1234567890abcde",
      "name": "RELIANCE INDUSTRIES",
      "person": "Mukesh",
      "email": "contact@reliance.com"
    }
  ]
}

```

### Step 2: Fetch Profile for Address Selection

Fires when the user selects a specific customer from the search results. Use this data to populate the "Create Customer" form and build the address dropdown.

* **Endpoint:** `GET /api/customers/crm-profile/:crmId`
* **Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "crmId": "60d5ec49c1234567890abcde",
    "companyName": "RELIANCE INDUSTRIES",
    "email": "contact@reliance.com",
    "addresses": [
      {
        "label": "Head Office",
        "gstNumber": "27AAACR1234Q1Z5",
        "fullAddress": "MAKER CHAMBERS, MUMBAI, MAHARASHTRA, 400021"
      }
    ]
  }
}

```

### Step 3: Save and Link (Updated Create Route)

The existing Create Customer route now accepts an optional `crmId` field.

* **Endpoint:** `POST /api/customers`
* **Request Body:**

```json
{
  "companyName": "RELIANCE INDUSTRIES",
  "address": "MAKER CHAMBERS, MUMBAI, MAHARASHTRA, 400021", 
  "gstNumber": "27AAACR1234Q1Z5",
  "email": "contact@reliance.com",
  "manager": "64e3f...",
  "crmId": "60d5ec49c1234567890abcde" // 🆕 Injects the link!
}

```

* **Error Handling (409 Conflict):** Will throw an error if the Bahi Khata name already exists, OR if the `crmId` is already attached to another profile.

---

## 🌊 Flow 2: Comparing & Linking EXISTING Customers

Use this flow for the "Compare & Sync" tab on unlinked customers.

### Step 1: Fetch Side-by-Side Preview

Silently pings the CRM to see if the Bahi Khata company name exists there. Does NOT alter the database.

* **Endpoint:** `GET /api/customers/:bahiKhataId/crm-preview`
* **Response A: Match Found (200 OK)**

```json
{
  "status": "success",
  "matchFound": true,
  "data": {
    "bahiKhataCustomer": { ... }, // Existing local data
    "crmPreview": { ... }         // Full CRM object (use to map addresses/GST)
  }
}

```

* **Response B: No Match Found (200 OK)**

```json
{
  "status": "success",
  "matchFound": false,
  "message": "No exact match found in CRM."
}

```

### Step 2: Officially Link the Accounts

Fires when the Admin clicks "Yes, Link" after reviewing the preview.

* **Endpoint:** `PATCH /api/customers/:bahiKhataId/link-crm`
* **Request Body:**

```json
{
  "crmId": "60d5ec49c1234567890abcde" // Grabbed from the preview response
}

```

* **Response (200 OK):** Confirms linkage. The customer's `isCrmLinked` status will now be true across the dashboard.

---

## 📈 Audit Utility (Admin Only)

A utility endpoint to generate a full report of matched vs. unmatched names across both databases. Useful for rendering a migration progress dashboard.

* **Endpoint:** `GET /api/customers/crm-audit`
* **Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "metrics": {
      "totalBahiKhataCustomers": 120,
      "totalCrmCustomersFetched": 500,
      "exactMatchesFound": 105,
      "missingFromCrm": 15,
      "matchPercentage": "87.50%"
    },
    "lists": {
      "readyToSync": ["RELIANCE", "AIRTEL"],
      "needsAttention": ["TYPO NAME", "NOT IN CRM"]
    }
  }
}

```