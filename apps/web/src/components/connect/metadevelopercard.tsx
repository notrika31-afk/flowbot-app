'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Code2 } from 'lucide-react';

export const MetaDeveloperCard: React.FC = () => {
  return (
    <Link 
      href="https://developers.facebook.com" 
      target="_blank" 
      rel="noopener noreferrer"
      className="block w-full"
    >
      <motion.div
        whileHover={{ scale: 1.01, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
        whileTap={{ scale: 0.98, boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
        className="
          relative overflow-hidden
          flex items-center justify-between
          p-4
          bg-white border-2 border-black rounded-xl
          shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]
          group cursor-pointer
        "
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-50 border border-black rounded-lg text-blue-600">
            <Code2 size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sm font-bold text-black">Meta for Developers</span>
            <span className="text-xs text-gray-500">ניהול אפליקציות וגישה ל-API</span>
          </div>
        </div>
        <ArrowUpRight size={18} className="text-black opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
      </motion.div>
    </Link>
  );
};
