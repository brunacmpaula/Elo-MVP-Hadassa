import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import portraitImg from "@assets/generated_images/missionary_portrait.png";

export function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-row items-center justify-center p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full max-w-[1200px] h-full flex items-center justify-between">
        
        {/* Left Side: Offline to Online Mechanism */}
        <div className="w-1/2 h-full relative flex items-center justify-center z-10">
          
          {/* Phone Mockup Frame */}
          <motion.div
            className="relative w-[30vw] h-[70vh] bg-[#0c1b2c] rounded-[3rem] border-[8px] border-slate-700 overflow-hidden shadow-2xl flex flex-col"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, type: "spring", stiffness: 80, damping: 20 }}
          >
            {/* Header */}
            <div className="pt-12 px-6 pb-4 bg-slate-800/50 flex justify-between items-center">
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                  <img src={portraitImg} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="h-3 w-20 bg-white/50 rounded mb-1"></div>
                  <div className="h-2 w-12 bg-white/20 rounded"></div>
                </div>
              </div>
              
              {/* Connection Status Icon */}
              <motion.div
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"
                animate={{ backgroundColor: ['#1e293b', '#0D6F9D', '#10b981'] }}
                transition={{ duration: 1.5, times: [0, 0.6, 1], delay: 1.5 }}
              >
                <motion.div
                  initial={{ opacity: 1, rotate: 0, scale: 1 }}
                  animate={{ opacity: [1, 0, 0], scale: [1, 0.5, 0] }}
                  transition={{ duration: 0.8, delay: 1.5 }}
                  className="absolute"
                >
                  <WifiOff className="w-5 h-5 text-slate-400" />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, rotate: -180, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], rotate: 0, scale: [0.5, 1, 1] }}
                  transition={{ duration: 1, delay: 2.1 }}
                  className="absolute"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 2.9, type: "spring" }}
                  className="absolute"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </motion.div>
              </motion.div>
            </div>

            {/* Content Feed */}
            <div className="flex-1 p-6 space-y-6 relative bg-slate-900/50">
              
              <motion.div
                className="w-full bg-slate-800/80 rounded-2xl p-5 border border-white/5"
                initial={{ opacity: 1 }}
              >
                <div className="h-4 w-full bg-white/10 rounded mb-2"></div>
                <div className="h-4 w-5/6 bg-white/10 rounded mb-4"></div>
                <div className="h-32 w-full bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Send className="w-5 h-5 text-white/30" />
                  </div>
                </div>
              </motion.div>

              {/* Offline Post that gets Synced */}
              <motion.div
                className="w-full bg-[#0D6F9D]/20 rounded-2xl p-5 border border-[#0D6F9D]/40"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-3 w-16 bg-white/30 rounded"></div>
                  <motion.div 
                    className="text-xs font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded"
                    animate={{ backgroundColor: ['#1e293b', '#10b981'], color: ['#cbd5e1', '#ffffff'] }}
                    transition={{ duration: 0.5, delay: 3 }}
                  >
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0, display: "none" }}
                      transition={{ delay: 3 }}
                    >
                      Offline
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, display: "none" }}
                      animate={{ opacity: 1, display: "inline-block" }}
                      transition={{ delay: 3.1 }}
                    >
                      Enviado
                    </motion.span>
                  </motion.div>
                </div>
                <div className="h-4 w-[90%] bg-white/40 rounded mb-2"></div>
                <div className="h-4 w-[70%] bg-white/40 rounded"></div>
              </motion.div>
            </div>
            
          </motion.div>
        </div>

        {/* Right Side: Typography */}
        <div className="w-1/2 flex flex-col pl-16 z-20">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-[4.5vw] leading-[1.1] text-white tracking-tight">
              Atualizações que<br/>chegam, <span className="text-[#0D6F9D]">mesmo offline.</span>
            </h2>
          </motion.div>
          <motion.p
            className="font-sans text-[1.8vw] text-slate-300 mt-6 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Missionários registram tudo sem internet. O Elo sincroniza assim que a conexão volta.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}