// Pure tests: no database needed
import 'dotenv/config';
import {
  normalizeCircuitId, splitCircuitIds, buildVendorCircuitReport, buildUnbilledReport, toCircuitRow
} from './circuitMatching.js';
import { crmClient } from '../../utils/crmClient.js';
import { getCrmConnections, clearCrmConnectionsCache } from './crmConnections.js';

const conn = (id, telecoCircuitId, extra = {}) => ({
  crmConnectionId: id,
  fabCircuitId: `FAB-${id}`,
  customer: { crmCustomerId: `c${id}`, name: `CUSTOMER ${id}` },
  serviceType: 'ILL',
  bandwidth: '100',
  telcoProvider: 'Airtel',
  telecoCircuitId,
  commercials: { ratePerMb: 50 },
  providerCost: { ratePerMb: 30 },
  status: 'Active',
  ...extra
});
const bill = (logicalCircuitId, extra = {}) => ({
  _id: Math.random().toString(36).slice(2), date: new Date('2026-10-01'), invoiceNo: 'VB-1',
  credit: 1000, status: 'approved', logicalCircuitId, ...extra
});

describe('circuit ID normalisation', () => {
  it('ignores case, spaces, dashes, dots and slashes', () => {
    expect(normalizeCircuitId(' 14-ill del.0098/765 ')).toBe('14ILLDEL0098765');
    expect(normalizeCircuitId(null)).toBe('');
  });

  it('splits several IDs in one bill field', () => {
    expect(splitCircuitIds('A-1, a1; B 2\nC3').map((x) => x.key)).toEqual(['A1', 'B2', 'C3']);
    expect(splitCircuitIds('')).toEqual([]);
  });

  it('pulls the number out of notes and symbols, ignoring short numbers and text-only entries', () => {
    expect(splitCircuitIds('250425100161189 (Delhi link 2)')[0].keys).toEqual(['250425100161189(DELHILINK2)', '250425100161189']);
    expect(splitCircuitIds('NA')).toEqual([]);
    expect(splitCircuitIds('(Noida)')).toEqual([]);
  });
});

describe('bracketed notes on bills', () => {
  const connections = [conn('1', '250425100161189'), conn('2', '260620100264084')];

  it('matches the number inside notes, brackets and symbols', () => {
    const report = buildVendorCircuitReport([
      bill('250425100161189 (Delhi link)'),
      bill('(Noida) 260620100264084'),
      bill('#260620100264084*'),
      bill('ID: 250425100161189, (Delhi, Noida)')
    ], connections);
    expect(report.summary).toMatchObject({ billedCircuits: 2, billsNotInCrm: 0, billsWithoutCircuitId: 0 });
    expect(report.billedCircuits.map((r) => r.billCount).sort()).toEqual([2, 2]);
  });

  it('still reports an unknown number as not in the CRM', () => {
    const report = buildVendorCircuitReport([bill('999999999 (old link)')], connections);
    expect(report.notInCrm[0].circuitId).toBe('999999999 (old link)');
  });

  it('agrees with the unbilled report', () => {
    const report = buildUnbilledReport([bill('250425100161189 (Delhi)')], connections);
    expect(report.circuits.map((c) => c.telcoCircuitId)).toEqual(['260620100264084']);
  });
});

describe('vendor circuit report', () => {
  const connections = [
    conn('1', '14ILLDEL0098765'),
    conn('2', 'NEW-200', { previousTelecoCircuitIds: ['OLD-100'] }),
    conn('3', 'DUP-300', { telcoProvider: 'Airtel' }),
    conn('4', 'dup300', { telcoProvider: 'Jio' })
  ];

  it('marks circuits billed, counts bills, and lists bills not in the CRM', () => {
    const report = buildVendorCircuitReport([
      bill('14-ILL-DEL-0098765', { date: new Date('2026-09-01'), invoiceNo: 'SEP' }),
      bill('14illdel0098765', { date: new Date('2026-10-01'), invoiceNo: 'OCT', credit: 500 }),
      bill('UNKNOWN-9'),
      bill(null),
      bill('  ')
    ], connections);

    expect(report.summary).toEqual({ billsChecked: 5, billedCircuits: 1, billsWithoutCircuitId: 2, billsNotInCrm: 1, ambiguousBills: 0 });
    expect(report.billedCircuits[0]).toMatchObject({
      fabCircuitId: 'FAB-1', customerName: 'CUSTOMER 1', serviceType: 'ILL', bandwidth: '100',
      fabRatePerMb: 50, telcoRatePerMb: 30, telcoCircuitId: '14ILLDEL0098765',
      billCount: 2, totalBilled: 1500, lastInvoiceNo: 'OCT', matchedViaPreviousId: false
    });
    expect(report.notInCrm[0].circuitId).toBe('UNKNOWN-9');
  });

  it('matches bills carrying an old circuit ID', () => {
    const report = buildVendorCircuitReport([bill('old 100')], connections);
    expect(report.billedCircuits[0]).toMatchObject({ fabCircuitId: 'FAB-2', matchedViaPreviousId: true });
  });

  it('flags an ID that belongs to more than one connection instead of guessing', () => {
    const report = buildVendorCircuitReport([bill('DUP-300')], connections);
    expect(report.billedCircuits).toHaveLength(0);
    expect(report.ambiguous[0].candidates.map((c) => c.telcoProvider).sort()).toEqual(['Airtel', 'Jio']);
  });

  it('prefers a current ID over someone else\'s previous ID', () => {
    const report = buildVendorCircuitReport([bill('X9')], [conn('a', 'X9'), conn('b', 'Y9', { previousTelecoCircuitIds: ['X9'] })]);
    expect(report.billedCircuits.map((r) => r.fabCircuitId)).toEqual(['FAB-a']);
  });
});

describe('live rates', () => {
  it('uses the last activated values while a change is pending', () => {
    const row = toCircuitRow(conn('1', 'A', {
      bandwidth: '200', providerCost: { ratePerMb: 0 },
      lastActivatedSnapshot: { bandwidth: '100', fabRatePerMb: 50, telcoRatePerMb: 30 }
    }));
    expect(row).toMatchObject({ bandwidth: '100', telcoRatePerMb: 30, changePending: true });
  });

  it('shows no telco rate when it is 0', () => {
    expect(toCircuitRow(conn('1', 'A', { providerCost: { ratePerMb: 0 } })).telcoRatePerMb).toBeNull();
  });
});

describe('unbilled report', () => {
  it('lists connections no vendor has billed, including those without a circuit ID', () => {
    const report = buildUnbilledReport(
      [bill('a-1'), bill('old 7')],
      [conn('1', 'A1'), conn('2', 'B2'), conn('3', 'C3', { previousTelecoCircuitIds: ['OLD7'] }), conn('4', '', { status: 'Disconnected' })]
    );
    expect(report.summary).toMatchObject({ totalConnections: 4, billed: 2, unbilled: 2, unbilledWithoutCircuitId: 1 });
    expect(report.circuits.map((c) => c.fabCircuitId)).toEqual(['FAB-2', 'FAB-4']);
    expect(report.summary.unbilledByStatus).toEqual({ Active: 1, Disconnected: 1 });
  });
});

describe('CRM connections fetch', () => {
  const originalAdapter = crmClient.defaults.adapter;
  afterEach(() => {
    crmClient.defaults.adapter = originalAdapter;
    clearCrmConnectionsCache();
  });

  it('follows the cursor until hasMore is false, then serves from cache', async () => {
    const calls = [];
    crmClient.defaults.adapter = async (config) => {
      calls.push(config.params);
      const page = config.params.cursor
        ? { success: true, data: [conn('2', 'B')], hasMore: false, nextCursor: 'c2' }
        : { success: true, data: [conn('1', 'A')], hasMore: true, nextCursor: 'c1' };
      return { data: page, status: 200, statusText: 'OK', headers: {}, config };
    };

    const { connections } = await getCrmConnections();
    expect(connections.map((c) => c.crmConnectionId)).toEqual(['1', '2']);
    expect(calls).toEqual([{ limit: 500 }, { limit: 500, cursor: 'c1' }]);

    await getCrmConnections();
    expect(calls).toHaveLength(2); // cached
    await getCrmConnections({ refresh: true });
    expect(calls).toHaveLength(4);
  });

  it('turns a CRM failure into a 502', async () => {
    crmClient.defaults.adapter = async () => { throw new Error('ECONNREFUSED'); };
    await expect(getCrmConnections()).rejects.toMatchObject({ statusCode: 502 });
  });
});
