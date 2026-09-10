import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const { appSettings } = useApp();

  const handleContactAdmin = () => {
    const supportNumber = appSettings?.supportNumber || '+923014022425';
    const message = encodeURIComponent("Hi Admin I Am User Of PK ARENA PUBG I Forgot my password Please help me");
    window.open(`https://wa.me/${supportNumber.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-zinc-900 border border-yellow-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl"
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                Password Recovery
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                To ensure account security, password resets are handled directly by our support team. Please contact the Admin via WhatsApp to recover your password.
              </p>

              <button
                onClick={handleContactAdmin}
                className="w-full py-4 bg-yellow-500 text-black font-bold uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-colors"
              >
                Contact Admin
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
