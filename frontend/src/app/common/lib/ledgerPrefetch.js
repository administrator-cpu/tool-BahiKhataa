import { prefetch } from './swrCache';
import { ledgerService } from '@/app/modules/ledger/ledger.service';
import { customerService } from '@/app/modules/customers/customer.service';
import { purchaseLedgerService } from '@/app/modules/purchaseLedger/purchaseLedger.service';

export const LEDGER_PAGE_SIZE = 50;

// Shared cache keys + fetchers so a hover prefetch, an early (pre-hydration) fetch and the
// page itself all use the same request. The first page also carries the whole-history
// column totals and the unpaid-bill list, computed on the server.
export const vendorLedgerKey = (id) => `vendor-ledger:${id}`;
export const fetchVendorLedger = (id, limit = LEDGER_PAGE_SIZE) =>
  purchaseLedgerService.getVendorDashboard(id, { limit });
export const fetchVendorLedgerPage = (id, cursor) =>
  purchaseLedgerService.getVendorDashboard(id, { limit: LEDGER_PAGE_SIZE, cursor });

export const customerLedgerKey = (id) => `customer-ledger:${id}`;
export const fetchCustomerLedger = (id, limit = LEDGER_PAGE_SIZE) =>
  Promise.all([ledgerService.getCustomerDashboard(id, { limit }), customerService.getCustomerById(id)]);
export const fetchCustomerLedgerPage = (id, cursor) =>
  ledgerService.getCustomerDashboard(id, { limit: LEDGER_PAGE_SIZE, cursor });

export const prefetchVendorLedger = (router, id) => {
  if (!id) return;
  router?.prefetch(`/dashboard/purchase-ledger/${id}`);
  prefetch(vendorLedgerKey(id), () => fetchVendorLedger(id));
};

export const prefetchCustomerLedger = (router, id) => {
  if (!id) return;
  router?.prefetch(`/dashboard/ledger/${id}`);
  prefetch(customerLedgerKey(id), () => fetchCustomerLedger(id));
};

// Hover intent: only prefetch when the pointer rests on a row for a moment, so sweeping
// the mouse across a long list doesn't fire a request per row.
let hoverTimer = null;
export const hoverPrefetch = (fn) => ({
  onPointerEnter: () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(fn, 120);
  },
  onPointerLeave: () => clearTimeout(hoverTimer),
  onFocus: fn,
});

// Hard reload / direct link: start the ledger request as soon as this code loads,
// before React hydrates, so it runs in parallel with page start-up instead of after it.
export const startEarlyLedgerFetch = () => {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const vendor = path.match(/^\/dashboard\/purchase-ledger\/([0-9a-f]{24})\/?$/i);
  if (vendor) prefetchVendorLedger(null, vendor[1]);
  const customer = path.match(/^\/dashboard\/ledger\/([0-9a-f]{24})\/?$/i);
  if (customer && localStorage.getItem('userRole')) prefetchCustomerLedger(null, customer[1]);
};
