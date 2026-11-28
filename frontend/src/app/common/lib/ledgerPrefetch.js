import { prefetch } from './swrCache';
import { ledgerService } from '@/app/modules/ledger/ledger.service';
import { customerService } from '@/app/modules/customers/customer.service';
import { purchaseLedgerService } from '@/app/modules/purchaseLedger/purchaseLedger.service';

// Shared cache keys + fetchers so a hover prefetch and the page use the same request.
export const vendorLedgerKey = (id) => `vendor-ledger:${id}`;
export const fetchVendorLedger = (id) => purchaseLedgerService.getVendorDashboard(id);

export const customerLedgerKey = (id) => `customer-ledger:${id}`;
export const fetchCustomerLedger = (id) =>
  Promise.all([ledgerService.getCustomerDashboard(id), customerService.getCustomerById(id)]);

// Start the data request (and the route's JS) as soon as the pointer reaches a row.
export const prefetchVendorLedger = (router, id) => {
  if (!id) return;
  router.prefetch(`/dashboard/purchase-ledger/${id}`);
  prefetch(vendorLedgerKey(id), () => fetchVendorLedger(id));
};

export const prefetchCustomerLedger = (router, id) => {
  if (!id) return;
  router.prefetch(`/dashboard/ledger/${id}`);
  prefetch(customerLedgerKey(id), () => fetchCustomerLedger(id));
};
