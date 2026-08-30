import React from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Globe2 } from 'lucide-react';
import portraitImg from "@assets/generated_images/missionary_portrait.png";

export function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-full max-w-[1200px] h-full flex items-center justify-between">
        
        {/* Left Side: Typography */}
        <div className="w-1/2 flex flex-col z-20">
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1000 }}
          >
            <h1 className="font-display font-bold text-[5vw] leading-[1.1] text-white tracking-tight">
              Encontre a <span className="text-[#38bdf8]">missão</span><br/>que te move.
            </h1>
          </motion.div>
          <motion.p
            className="font-sans text-[1.8vw] text-slate-300 mt-6 max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Descubra projetos pelo mundo e conecte-se com missionários em campo.
          </motion.p>
        </div>

        {/* Right Side: Map & Cards */}
        <div className="w-1/2 h-full relative flex items-center justify-center z-10 perspective-[1000px]">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0, rotateY: 15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Globe2 className="w-[40vw] h-[40vw] text-[#0D6F9D] opacity-20" strokeWidth={1} />
          </motion.div>
          
          <motion.div
            className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl w-[30vw] shadow-2xl"
            initial={{ x: 100, opacity: 0, rotateZ: 5 }}
            animate={{ x: 0, opacity: 1, rotateZ: -2 }}
            transition={{ duration: 1.2, delay: 0.9, type: "spring", stiffness: 100, damping: 20 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center border-2 border-white/40">
                 <img src={portraitImg} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="h-5 w-32 bg-white/30 rounded mb-2"></div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#38bdf8]" />
                  <div className="h-3 w-20 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-full bg-white/10 rounded"></div>
              <div className="h-3 w-[80%] bg-white/10 rounded"></div>
              <div className="h-3 w-[90%] bg-white/10 rounded"></div>
            </div>
          </motion.div>

          {/* Search Icon floating */}
          <motion.div
            className="absolute bottom-1/4 -left-10 bg-[#38bdf8] p-4 rounded-2xl shadow-xl shadow-cyan-500/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4, type: "spring", stiffness: 200, damping: 15 }}
          >
            <Search className="w-10 h-10 text-slate-900" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
