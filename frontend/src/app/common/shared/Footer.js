"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MessageSquare, Code2, Mail, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialIcons = [Globe, MessageSquare, Code2];

  const footerLinks = [
    {
      title: "Product",
      links: ["Features", "Security", "Roadmap", "Pricing"]
    },
    {
      title: "Company",
      links: ["About Us", "Careers", "Blog", "Contact"]
    },
    {
      title: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Compliance"]
    }
  ];

  return (
    <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
      <div className="container mx-auto px-6">

        <div className="flex flex-col md:flex-row justify-between items-center pt-12 gap-6">
          <p className="text-slate-400 text-xs font-medium">
            © {currentYear} Finvia Technologies Private limited. All rights reserved.
          </p>
          <div className="flex items-center gap-8 text-xs font-bold text-slate-400">
             <span className="flex items-center gap-1">
                Made in <span className="text-orange-500">India</span>
             </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;