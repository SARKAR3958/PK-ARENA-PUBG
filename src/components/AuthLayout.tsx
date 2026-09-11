import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { GoldenParticlesBg } from './GoldenParticlesBg';
import { PK_LOGO_IMAGE, LSBG_IMAGE } from '../lib/assets';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="relative min-h-screen w-full bg-[#080808] flex flex-col justify-center items-center p-4 sm:p-6 overflow-x-hidden font-sans select-none">
      {/* 100% Full-Screen Edge-to-Edge Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={LSBG_IMAGE} 
          alt="Battleground Background" 
          className="w-full h-full object-cover object-center opacity-60 scale-105"
        />
        {/* Gritty tactical dark vignette & gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      <GoldenParticlesBg />

      {/* Centered Auth Card Container */}
      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center my-auto py-6">
        {/* Logo Area */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 pb-6 flex flex-col items-center shrink-0 text-center"
        >
          <div className="text-5xl font-display font-bold leading-none tracking-wider flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-black/70 border-2 border-yellow-500/40 p-1 mb-2.5 shadow-[0_0_25px_rgba(242,201,76,0.3)] overflow-hidden">
              <img 
                src={PK_LOGO_IMAGE} 
                alt="PK ARENA PUBG Logo" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="italic text-yellow-500 text-3xl font-black">PK</span>
              <span className="text-white text-3xl tracking-[0.18em] italic font-black">ARENA</span>
            </div>
          </div>
          <div className="mt-2 text-yellow-500/90 font-display tracking-[0.3em] text-xs font-black">
            PLAY • BATTLE • WIN
          </div>
        </motion.div>

        {/* Form Card Area */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full bg-[#121214]/90 backdrop-blur-md rounded-2xl border border-yellow-500/30 p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative"
        >
          <div className="relative z-10 flex-1 flex flex-col">
            {title && (
              <div className="text-center mb-5">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center justify-center space-x-3">
                  <span className="h-[2px] w-6 bg-gradient-to-r from-transparent to-yellow-500" />
                  <span className="tracking-[0.15em]">{title}</span>
                  <span className="h-[2px] w-6 bg-gradient-to-l from-transparent to-yellow-500" />
                </h2>
                {subtitle && <p className="text-zinc-400 text-xs mt-1.5">{subtitle}</p>}
              </div>
            )}
            
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
