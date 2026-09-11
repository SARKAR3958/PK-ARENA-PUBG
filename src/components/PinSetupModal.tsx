import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

export const PinSetupModal = () => {
  const { currentUser, updateUserProfile, forcePinSetup, setForcePinSetup } = useApp();
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [securityColor, setSecurityColor] = useState('');
  const [securitySport, setSecuritySport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Check if admin or on admin route - never show PIN UI for admin
  const isAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
  if (!currentUser || isAdmin || (currentUser.appLockPin && !forcePinSetup)) return null;

  const handleNext = () => {
    if (step === 1) {
      if (pin.length !== 4) {
        toast.error('PIN must be 4 digits');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (confirmPin !== pin) {
        toast.error('PINs do not match');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!securityColor) {
        toast.error('Please select a color');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!securitySport) {
        toast.error('Please select a sport');
        return;
      }
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setConfirmPin('');
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 1 && forcePinSetup) {
      handleCancel();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updateUserProfile({
        appLockPin: pin,
        securityColor,
        securitySport,
        pinAttempts: 5,
        pinLockoutUntil: null
      });
      toast.success('Security PIN set successfully!');
      if (forcePinSetup) setForcePinSetup(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForcePinSetup(false);
    setStep(1);
    setPin('');
    setConfirmPin('');
    setSecurityColor('');
    setSecuritySport('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/95 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative bg-zinc-900 border border-yellow-500/20 p-6 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Top Left Back Icon */}
          {(step > 1 || forcePinSetup) && (
            <button 
              type="button"
              onClick={handleBack}
              className="absolute top-4 left-4 p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-all border border-zinc-700/60 flex items-center justify-center active:scale-95 shadow-lg z-20"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {forcePinSetup && (
            <button 
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors z-20"
              title="Close"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-3 mx-auto border border-yellow-500/20 shadow-inner">
            <Shield className="w-7 h-7 text-yellow-500" />
          </div>
          
          <div className="flex items-center justify-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-3 py-0.5 rounded-full border border-yellow-500/20">
              Step {step} of 4
            </span>
          </div>

          <h2 className="text-lg font-black text-white mb-1.5 text-center uppercase tracking-widest">
            {step === 1 ? 'Set Security PIN' : step === 2 ? 'Confirm PIN' : step === 3 ? 'Security Question 1' : 'Security Question 2'}
          </h2>
          <p className="text-xs text-zinc-400 mb-6 text-center leading-relaxed">
            {step === 1 && 'Set new PIN for security. This PIN will be required when accessing your wallet or joining tournaments.'}
            {step === 2 && 'Please re-enter your 4-digit PIN to verify and confirm.'}
            {step === 3 && 'Choose your favourite color to recover your account if you forget your PIN.'}
            {step === 4 && 'Choose your favourite sport to complete your security recovery questions.'}
          </p>

          <div className="flex-1">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <label className="text-[10px] text-yellow-500 uppercase font-bold mb-2 block tracking-widest text-center">Create 4-Digit PIN</label>
                <input 
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  maxLength={4}
                  placeholder="0000"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-4 text-center text-3xl tracking-[1em] text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <label className="text-[10px] text-yellow-500 uppercase font-bold mb-2 block tracking-widest text-center">Confirm PIN</label>
                <input 
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  maxLength={4}
                  placeholder="0000"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-4 text-center text-3xl tracking-[1em] text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-yellow-500/10 p-3 rounded-xl mb-4 border border-yellow-500/20">
                  <p className="text-[10px] text-yellow-500 font-bold leading-relaxed">
                    This will help you if you forget your PIN. Remember what you enter.
                  </p>
                </div>
                <label className="text-xs text-white font-bold mb-3 block text-center">First, select your favourite color:</label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSecurityColor(color.name)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${securityColor === color.name ? 'border-yellow-500 bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="w-8 h-8 rounded-full mb-1 border border-zinc-700 shadow-inner" style={{ backgroundColor: color.hex }} />
                      <span className="text-[9px] font-bold text-zinc-300">{color.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-yellow-500/10 p-3 rounded-xl mb-4 border border-yellow-500/20">
                  <p className="text-[10px] text-yellow-500 font-bold leading-relaxed">
                    This will help you if you forget your PIN. Remember what you enter.
                  </p>
                </div>
                <label className="text-xs text-white font-bold mb-3 block text-center">Last question, select your favourite sports:</label>
                <div className="space-y-2">
                  {sports.map(sport => (
                    <button
                      key={sport}
                      onClick={() => setSecuritySport(sport)}
                      className={`w-full py-3 px-4 rounded-xl border transition-all text-sm font-bold uppercase tracking-wider ${securitySport === sport ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <button 
            onClick={handleNext}
            disabled={isSubmitting || (step === 1 && pin.length !== 4) || (step === 2 && confirmPin.length !== 4)}
            className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest shadow-lg flex items-center justify-center mt-8 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'SAVING...' : step === 4 ? 'COMPLETE SETUP' : 'CONTINUE'}
            {!isSubmitting && <ChevronRight className="w-5 h-5 ml-1" />}
          </button>
          
          {/* Step indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-yellow-500' : s < step ? 'w-2 bg-yellow-500/50' : 'w-2 bg-zinc-800'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
