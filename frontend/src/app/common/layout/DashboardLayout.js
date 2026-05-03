"use client";

import FloatingBackButton from '@/app/common/components/FloatingBackButton';

export default function DashboardLayout({ children, breadcrumbs, hideBack = false }) {

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 ">
      {!hideBack && <FloatingBackButton />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}