// Matches vendor bills (PurchaseLedger.logicalCircuitId) to CRM connections (telecoCircuitId) by circuit ID only.
// IDs are compared upper-case with spaces, dashes, dots and slashes removed.

export const normalizeCircuitId = (value) =>
  value === null || value === undefined ? '' : String(value).toUpperCase().replace(/[\s\-./\\]/g, '');

// A bill's circuit field may hold several IDs separated by commas, semicolons or new lines
export const splitCircuitIds = (value) => {
  if (!value) return [];
  const seen = new Set();
  return String(value)
    .split(/[,;\n]+/)
    .map((raw) => ({ raw: raw.trim(), key: normalizeCircuitId(raw) }))
    .filter(({ key }) => key && !seen.has(key) && seen.add(key));
};

const positiveOrNull = (n) => (Number(n) > 0 ? Number(n) : null);

// The fields shown on screen. Live (last activated) values win over the top level,
// which shows the requested values while an upgrade/shift is pending.
export const toCircuitRow = (c) => {
  const snap = c.lastActivatedSnapshot || null;
  const bandwidth = snap?.bandwidth ?? c.bandwidth ?? null;
  return {
    crmConnectionId: c.crmConnectionId || c._id || null,
    fabCircuitId: c.fabCircuitId || c.opportunityId || null,
    customerName: c.customer?.name || null,
    serviceType: c.serviceType || null,
    bandwidth: bandwidth === null ? null : String(bandwidth),
    telcoProvider: c.telcoProvider || null,
    telcoCircuitId: c.telecoCircuitId || null,
    previousTelcoCircuitIds: c.previousTelecoCircuitIds || [],
    fabRatePerMb: positiveOrNull(snap?.fabRatePerMb ?? c.commercials?.ratePerMb),
    telcoRatePerMb: positiveOrNull(snap?.telcoRatePerMb ?? c.providerCost?.ratePerMb),
    changePending: Boolean(snap && c.bandwidth !== undefined && String(snap.bandwidth) !== String(c.bandwidth)),
    status: c.status || null,
    firstActivatedAt: c.firstActivatedAt || null,
    terminatedOn: c.terminationDetails?.finalDate || c.terminatedAt || null
  };
};

// normalized ID → connections that have it as their current ID / as a previous ID
export const buildCircuitIndex = (connections) => {
  const index = new Map();
  const entry = (key) => {
    if (!index.has(key)) index.set(key, { current: new Map(), previous: new Map() });
    return index.get(key);
  };
  connections.forEach((c) => {
    const id = String(c.crmConnectionId || c._id);
    const current = normalizeCircuitId(c.telecoCircuitId);
    if (current) entry(current).current.set(id, c);
    (c.previousTelecoCircuitIds || []).forEach((prev) => {
      const key = normalizeCircuitId(prev);
      if (key && key !== current) entry(key).previous.set(id, c);
    });
  });
  return index;
};

// Current IDs take priority over previous ones
export const lookupCircuit = (index, key) => {
  const hit = index.get(key);
  if (!hit) return null;
  if (hit.current.size) return { matches: [...hit.current.values()], via: 'current' };
  if (hit.previous.size) return { matches: [...hit.previous.values()], via: 'previous' };
  return null;
};

const billSummary = (b, circuitId) => ({
  billId: b._id,
  date: b.date,
  invoiceNo: b.invoiceNo || null,
  amount: b.credit,
  status: b.status,
  circuitId
});

// One vendor's bills against the CRM
export const buildVendorCircuitReport = (bills, connections) => {
  const index = buildCircuitIndex(connections);
  const billed = new Map();
  const notInCrm = [];
  const ambiguous = [];
  let billsWithoutCircuitId = 0;

  bills.forEach((b) => {
    const ids = splitCircuitIds(b.logicalCircuitId);
    if (ids.length === 0) {
      billsWithoutCircuitId++;
      return;
    }
    ids.forEach(({ raw, key }) => {
      const hit = lookupCircuit(index, key);
      if (!hit) return notInCrm.push(billSummary(b, raw));
      if (hit.matches.length > 1) {
        return ambiguous.push({
          ...billSummary(b, raw),
          candidates: hit.matches.map((c) => ({ fabCircuitId: c.fabCircuitId || c.opportunityId, telcoProvider: c.telcoProvider || null }))
        });
      }
      const conn = hit.matches[0];
      const id = String(conn.crmConnectionId || conn._id);
      if (!billed.has(id)) {
        billed.set(id, { ...toCircuitRow(conn), billCount: 0, totalBilled: 0, lastBillDate: null, lastInvoiceNo: null, matchedViaPreviousId: true });
      }
      const row = billed.get(id);
      row.billCount++;
      row.totalBilled += Number(b.credit) || 0;
      if (hit.via === 'current') row.matchedViaPreviousId = false;
      if (!row.lastBillDate || new Date(b.date) > new Date(row.lastBillDate)) {
        row.lastBillDate = b.date;
        row.lastInvoiceNo = b.invoiceNo || null;
      }
    });
  });

  const billedCircuits = [...billed.values()].sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
  return {
    summary: {
      billsChecked: bills.length,
      billedCircuits: billedCircuits.length,
      billsWithoutCircuitId,
      billsNotInCrm: notInCrm.length,
      ambiguousBills: ambiguous.length
    },
    billedCircuits,
    notInCrm,
    ambiguous
  };
};

// CRM connections that no vendor bill (any vendor) mentions
export const buildUnbilledReport = (allBills, connections) => {
  const billedKeys = new Set();
  allBills.forEach((b) => splitCircuitIds(b.logicalCircuitId).forEach(({ key }) => billedKeys.add(key)));

  const unbilled = [];
  let billedCount = 0;
  connections.forEach((c) => {
    const keys = [c.telecoCircuitId, ...(c.previousTelecoCircuitIds || [])].map(normalizeCircuitId).filter(Boolean);
    if (keys.some((k) => billedKeys.has(k))) {
      billedCount++;
      return;
    }
    unbilled.push({ ...toCircuitRow(c), noCircuitId: keys.length === 0 });
  });

  unbilled.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
  const byStatus = {};
  unbilled.forEach((r) => { byStatus[r.status || 'Unknown'] = (byStatus[r.status || 'Unknown'] || 0) + 1; });

  return {
    summary: {
      totalConnections: connections.length,
      billed: billedCount,
      unbilled: unbilled.length,
      unbilledWithoutCircuitId: unbilled.filter((r) => r.noCircuitId).length,
      unbilledByStatus: byStatus
    },
    circuits: unbilled
  };
};
