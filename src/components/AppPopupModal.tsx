import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, BellRing, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function AppPopupModal() {
  const {
    popups,
    hasSeenAppOpenPopup,
    setHasSeenAppOpenPopup,
    currentUser,
    isProfileComplete,
    pinModalOpen,
    isPinSetupRequired,
  } = useApp();

  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Active popups list
  const activePopups = useMemo(() => {
    return (popups || []).filter((p) => p.isActive !== false);
  }, [popups]);

  // Handle Home Screen Open & Trigger strictly AFTER security modal / PIN setup is finished
  useEffect(() => {
    // 1. Strictly ONLY show on Home screen (/home)
    if (location.pathname !== '/home') {
      if (isOpen) setIsOpen(false);
      return;
    }

    // 2. If user is not authenticated yet, do not show
    if (!currentUser) {
      if (isOpen) setIsOpen(false);
      return;
    }

    // 3. User must complete onboarding profile first
    if (!isProfileComplete) {
      if (isOpen) setIsOpen(false);
      return;
    }

    // 4. CRITICAL: If Security PIN Setup ("SET SECURITY PIN") or PIN auth modal is active, DO NOT SHOW
    // Wait until security PIN setup is completely finished!
    if (isPinSetupRequired || pinModalOpen) {
      if (isOpen) setIsOpen(false);
      return;
    }

    // 5. If user has already seen all popups in this app session, do not show again
    if (hasSeenAppOpenPopup) {
      return;
    }

    // 6. Ensure we have active popups
    if (activePopups.length === 0) {
      return;
    }

    // Reset index if out of bounds
    if (currentIndex >= activePopups.length) {
      setCurrentIndex(0);
    }

    // Give a smooth 500ms delay after security pin modal closes before presenting the popup
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    activePopups.length,
    location.pathname,
    hasSeenAppOpenPopup,
    currentUser,
    isProfileComplete,
    isPinSetupRequired,
    pinModalOpen,
    currentIndex,
    isOpen,
  ]);

  // Function to move to the next popup or finish all
  const handleNextOrClose = () => {
    if (currentIndex + 1 < activePopups.length) {
      // Show next popup
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished all active popups
      setIsOpen(false);
      setHasSeenAppOpenPopup(true);
    }
  };

  if (typeof document === 'undefined') return null;

  const currentPopup = activePopups[currentIndex] || null;
  const hasMultiple = activePopups.length > 1;
  const isLast = currentIndex >= activePopups.length - 1;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen &&
        currentPopup &&
        location.pathname === '/home' &&
        !isPinSetupRequired &&
        !pinModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop with rich blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleNextOrClose}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl transition-all"
            />

            {/* Modal Container with Gold Glow & Gradient Border */}
            <motion.div
              key={currentPopup.id || currentIndex}
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className="relative w-full max-w-[370px] sm:max-w-md rounded-[28px] p-[1.5px] bg-gradient-to-b from-yellow-400/60 via-amber-500/25 to-yellow-600/50 shadow-[0_0_60px_rgba(234,179,8,0.28),0_25px_50px_rgba(0,0,0,0.9)] z-10 select-none max-h-[92vh] flex flex-col"
            >
              {/* Inner Dark Shell */}
              <div className="relative w-full bg-gradient-to-b from-[#151518] via-[#0d0d10] to-[#08080a] rounded-[26.5px] overflow-hidden flex flex-col">
                {/* Badge for Multiple Popups (e.g. "1 / 3") */}
                {hasMultiple && (
                  <div className="absolute top-3.5 left-3.5 z-30 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/70 border border-yellow-500/30 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[10px] font-black tracking-wider text-yellow-400 uppercase">
                      {currentIndex + 1} / {activePopups.length}
                    </span>
                  </div>
                )}

                {/* Close Button Top Right - advances to next popup or finishes */}
                <button
                  onClick={handleNextOrClose}
                  className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/75 hover:bg-yellow-500 text-white/80 hover:text-black flex items-center justify-center backdrop-blur-md border border-white/20 hover:border-yellow-400 transition-all duration-200 active:scale-90 shadow-lg cursor-pointer"
                  aria-label={isLast ? 'Close' : 'Next'}
                  title={isLast ? 'Close' : 'Next Announcement'}
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* 1. IMAGE (Seamless blended banner) */}
                {currentPopup.imageUrl ? (
                  <div className="relative w-full aspect-[16/9] max-h-56 bg-zinc-950 overflow-hidden shrink-0 border-b border-yellow-500/20">
                    <img
                      src={currentPopup.imageUrl}
                      alt={currentPopup.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {/* Vignette overlays for smooth blend into content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d10] via-transparent to-black/30" />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d10] to-transparent" />
                  </div>
                ) : (
                  /* Glowing Header Icon if no image */
                  <div className="pt-6 pb-1 flex justify-center shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/5 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.25)]">
                      <BellRing className="w-7 h-7 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Content Body: Title, Description, OK Button */}
                <div className="p-5 sm:p-6 flex flex-col text-center space-y-4 overflow-hidden">
                  {/* 2. TITLE */}
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider leading-snug drop-shadow-md break-all sm:break-words [overflow-wrap:anywhere]">
                      {currentPopup.title}
                    </h3>
                    {/* Gold accent line */}
                    <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto opacity-80" />
                  </div>

                  {/* 3. DESCRIPTION (Strictly without any visible scrollbar and proper word wrapping) */}
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 sm:p-4 text-center max-h-56 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed whitespace-pre-line text-center [overflow-wrap:anywhere] [word-break:break-word] break-all sm:break-words">
                      {currentPopup.description}
                    </p>
                  </div>

                  {/* 4. OK / NEXT BUTTON (Premium Golden Esports Button) */}
                  <div className="pt-1 shrink-0">
                    <button
                      onClick={handleNextOrClose}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 text-black font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(234,179,8,0.35)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] active:scale-[0.98] border border-yellow-200/50 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <span>OK</span>
                      {!isLast && <ArrowRight className="w-4 h-4 stroke-[3]" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </AnimatePresence>,
    document.body
  );
}
