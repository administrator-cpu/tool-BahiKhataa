import React from 'react';

export default function InputField({ label, icon: Icon, className, ...props }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={14}/>} {label}
      </label>
      <input 
        {...props}
        onWheel={props.type === 'number' ? (e) => e.target.blur() : undefined}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50" 
      />
    </div>
  );
}