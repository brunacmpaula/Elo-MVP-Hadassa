import React from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center z-20">
        
        <motion.div
          className="flex flex-row items-center gap-6"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Logo Mark */}
          <div className="relative w-24 h-24">
            <motion.div 
              className="absolute inset-0 border-[6px] border-[#0D6F9D] rounded-xl rotate-45"
              initial={{ rotate: 0 }}
              animate={{ rotate: 45 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute inset-0 border-[6px] border-[#38bdf8] rounded-xl -rotate-15"
              initial={{ rotate: 0 }}
              animate={{ rotate: -15 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute inset-0 border-[6px] border-[#F37F38] rounded-xl rotate-15"
              initial={{ rotate: 0 }}
              animate={{ rotate: 15 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeInOut" }}
            />
          </div>
          
          {/* Logo Text */}
          <h1 className="font-display font-bold text-[8vw] text-white tracking-tighter">
            Elo
          </h1>
        </motion.div>

        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-sans text-[2vw] text-slate-300 font-medium tracking-wide">
            Mesmo longe, <span className="text-white font-bold">juntos na missão.</span>
          </p>
        </motion.div>
        
        {/* URL / Call to Action style (but non-interactive) */}
        <motion.div
          className="mt-16 px-8 py-3 rounded-full bg-white/5 border border-white/10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
        >
          <p className="font-sans text-lg text-slate-400">elo414.com</p>
        </motion.div>

      </div>
    </motion.div>
  );
}