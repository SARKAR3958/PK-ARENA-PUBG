import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { GoldenParticlesBg } from './GoldenParticlesBg';
import { PK_LOGO_IMAGE, LSBG_IMAGE } from '../lib/assets';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode, title?: string, subtitle?: string }) {
  return (
    <div className="flex justify-center min-h-screen bg-black sm:py-4 relative overflow-hidden">
      {/* Ambient background for desktop / wide displays */}
      <div className="fixed inset-0 z-0 pointer-events-none hidden sm:block">
        <img 
          src={LSBG_IMAGE} 
          alt="Background Backdrop" 
          className="w-full h-full object-cover opacity-25 filter blur-xs"
        />
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      </div>

      <div className="w-full max-w-[360px] h-[100dvh] sm:h-[90vh] bg-zinc-950 sm:rounded-[30px] sm:border-[6px] border-zinc-800 shadow-2xl relative flex flex-col font-sans overflow-x-hidden overflow-y-auto scrollbar-hide z-10">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src={LSBG_IMAGE} 
            alt="Background" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/80 to-zinc-950" />
          <div className="absolute inset-0 bg-zinc-950/20" />
        </div>
        
        <GoldenParticlesBg />

        {/* Logo Area */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 pt-12 pb-4 flex flex-col items-center shrink-0"
        >
          <div className="text-5xl font-display font-bold leading-none tracking-wider text-gradient flex flex-col items-center">
            <img 
              src={PK_LOGO_IMAGE} 
              alt="PK ARENA PUBG Logo" 
              className="w-20 h-20 object-contain mb-2 rounded-full border-2 border-yellow-500/30 bg-black/60 p-1 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            />
            <span className="-mb-2 italic text-yellow-500">PK</span>
            <span className="text-white text-4xl tracking-[0.2em] italic">ARENA</span>
          </div>
          <div className="mt-2 text-yellow-500 font-display tracking-[0.3em] text-xs italic font-medium">PLAY. BATTLE. WIN.</div>
        </motion.div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col px-4 pb-6 w-full">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#141414] rounded-[20px] border border-yellow-500/30 p-5 flex flex-col relative"
          >
            
            <div className="relative z-10 flex-1 flex flex-col">
              {title && (
                <div className="text-center mb-5">
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center justify-center space-x-3">
                    <span className="h-[2px] w-5 bg-yellow-500" />
                    <span>{title}</span>
                    <span className="h-[2px] w-5 bg-yellow-500" />
                  </h2>
                  {subtitle && <p className="text-zinc-400 text-xs mt-1">{subtitle}</p>}
                </div>
              )}
              
              {children}
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
