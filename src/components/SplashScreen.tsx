import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import lottie from 'lottie-web';
import runLoadingData from '../assets/run-loading.json';
import { PK_LOGO_IMAGE } from '../lib/assets';

interface SplashScreenProps {
  isLoading: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading }) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [progress, setProgress] = useState(5);
  const [statusText, setStatusText] = useState('LOADING TOURNAMENT DATA...');
  const lottieContainerRef = useRef<HTMLDivElement>(null);

  // 5 seconds progress loop
  useEffect(() => {
    const startTime = Date.now();
    const duration = 5000; // 5 seconds

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.max(5, Math.round((elapsed / duration) * 100)));
      setProgress(currentProgress);

      if (currentProgress < 30) {
        setStatusText('CONNECTING TO BATTLEGROUNDS...');
      } else if (currentProgress < 70) {
        setStatusText('LOADING TOURNAMENT DATA...');
      } else if (currentProgress < 95) {
        setStatusText('SYNCING ESPORTS PROTOCOLS...');
      } else {
        setStatusText('READY TO DROP...');
      }

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        setMinTimeElapsed(true);
      }
    }, 40);

    return () => clearInterval(progressInterval);
  }, []);

  // Lottie Animation Initializer
  useEffect(() => {
    if (!lottieContainerRef.current) return;
    
    const anim = lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: runLoadingData,
    });

    return () => {
      anim.destroy();
    };
  }, []);

  const showSplash = isLoading || !minTimeElapsed;

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] bg-[#050505] flex flex-col justify-between items-center px-6 py-8 select-none overflow-hidden font-sans"
        >
          {/* Background Battlefield & Lighting Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Splash Background with balanced visibility & blackish tactical atmosphere */}
            <img 
              src="/splash-bg.png" 
              alt="Splash Background" 
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-30"
            />
            
            {/* Blackish tactical vignette & shadow gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/85" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.8)_100%)]" />

            {/* Diagonal Golden Streak Corner Flares */}
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-gradient-to-br from-yellow-500/20 via-yellow-600/5 to-transparent rotate-45 blur-xl" />
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-bl from-yellow-500/20 via-yellow-600/5 to-transparent -rotate-45 blur-xl" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-gradient-to-tr from-yellow-500/25 via-yellow-600/5 to-transparent -rotate-45 blur-xl" />
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-gradient-to-tl from-yellow-500/25 via-yellow-600/5 to-transparent rotate-45 blur-xl" />

            {/* Center Core Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-yellow-500/15 blur-[120px] rounded-full pointer-events-none" />
          </div>

          {/* 1. Top Section: WELCOME */}
          <div className="relative z-10 w-full flex items-center justify-center gap-3 pt-2">
            <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-yellow-500/80" />
            <span className="text-xs sm:text-sm font-black tracking-[0.35em] text-zinc-200 uppercase drop-shadow whitespace-nowrap">
              WELCOME
            </span>
            <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-yellow-500/80" />
          </div>

          {/* 2. Center Branding: Logo Card + PKARENA PUBG + Slogan */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-sm">
            {/* Glowing Logo Card Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative mb-6"
            >
              {/* Outer Golden Neon Glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 rounded-[28px] blur-md opacity-80 animate-pulse" />
              
              {/* Logo Frame */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-[24px] p-[2px] bg-gradient-to-b from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                <div className="w-full h-full rounded-[22px] overflow-hidden bg-black flex items-center justify-center">
                  <img 
                    src={PK_LOGO_IMAGE} 
                    alt="PK Arena PUBG" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* PKARENA Brand Text */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center w-full"
            >
              {/* Main Title: PK (Gold) + ARENA (Metallic White) */}
              <h1 className="text-4xl sm:text-5xl font-black tracking-wider uppercase leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
                <span className="bg-gradient-to-b from-[#FFF275] via-[#F2C94C] to-[#C99700] bg-clip-text text-transparent italic pr-0.5">
                  PK
                </span>
                <span className="bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  ARENA
                </span>
              </h1>

              {/* Middle PUBG with Horizontal Lines */}
              <div className="mt-2.5 flex items-center justify-center gap-3">
                <div className="h-[2px] w-12 sm:w-16 bg-gradient-to-r from-transparent via-yellow-500 to-yellow-500" />
                <span className="text-xl sm:text-2xl font-black tracking-[0.25em] text-[#F2C94C] drop-shadow-[0_2px_8px_rgba(242,201,76,0.4)]">
                  PUBG
                </span>
                <div className="h-[2px] w-12 sm:w-16 bg-gradient-to-l from-transparent via-yellow-500 to-yellow-500" />
              </div>

              {/* Sub-slogan: DROP • FIGHT • EARN */}
              <div className="mt-2 flex items-center justify-center">
                <p className="text-xs sm:text-[13px] font-black tracking-[0.35em] text-[#F2C94C] uppercase drop-shadow">
                  DROP &bull; FIGHT &bull; EARN
                </p>
              </div>
            </motion.div>
          </div>

          {/* 3. Bottom Section: Character Running Animation + Progress Bar + Loading Text */}
          <div className="relative z-10 w-full max-w-sm flex flex-col items-center pb-4">
            {/* Lottie Running Animation (Enlarged & Centered, Running towards the RIGHT) */}
            <div className="relative w-full flex items-center justify-center -mb-3 sm:-mb-4 overflow-visible">
              <div 
                ref={lottieContainerRef}
                className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center pointer-events-none scale-125 sm:scale-140"
                style={{ transform: 'scaleX(-1) scale(1.35)' }} // Flipped horizontally & scaled up for clear large visibility
              />
            </div>

            {/* Glowing Striped Loading Bar (Matching Image) */}
            <div className="w-full h-4 sm:h-4.5 bg-black/90 border-2 border-[#F2C94C] rounded-full p-[2px] shadow-[0_0_20px_rgba(242,201,76,0.45)] overflow-hidden relative">
              <motion.div 
                className="h-full rounded-full transition-all duration-100 ease-out relative overflow-hidden"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #E5A910 0%, #FDE047 50%, #F2C94C 100%)'
                }}
              >
                {/* Diagonal Tactical Stripes Overlay */}
                <div 
                  className="absolute inset-0 opacity-40 w-full h-full"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 6px, transparent 6px, transparent 12px)'
                  }}
                />
              </motion.div>
            </div>

            {/* Status Text & "PK ARENA x PUBG" */}
            <div className="mt-3.5 text-center flex flex-col items-center">
              <span className="text-xs sm:text-[13px] font-black tracking-[0.2em] text-zinc-100 uppercase">
                LOADING PLEASE WAIT...
              </span>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <span className="text-yellow-500/60 font-bold">—</span>
                <span className="text-xs sm:text-[13px] font-black not-italic tracking-[0.22em] text-[#F2C94C] uppercase">
                  PK ARENA x PUBG
                </span>
                <span className="text-yellow-500/60 font-bold">—</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
