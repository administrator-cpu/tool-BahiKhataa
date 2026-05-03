import React from 'react';

export default function StatCard({ title, value, icon: Icon, colorTheme = "blue" }) {
  const themes = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-500",
    orange: "bg-orange-50 text-orange-500",
    green: "bg-green-50 text-green-500"
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${themes[colorTheme]}`}>
        {Icon && <Icon size={24} />}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}