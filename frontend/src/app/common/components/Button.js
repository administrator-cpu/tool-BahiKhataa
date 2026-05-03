import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
// import { cn } from '@/common/lib/utils'; // Assuming you have the clsx/twMerge utility

export default function Button({ 
  children, onClick, type = "button", variant = "primary", 
  isLoading = false, icon: Icon, className, ...props 
}) {
  const baseStyle = "flex items-center justify-center gap-2 px-8 py-3 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={isLoading || props.disabled}
      className={cn(baseStyle, variants[variant], className)}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
}