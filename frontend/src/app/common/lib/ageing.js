/**
 * Ageing maths shared by the receivables + payables dashboards.
 * `get` maps one row to { total, current, d30, d60, d90 }.
 */
export function buildAgeing(items = [], get) {
  const rows = Array.isArray(items) ? items : [];
  const acc = rows.reduce(
    (a, row) => {
      const v = get(row);
      return {
        total: a.total + (Number(v.total) || 0),
        current: a.current + (Number(v.current) || 0),
        d30: a.d30 + (Number(v.d30) || 0),
        d60: a.d60 + (Number(v.d60) || 0),
        d90: a.d90 + (Number(v.d90) || 0),
        risk: a.risk + (Number(v.d90) > 0 ? 1 : 0),
      };
    },
    { total: 0, current: 0, d30: 0, d60: 0, d90: 0, risk: 0 }
  );

  const share = (v) => (acc.total ? Math.round((v / acc.total) * 1000) / 10 : 0);

  return {
    ...acc,
    count: rows.length,
    share,
    pctCurrent: share(acc.current),
    buckets: [
      { key: "current", label: "Current", value: acc.current, pct: share(acc.current), color: "#101014" },
      { key: "d30", label: "30+ days", value: acc.d30, pct: share(acc.d30), color: "#FFAC00" },
      { key: "d60", label: "60+ days", value: acc.d60, pct: share(acc.d60), color: "#FF7A45" },
      { key: "d90", label: "90+ days", value: acc.d90, pct: share(acc.d90), color: "#B4301C" },
    ],
  };
}

export const customerAgeing = (c) => ({
  total: c?.outstanding,
  current: c?.current,
  d30: c?.d30,
  d60: c?.d60,
  d90: c?.d90,
});

export const vendorAgeing = (v) => ({
  total: v?.aging?.total,
  current: v?.aging?.current,
  d30: v?.aging?.thirtyPlus,
  d60: v?.aging?.sixtyPlus,
  d90: v?.aging?.ninetyPlus,
});
