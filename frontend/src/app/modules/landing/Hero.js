"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';



const Hero = () => {

      const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
    };
  const handleGetStarted = () => {
    // Close the mobile menu if it happens to be open
    if (isOpen) setIsOpen(false);

    // Check if the user is logged in by looking for the token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token) {
      router.push('/dashboard'); // User is logged in
    } else {
      router.push('/login');     // User is NOT logged in
    }
  };
    return (
        <section className="relative min-h-screen flex items-center pt-28 pb-16 lg:pt-32 overflow-hidden bg-[#F9F7F2]">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-blue-100/50 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] bg-orange-100/50 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex-1 text-center lg:text-left w-full max-w-2xl lg:max-w-none mx-auto lg:mx-0"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
                            <span className="flex h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                            <span className="text-xs md:text-sm font-medium text-slate-600">Powerd</span>
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.15] mb-6">
                            The Modern way to <br className="hidden md:block" />
                            <span className="text-blue-600">Track Business Dues.</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-base md:text-lg text-slate-600 mb-8 md:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Ditch the paper registers. Our Digital Bahi Khata uses a professional
                            <b> Maker-Checker</b> system to ensure your ledgers are always accurate,
                            secure, and audit-ready.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button onClick={handleGetStarted}  className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200">
                                Start for Free <ArrowRight size={20} />
                            </button>
                            {/* <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                View Sample Ledger
                            </button> */}
                        </motion.div>

                        <motion.div variants={itemVariants} className="mt-10 md:mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-8 opacity-100">
                            <div className="flex items-center gap-2"><ShieldCheck size={18} /> <span className="text-xs md:text-sm font-medium">SSO Secured</span></div>
                            <div className="flex items-center gap-2"><Zap size={18} /> <span className="text-xs md:text-sm font-medium">Real-time Aging</span></div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className="flex-1 w-full max-w-[500px] lg:max-w-[600px] relative mx-auto lg:mx-0 mt-8 lg:mt-0"
                    >
                        <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 p-5 md:p-8 relative z-20">
                            <div className="flex justify-between items-center mb-8 md:mb-10">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">Aging Report</h3>
                                    <p className="text-slate-400 text-xs md:text-sm">Updated just now</p>
                                </div>
                                <div className="bg-blue-50 px-3 py-2 md:p-3 rounded-xl md:rounded-2xl text-blue-600 font-bold text-sm md:text-base">
                                    ₹ 18.4L Total
                                </div>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                {[
                                    { label: "Current Month", amount: "₹ 8,40,000", width: "w-full", color: "bg-green-500" },
                                    { label: "30+ Days", amount: "₹ 4,20,000", width: "w-[60%]", color: "bg-yellow-400" },
                                    { label: "60+ Days", amount: "₹ 3,10,000", width: "w-[45%]", color: "bg-orange-500" },
                                    { label: "90+ Days", amount: "₹ 2,70,000", width: "w-[30%]", color: "bg-red-500" }
                                ].map((item, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between mb-1.5 md:mb-2">
                                            <span className="text-xs md:text-sm font-semibold text-slate-700">{item.label}</span>
                                            <span className="text-xs md:text-sm font-bold text-slate-900">{item.amount}</span>
                                        </div>
                                        <div className="h-2 md:h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: item.width.split('-')[1] }}
                                                transition={{ duration: 1.5, delay: 0.5 + (idx * 0.1) }}
                                                className={`h-full ${item.color} rounded-full`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                            className="absolute -top-4 -left-2 md:-top-6 md:-left-10 bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-xl border border-slate-50 z-30"
                        >
                            <div className="flex items-center gap-2 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xs md:text-base">UTR</div>
                                <div>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Pending Check</p>
                                    <p className="text-xs md:text-sm font-bold text-slate-900">₹ 45,000.00</p>
                                </div>
                                <div className="hidden sm:block px-2 py-1 md:px-3 md:py-1 bg-slate-100 text-[9px] md:text-[10px] font-black rounded-lg ml-2 md:ml-4">SALES LOG</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.2 }}
                            className="absolute -bottom-4 -right-2 md:-bottom-10 md:-right-4 bg-green-500 text-white py-2 px-4 md:py-3 md:px-6 rounded-xl md:rounded-2xl shadow-xl z-30 flex items-center gap-2 md:gap-3"
                        >
                            <div className="bg-white/20 p-1 md:p-1.5 rounded-full"><ShieldCheck size={14} className="md:w-4 md:h-4" /></div>
                            <span className="text-xs md:text-sm font-bold">Admin Approved!</span>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
