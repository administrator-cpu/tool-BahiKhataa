import React from 'react';

export default function PageHeader({ title, subtitle, icon: Icon, theme = "blue" }) {
  const isGreen = theme === 'green';
  return (
    <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-20 ${isGreen ? 'bg-green-500' : 'bg-blue-500'}`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
          <Icon size={24} className={isGreen ? "text-green-400" : "text-blue-400"} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}