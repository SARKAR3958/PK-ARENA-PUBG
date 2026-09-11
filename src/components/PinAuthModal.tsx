import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, AlertTriangle, Delete, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ref, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { playWrongPinSound, playPinSuccessSound, playButtonClickSound } from '../lib/sound';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: (success: boolean) => void;
  title?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({ isOpen, onClose, title = "Enter PIN to Continue" }) => {
  const { currentUser, updateUserProfile } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>('');

  const calcCountdown = (targetTime: number) => {
    const remaining = Math.max(0, targetTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!lockedUntil) {
      setCountdownStr('');
      return;
    }
    setCountdownStr(calcCountdown(lockedUntil));
    const interval = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttemptsLeft(5);
        setCountdownStr('');
        updateUserProfile({ pinAttempts: 5, pinLockoutUntil: null, pinLastFailedAt: null });
      } else {
        setCountdownStr(calcCountdown(lockedUntil));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setPin('');
      setError(false);
      setShowForgot(false);
      setForgotStep(1);
      
      let savedAttempts = currentUser.pinAttempts !== undefined ? currentUser.pinAttempts : 5;
      
      // Auto-reset failed attempts after 5 minutes of inactivity
      if (currentUser.pinLastFailedAt && savedAttempts < 5) {
        const lastFailedTime = new Date(currentUser.pinLastFailedAt).getTime();
        if (Date.now() - lastFailedTime >= 5 * 60 * 1000) {
          savedAttempts = 5;
          updateUserProfile({ pinAttempts: 5, pinLastFailedAt: null });
        }
      }
      setAttemptsLeft(savedAttempts);
      
      if (currentUser.pinLockoutUntil) {
        let lockoutTime = new Date(currentUser.pinLockoutUntil).getTime();
        // If previous lockout exceeded 5 minutes (legacy), cap it to at most 5 minutes from now
        if (lockoutTime - Date.now() > 5 * 60 * 1000) {
          lockoutTime = Date.now() + 5 * 60 * 1000;
          updateUserProfile({ pinLockoutUntil: new Date(lockoutTime).toISOString() });
        }

        if (lockoutTime > Date.now()) {
          setLockedUntil(lockoutTime);
          setCountdownStr(calcCountdown(lockoutTime));
        } else {
          // Lockout expired, reset attempts
          setLockedUntil(null);
          setAttemptsLeft(5);
          updateUserProfile({ pinAttempts: 5, pinLockoutUntil: null, pinLastFailedAt: null });
        }
      } else {
        setLockedUntil(null);
      }
    }
  }, [isOpen, currentUser]);

  const handleKeyPress = (num: string) => {
    if (lockedUntil && lockedUntil > Date.now()) return;
    
    playButtonClickSound();

    // If there was an error showing, typing a new digit starts fresh immediately
    if (error) {
      setError(false);
      setPin(num);
      return;
    }

    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    playButtonClickSound();
    if (error) {
      setError(false);
      setPin('');
      return;
    }
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === currentUser?.appLockPin) {
      // Instant success - play chime, reset pin & close modal immediately
      playPinSuccessSound();
      setPin('');
      onClose(true);
      updateUserProfile({ pinAttempts: 5, pinLockoutUntil: null, pinLastFailedAt: null }).catch(console.error);
    } else {
      // Wrong PIN entered: trigger error buzzer sound & visual shake
      playWrongPinSound();
      setError(true);
      // Instant reset of PIN so user can immediately type the next digit without lag
      setPin('');
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      const nowIso = new Date().toISOString();
      
      if (newAttempts <= 0) {
        const lockoutDurationMs = 5 * 60 * 1000; // 5 minutes reset time
        const lockoutTimeMs = Date.now() + lockoutDurationMs;
        const lockoutTime = new Date(lockoutTimeMs).toISOString();
        updateUserProfile({ 
          pinAttempts: 0, 
          pinLockoutUntil: lockoutTime,
          pinLastFailedAt: nowIso
        }).catch(console.error);
        setLockedUntil(lockoutTimeMs);
        setCountdownStr(calcCountdown(lockoutTimeMs));
        toast.error('Attempts limit reached! Keypad locked for 5 minutes.');
      } else {
        updateUserProfile({ 
          pinAttempts: newAttempts,
          pinLastFailedAt: nowIso
        }).catch(console.error);
        toast.error(`Wrong PIN. ${newAttempts} attempts left.`);
      }
    }
  };

  // Physical keyboard listener for instant typing on PC/Keyboard
  useEffect(() => {
    if (!isOpen || showForgot || isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showForgot, pin, error, lockedUntil, attemptsLeft]);

  const colors = [
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Orange', hex: '#f97316' }
  ];

  const sports = ['Cricket', 'Football', 'Hockey', 'Racket'];

  const handleForgotNext = () => {
    if (forgotStep === 1) {
      if (!selectedColor) return;
      setForgotStep(2);
    } else if (forgotStep === 2) {
      if (!selectedSport) return;
      
      const isCorrect = 
        Boolean(currentUser?.securityColor && currentUser?.securitySport) &&
        selectedColor.toLowerCase() === currentUser?.securityColor?.toLowerCase() &&
        selectedSport.toLowerCase() === currentUser?.securitySport?.toLowerCase();

      if (!isCorrect) {
        playWrongPinSound();
        toast.error('Incorrect security selection! Answers do not match. Selections reset.');
        // Reset selections so user can retry security questions
        setSelectedColor('');
        setSelectedSport('');
        setForgotStep(1);
        return;
      }

      toast.success('Security answers verified!');
      setForgotStep(3);
    }
  };

  const resetForgotState = () => {
    setSelectedColor('');
    setSelectedSport('');
    setResetReason('');
    setForgotStep(1);
  };

  const submitResetRequest = async () => {
    const isCorrect = 
      Boolean(currentUser?.securityColor && currentUser?.securitySport) &&
      selectedColor.toLowerCase() === currentUser?.securityColor?.toLowerCase() &&
      selectedSport.toLowerCase() === currentUser?.securitySport?.toLowerCase();

    if (!isCorrect) {
      playWrongPinSound();
      toast.error('Incorrect security selection! Answers do not match. Selections reset.');
      resetForgotState();
      return;
    }

    if (!resetReason.trim()) {
      toast.error('Please enter a reason for the reset request');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userAgent = navigator.userAgent;
      let detectedDevice = 'Browser';
      if (/android/i.test(userAgent)) detectedDevice = 'Android';
      else if (/iPhone/i.test(userAgent)) detectedDevice = 'iPhone (iOS)';
      else if (/iPad/i.test(userAgent)) detectedDevice = 'iPad (iOS)';
      else if (/Windows/i.test(userAgent)) detectedDevice = 'Windows PC';
      else if (/Macintosh|Mac OS/i.test(userAgent)) detectedDevice = 'Mac';
      else if (/Linux/i.test(userAgent)) detectedDevice = 'Linux';

      const requestRef = push(ref(db, 'pinResetRequests'));
      await set(requestRef, {
        id: requestRef.key,
        userId: currentUser?.uid,
        username: currentUser?.username || 'Unknown',
        email: currentUser?.email || 'N/A',
        phone: currentUser?.phone || 'N/A',
        currentPin: currentUser?.appLockPin || 'N/A',
        device: detectedDevice,
        deviceName: userAgent,
        securityColor: selectedColor,
        securitySport: selectedSport,
        reason: resetReason.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      
      toast.success('Reset request sent to admin. Please wait for approval.');
      resetForgotState();
      setShowForgot(false);
      onClose(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Never show PIN authentication for admin or on admin route
  const isAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
  if (!isOpen || isAdmin) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => onClose(false)}
        />
        
        {showForgot ? (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-zinc-900 border border-yellow-500/20 p-6 rounded-3xl w-full max-w-sm flex flex-col items-center shadow-2xl"
          >
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
            
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                Step {forgotStep} of 3
              </span>
              <button 
                onClick={resetForgotState} 
                className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-wider"
              >
                Reset Selections
              </button>
            </div>
            
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest text-center">Forgot PIN</h2>
            
            {forgotStep === 1 && (
              <div className="w-full">
                <label className="text-xs text-zinc-300 font-bold mb-4 block text-center">
                  1. Select your registered favourite color:
                </label>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {colors.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${selectedColor === c.name ? 'border-yellow-500 bg-yellow-500/10 scale-105 shadow-[0_0_12px_rgba(234,179,8,0.2)]' : 'border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="w-8 h-8 rounded-full mb-1 border border-zinc-700 shadow" style={{ backgroundColor: c.hex }} />
                      <span className="text-[9px] font-bold text-zinc-300">{c.name}</span>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleForgotNext} 
                  disabled={!selectedColor} 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:bg-yellow-500"
                >
                  NEXT: SELECT SPORT
                </button>
              </div>
            )}

            {forgotStep === 2 && (
              <div className="w-full">
                <label className="text-xs text-zinc-300 font-bold mb-4 block text-center">
                  2. Select your registered favourite sport:
                </label>
                <div className="space-y-2 mb-6">
                  {sports.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSport(s)}
                      className={`w-full py-3 rounded-xl border font-bold uppercase transition-all ${selectedSport === s ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.15)]' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setForgotStep(1)} 
                    className="w-1/3 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleForgotNext} 
                    disabled={!selectedSport} 
                    className="w-2/3 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:bg-yellow-500"
                  >
                    VERIFY ANSWERS
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 3 && (
              <div className="w-full">
                <div className="bg-emerald-500/10 p-3 rounded-xl mb-4 border border-emerald-500/20 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-wider mb-1">
                    <Check size={16} /> Security Answers Verified
                  </div>
                  <p className="text-[10px] text-zinc-400">Color & sport matched your account. State your problem to send reset request to admin.</p>
                </div>
                <textarea 
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Explain why you need PIN reset..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-yellow-500 focus:outline-none min-h-[90px] mb-4"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setForgotStep(2)} 
                    className="w-1/3 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={submitResetRequest} 
                    disabled={isSubmitting || !resetReason.trim()} 
                    className="w-2/3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                  >
                    {isSubmitting ? 'SENDING...' : 'SEND REQUEST'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl w-full max-w-[310px] flex flex-col items-center shadow-2xl"
          >
            <button 
              type="button"
              onClick={() => onClose(false)}
              className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-2.5 border border-yellow-500/20">
              <Lock size={22} className="text-yellow-500" />
            </div>
            
            <h2 className="text-base font-black text-white mb-0.5 text-center uppercase tracking-wider">{title}</h2>
            
            {lockedUntil && lockedUntil > Date.now() ? (
              <div className="mb-4 flex flex-col items-center">
                <p className="text-xs text-red-500 font-bold text-center mb-1">
                  Locked
                </p>
                <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg border border-red-500/20 font-black tracking-widest text-sm font-mono">
                  {countdownStr || '05:00'}
                </div>
                <p className="text-[9px] text-zinc-500 mt-1.5 font-medium">
                  Attempts will reset in 5 minutes
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 mb-3 text-center font-medium">
                Enter your 4-digit security PIN
              </p>
            )}
            
            {/* PIN Display with instant responsive dots & shake on error */}
            <motion.div 
              animate={error ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.25 }}
              className="flex gap-3 mb-3.5"
            >
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    i < pin.length 
                      ? error 
                        ? 'bg-red-500 scale-110 shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                        : 'bg-yellow-500 scale-110 shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                      : 'bg-zinc-800 border border-zinc-700/50'
                  }`}
                />
              ))}
            </motion.div>

            {/* Compact, Ultra-Fast Responsive Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  data-sound="none"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleKeyPress(num.toString());
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                  disabled={!!(lockedUntil && lockedUntil > Date.now())}
                  className="h-11 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 active:bg-yellow-500/20 active:border-yellow-500/40 border border-zinc-700/40 flex items-center justify-center text-xl font-black text-white transition-all active:scale-95 touch-manipulation select-none disabled:opacity-40 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                data-sound="none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  resetForgotState();
                  setShowForgot(true);
                }}
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="h-11 rounded-xl flex items-center justify-center text-zinc-400 font-bold uppercase text-[9px] tracking-wider hover:text-yellow-400 active:scale-95 transition-all touch-manipulation select-none cursor-pointer"
              >
                FORGOT
              </button>
              
              <button
                type="button"
                data-sound="none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleKeyPress('0');
                }}
                onClick={(e) => {
                  e.preventDefault();
                }}
                disabled={!!(lockedUntil && lockedUntil > Date.now())}
                className="h-11 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 active:bg-yellow-500/20 active:border-yellow-500/40 border border-zinc-700/40 flex items-center justify-center text-xl font-black text-white transition-all active:scale-95 touch-manipulation select-none disabled:opacity-40 cursor-pointer"
              >
                0
              </button>
              
              <button
                type="button"
                data-sound="none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white active:bg-zinc-800 active:scale-95 transition-all touch-manipulation select-none cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center w-full">
              Attempts Left: <span className={attemptsLeft <= 2 ? 'text-red-500 font-black' : 'text-yellow-500 font-black'}>{attemptsLeft}</span>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
