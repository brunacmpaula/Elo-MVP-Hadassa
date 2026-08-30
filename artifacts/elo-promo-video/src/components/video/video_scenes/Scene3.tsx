import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export function Scene3() {
  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full max-w-[1200px] h-full flex flex-col items-center justify-center">
        
        {/* Top: Typography */}
        <div className="flex flex-col items-center text-center z-20 mb-16">
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-[5vw] leading-[1.1] text-white tracking-tight">
              Faça parte através da <span className="text-[#F37F38]">oração.</span>
            </h2>
          </motion.div>
          <motion.p
            className="font-sans text-[1.8vw] text-slate-300 mt-6 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Comprometa-se com as necessidades reais de quem está na linha de frente.
          </motion.p>
        </div>

        {/* Center: The Prayer Commitment Interaction */}
        <div className="relative flex items-center justify-center w-full z-10 perspective-[1000px]">
          
          <motion.div
            className="relative bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl w-[40vw] shadow-2xl flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            transition={{ duration: 1.2, delay: 0.8, type: "spring", stiffness: 100, damping: 20 }}
          >
            {/* Needs List */}
            <div className="w-full space-y-4 mb-10">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 text-[#F37F38]" />
                </div>
                <div className="flex-1 pt-1 space-y-3">
                  <div className="h-4 w-3/4 bg-white/40 rounded"></div>
                  <div className="h-3 w-1/2 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>

            {/* Pray Button */}
            <motion.div
              className="relative"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              {/* Glow Behind Button */}
              <motion.div 
                className="absolute inset-0 bg-[#F37F38] blur-xl rounded-full opacity-0"
                animate={{ opacity: [0, 0.5, 0.8, 0.5] }}
                transition={{ delay: 2, duration: 2, repeat: Infinity, repeatType: "reverse" }}
              />
              
              <motion.div
                className="relative px-10 py-5 bg-white/10 border-2 border-[#F37F38] text-[#F37F38] font-bold text-2xl rounded-full flex items-center gap-3 overflow-hidden cursor-default"
                animate={{ 
                  backgroundColor: ['transparent', '#F37F38'], 
                  color: ['#F37F38', '#ffffff'],
                  borderColor: ['#F37F38', '#F37F38']
                }}
                transition={{ delay: 1.8, duration: 0.5 }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ delay: 1.8, duration: 0.5 }}
                >
                  🙏
                </motion.div>
                <span>Orar por isso</span>

                {/* Shine effect passing over */}
                <motion.div
                  className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ delay: 2.2, duration: 0.8 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Floating Avatar confirmations */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-12 h-12 rounded-full border-2 border-[#112a46] shadow-lg overflow-hidden flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: ['#0D6F9D', '#F37F38', '#10b981'][i] }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0.5, 1, 1.2], 
                x: (i - 1) * 80 + (Math.random() * 40 - 20), 
                y: -100 - (Math.random() * 50) 
              }}
              transition={{ delay: 2.3 + i * 0.2, duration: 1.5, ease: "easeOut" }}
            >
               {['MJ', 'AL', 'TR'][i]}
            </motion.div>
          ))}
          
        </div>
      </div>
    </motion.div>
  );
}