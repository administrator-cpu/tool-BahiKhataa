"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // THE DYNAMIC ROUTING LOGIC
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'py-4 bg-white/80 backdrop-blur-lg border-b border-slate-100 shadow-sm'
          : 'py-6 bg-transparent'
        }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Bahi<span className="text-blue-600">Khata</span>
          </span>
        </Link>

        {/* Desktop Button - Wired up to handleGetStarted */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={handleGetStarted} 
            className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 hover:shadow-xl transition-all flex items-center gap-2"
          >
            Get Started <ChevronRight size={16} />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-slate-900"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-6">
              <hr className="border-slate-100" />
              <div className="flex flex-col gap-4">
                
                {/* Mobile Button - Wired up to handleGetStarted */}
                <button 
                  onClick={handleGetStarted} 
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                >
                  Get Started
                </button>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;