import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
// A completely crash-proof currency formatter
export const safeFormatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(num);
};

export const formatCurrency = (val) => {
  if (val === 0 || !val) return "-";
  return `₹ ${val.toLocaleString('en-IN')}`;
};