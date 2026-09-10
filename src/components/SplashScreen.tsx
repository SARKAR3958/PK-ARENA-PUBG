import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PK_LOGO_IMAGE } from '../lib/assets';

interface SplashScreenProps {
  isLoading: boolean;
}

const APP_LOGO = PK_LOGO_IMAGE;

export const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-yellow-500/10 blur-[120px] rounded-full" />
          </div>

          {/* Logo Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut",
              delay: 0.2
            }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
              <img 
                src={APP_LOGO} 
                alt="PKARENA PUBG Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Spinning ring around logo */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 border border-dashed border-yellow-500/20 rounded-full"
            />
          </motion.div>

          {/* App Name & Loading Indicator */}
          <div className="mt-8 flex flex-col items-center">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-black text-white tracking-[0.2em] uppercase mb-2"
            >
              PKARENA PUBG
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-bold text-yellow-500 tracking-widest uppercase mb-6"
            >
              PLAY • COMPETE • WIN
            </motion.p>
            
            <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_rgba(234,179,8,0.5)]"
              />
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-xs text-zinc-500 font-medium tracking-widest uppercase"
            >
              Initializing Secure Session
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
