"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Users, 
  BarChart3, 
  History, 
  Smartphone, 
  Lock 
} from 'lucide-react';

const BentoGrid = () => {
  const cards = [
    {
      title: "Maker-Checker Protocol",
      description: "Dual-layer verification. Sales log payments, Admins verify accuracy. No more disputed entries.",
      icon: <ShieldCheck className="text-blue-600" size={28} />,
      className: "md:col-span-2 md:row-span-2 bg-blue-50/50 border-blue-100",
      content: (
        <div className="mt-8 flex gap-2 overflow-hidden opacity-50">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 min-w-[140px]">
            <div className="h-2 w-12 bg-blue-100 rounded mb-2" />
            <div className="h-2 w-8 bg-slate-100 rounded" />
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 min-w-[140px]">
            <div className="h-2 w-12 bg-blue-100 rounded mb-2" />
            <div className="h-2 w-8 bg-slate-100 rounded" />
          </div>
        </div>
      )
    },
    {
      title: "SSO Integration",
      description: "Seamless identity mapping via corporate Single Sign-On.",
      icon: <Lock className="text-slate-700" size={24} />,
      className: "bg-slate-900 text-white border-slate-800",
    },
    {
      title: "90-Day Aging",
      description: "Automated breakdown of dues into 30, 60, and 90+ day buckets.",
      icon: <BarChart3 className="text-orange-600" size={24} />,
      className: "bg-orange-50 border-orange-100",
    },
    {
      title: "Manager Mapping",
      description: "Salespersons only see their assigned clients. Admins see the big picture.",
      icon: <Users className="text-purple-600" size={24} />,
      className: "md:col-span-2 bg-purple-50 border-purple-100",
    },
    {
      title: "Audit History",
      description: "Every change is logged. Permanent records for every credit and debit.",
      icon: <History className="text-green-600" size={24} />,
      className: "bg-green-50 border-green-100",
    },
    {
      title: "Mobile First",
      description: "Optimized for field sales teams to update ledgers on the go.",
      icon: <Smartphone className="text-rose-600" size={24} />,
      className: "bg-rose-50 border-rose-100",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Built for Transparency</h2>
          <p className="text-slate-600">
            A specialized ledger system designed to handle high-volume transactions 
            with enterprise-grade verification logic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden rounded-[32px] p-8 border ${card.className} group cursor-default`}
            >
              <div className="flex flex-col h-full">
                <div className="mb-4 w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-inherit">
                  {card.icon}
                </div>
                
                <h3 className={`text-xl font-bold mb-2 ${card.className.includes('slate-900') ? 'text-white' : 'text-slate-900'}`}>
                  {card.title}
                </h3>
                
                <p className={`text-sm leading-relaxed ${card.className.includes('slate-900') ? 'text-slate-400' : 'text-slate-600'}`}>
                  {card.description}
                </p>

                {card.content && card.content}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;