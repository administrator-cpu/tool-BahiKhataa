import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
// Intl formatters are expensive to construct (~40µs each); build them once and reuse.
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

// A completely crash-proof currency formatter
export const safeFormatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return INR.format(num);
};

export const formatDate = (value) => (value ? DAY_MONTH_YEAR.format(new Date(value)) : '');
export const formatMonthYear = (value) => MONTH_YEAR.format(new Date(value));

export const formatCurrency = (val) => {
  if (val === 0 || !val) return "-";
  return `₹ ${val.toLocaleString('en-IN')}`;
};