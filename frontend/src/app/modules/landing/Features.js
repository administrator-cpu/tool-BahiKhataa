"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, UserCircle, ShieldCheck, Eye, Plus, XCircle } from "lucide-react";

const Features = () => {
  const [activeTab, setActiveTab] = useState("sales");

  const tabs = [
    {
      id: "sales",
      label: "Sales View",
      title: "Streamlined Entry for the Field",
      description: "Designed for quick data entry. Salespersons can log payments, view their specific client list, and track their personal outstanding targets.",
      points: ["Assigned Clients Only", "One-Tap Payment Entry", "Real-time Status Tracking"],
      color: "bg-blue-600",
      icon: <UserCircle size={20} />,
    },
    {
      id: "admin",
      label: "Admin Center",
      title: "Full Oversight & Verification",
      description: "The master view for business owners. Audit every transaction, manage sales teams, and perform the final approval to update the ledger.",
      points: ["Global Aging Dashboard", "Maker-Checker Approval", "Bulk Data Management"],
      color: "bg-slate-900",
      icon: <ShieldCheck size={20} />,
    },
  ];

  return (
    <section className="py-12 md:py-24 bg-[#FDFCF9] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
          
          <div className="flex-1 w-full max-w-xl order-2 lg:order-1 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              One System. <br className="hidden md:block" />
              <span className="text-blue-600">Two Tailored Experiences.</span>
            </h2>
            
            <div className="flex justify-center lg:justify-start mb-8">
              <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 md:px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                      activeTab === tab.id 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.icon}
                    <span className={activeTab === tab.id ? "inline" : "hidden xs:inline"}>
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-bold mb-4 text-slate-800">{tabs.find((t) => t.id === activeTab).title}</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed text-sm md:text-base">
                    {tabs.find((t) => t.id === activeTab).description}
                  </p>
                  <ul className="space-y-4 inline-block text-left">
                    {tabs.find((t) => t.id === activeTab).points.map((point, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm md:text-base">
                        <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 w-full order-1 lg:order-2">
            <div className="relative mx-auto max-w-[550px] aspect-square bg-white rounded-[32px] md:rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  className="p-5 md:p-8 h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                    </div>
                    <div className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 tracking-widest uppercase">
                      {activeTab === "sales" ? "Agent Access" : "Admin Access"}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 md:space-y-4">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="p-3 md:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between transition-all hover:bg-white hover:shadow-md">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            ID
                          </div>
                          <div>
                            <div className="h-2.5 w-16 md:w-24 bg-slate-200 rounded mb-1.5" />
                            <div className="h-2 w-10 md:w-16 bg-slate-100 rounded" />
                          </div>
                        </div>

                        {activeTab === "admin" ? (
                          <div className="flex gap-1.5 md:gap-2">
                            <button className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-green-100 text-green-600 rounded-lg transition-transform active:scale-90">
                              <CheckCircle2 size={14} strokeWidth={3} />
                              <span className="hidden sm:inline text-[10px] font-bold uppercase">Approve</span>
                            </button>
                            <button className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-red-50 text-red-400 rounded-lg transition-transform active:scale-90">
                              <XCircle size={14} strokeWidth={3} />
                              <span className="hidden sm:inline text-[10px] font-bold uppercase">Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Eye size={16} /> 
                            <span className="text-[10px] font-bold uppercase hidden sm:block">View</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {activeTab === "sales" && (
                    <motion.button 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute bottom-6 md:bottom-10 right-6 md:right-10 w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center text-white transition-colors hover:bg-blue-700"
                    >
                      <Plus size={24} strokeWidth={3} />
                    </motion.button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;