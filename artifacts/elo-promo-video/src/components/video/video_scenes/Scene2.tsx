import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Bell, Check } from 'lucide-react';
import portraitImg from "@assets/generated_images/missionary_portrait.png";

export function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full max-w-[1200px] h-full flex items-center justify-between">
        
        {/* Left Side: The Card Morphing from Scene 1 */}
        <div className="w-1/2 h-full relative flex items-center justify-center z-10 perspective-[1000px]">
          <motion.div
            className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl w-[32vw] shadow-2xl overflow-hidden flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0, rotateY: 10 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 1.2, type: "spring", stiffness: 100, damping: 20 }}
          >
            {/* Background Image / Cover */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[#0D6F9D] to-[#38bdf8] opacity-50"></div>
            
            <motion.div 
              className="relative w-28 h-28 mt-8 rounded-full border-4 border-slate-900 bg-slate-300 overflow-hidden shadow-xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
            >
              <img src={portraitImg} className="w-full h-full object-cover" />
            </motion.div>

            <motion.div 
              className="mt-6 flex flex-col items-center text-center space-y-2 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="h-6 w-48 bg-white/50 rounded-md"></div>
              <div className="h-4 w-32 bg-white/30 rounded-md"></div>
            </motion.div>

            {/* Follow Button Action */}
            <motion.div
              className="mt-10 w-full bg-[#38bdf8] py-4 rounded-xl flex items-center justify-center gap-3 text-slate-900 font-bold text-xl relative overflow-hidden"
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: [0.9, 1.05, 1], y: 0, opacity: 1, backgroundColor: ['#38bdf8', '#10b981'] }}
              transition={{ 
                duration: 1, 
                delay: 1.2, 
                backgroundColor: { delay: 2.2, duration: 0.4 } 
              }}
            >
              {/* Ripple Effect */}
              <motion.div 
                className="absolute inset-0 bg-white/30"
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ delay: 2.2, duration: 0.6 }}
              />
              
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0, 1], rotate: [0, -180, 0] }}
                transition={{ delay: 2.2, duration: 0.6 }}
              >
                 <Check className="w-6 h-6" />
              </motion.div>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ delay: 2.2, duration: 0.6 }}
              >
                Apoiando
              </motion.span>
            </motion.div>

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
              Acompanhe<br/>
              <span className="text-[#10b981]">de perto.</span>
            </h2>
          </motion.div>
          <motion.p
            className="font-sans text-[1.8vw] text-slate-300 mt-6 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Siga os missionários e não perca nenhuma atualização do campo.
          </motion.p>
          
          <motion.div 
            className="mt-12 flex gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Bell className="w-8 h-8 text-[#38bdf8]" />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-[#ef4444]" />
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}