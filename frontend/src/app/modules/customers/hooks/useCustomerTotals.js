import { useMemo } from 'react';

export function useCustomerTotals(customers) {
  // useMemo ensures we only recalculate the math if the customer list actually changes
  const totals = useMemo(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    
    return safeCustomers.reduce((acc, curr) => {
      acc.outstanding += (Number(curr?.outstanding) || 0);
      acc.current += (Number(curr?.current) || 0);
      acc.d30 += (Number(curr?.d30) || 0);
      acc.d60 += (Number(curr?.d60) || 0);
      acc.d90 += (Number(curr?.d90) || 0);
      return acc;
    }, { outstanding: 0, current: 0, d30: 0, d60: 0, d90: 0 });
    
  }, [customers]);

  return totals;
}