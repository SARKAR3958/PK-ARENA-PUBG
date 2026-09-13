import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Sparkles, Coins, ArrowRight, ShieldCheck } from 'lucide-react';
import { PK_COIN_ICON } from '../lib/assets';

export interface DepositOffer {
  id: string;
  coins: number;
  bonus: number;
  createdAt: number;
}

interface DepositOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  offers: DepositOffer[];
  onSelectOffer?: (coins: number) => void;
}

export function DepositOffersModal({ isOpen, onClose, offers, onSelectOffer }: DepositOffersModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-[380px] max-h-[85vh] bg-zinc-950 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                <Gift className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Deposit Offers
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">Claim extra coins on your deposit</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide max-h-[58vh]">
            {/* Promo banner */}
            <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-2xl p-3.5 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-yellow-400 uppercase tracking-wide">
                  Special Deposit Deals
                </h4>
                <p className="text-[10px] text-zinc-300 leading-tight mt-0.5">
                  Deposit the specified amount below and get instant free bonus coins directly added to your balance!
                </p>
              </div>
            </div>

            {/* Offers list */}
            {offers.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                No active deposit offers at this time.
              </div>
            ) : (
              <div className="space-y-2.5">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-gradient-to-br from-zinc-900/90 to-black border border-zinc-800/90 hover:border-yellow-500/40 p-3.5 rounded-2xl transition-all shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-xl pointer-events-none rounded-full" />
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <img src={PK_COIN_ICON} alt="Coin" className="w-5 h-5 object-contain" />
                        <span className="text-base font-black text-white tracking-tight">
                          {offer.coins.toLocaleString()} COINS
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-yellow-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm">
                        +{offer.bonus} BONUS
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                      <div className="text-[11px] text-zinc-400">
                        Total You Receive: <span className="text-yellow-400 font-black text-xs">{(offer.coins + offer.bonus).toLocaleString()} Coins</span>
                      </div>
                      
                      {onSelectOffer && (
                        <button
                          onClick={() => {
                            onSelectOffer(offer.coins);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                        >
                          <span>Select</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-xl flex items-center gap-2 text-[10px] text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Bonus coins are credited automatically upon deposit approval.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 flex justify-end">
            <button
              onClick={onClose}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
