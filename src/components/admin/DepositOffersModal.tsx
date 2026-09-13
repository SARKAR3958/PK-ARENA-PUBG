import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Plus, Trash2, Sparkles, AlertCircle, Check } from 'lucide-react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { db } from '../../lib/firebase';
import { PK_COIN_ICON } from '../../lib/assets';
import { toast } from 'react-hot-toast';

export interface DepositOffer {
  id: string;
  coins: number;
  bonus: number;
  createdAt: number;
}

interface DepositOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositOffersModal({ isOpen, onClose }: DepositOffersModalProps) {
  const [offers, setOffers] = useState<DepositOffer[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [coinsInput, setCoinsInput] = useState('');
  const [bonusInput, setBonusInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Listen to deposit offers list
    const offersRef = ref(db, 'depositOffers');
    const unsubOffers = onValue(offersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: DepositOffer[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          coins: Number(val.coins) || 0,
          bonus: Number(val.bonus) || 0,
          createdAt: val.createdAt || Date.now(),
        }));
        list.sort((a, b) => a.coins - b.coins);
        setOffers(list);
      } else {
        setOffers([]);
      }
      setLoading(false);
    });

    // Listen to enabled toggle status
    const settingsRef = ref(db, 'appSettings/depositOffersEnabled');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      setIsEnabled(Boolean(snapshot.val()));
    });

    return () => {
      unsubOffers();
      unsubSettings();
    };
  }, [isOpen]);

  const handleToggleOfferStatus = async (checked: boolean) => {
    try {
      await update(ref(db, 'appSettings'), {
        depositOffersEnabled: checked,
      });
      setIsEnabled(checked);
      toast.success(checked ? 'Deposit offers enabled for users!' : 'Deposit offers disabled (hidden from user wallet)');
    } catch (err: any) {
      console.error('Failed to update toggle:', err);
      toast.error('Failed to update offer status');
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const coinsNum = Number(coinsInput);
    const bonusNum = Number(bonusInput);

    if (!coinsNum || coinsNum <= 0) {
      return toast.error('Please enter a valid coins amount');
    }
    if (isNaN(bonusNum) || bonusNum <= 0) {
      return toast.error('Please enter a valid bonus amount');
    }

    setIsSaving(true);
    try {
      const newOfferRef = push(ref(db, 'depositOffers'));
      await set(newOfferRef, {
        coins: coinsNum,
        bonus: bonusNum,
        createdAt: Date.now(),
      });

      // Auto enable if it's the first offer and currently disabled
      if (!isEnabled) {
        await update(ref(db, 'appSettings'), {
          depositOffersEnabled: true,
        });
      }

      toast.success(`Offer added: ${coinsNum} Coins + ${bonusNum} Bonus!`);
      setCoinsInput('');
      setBonusInput('');
    } catch (err: any) {
      console.error('Failed to add offer:', err);
      toast.error('Failed to add deposit offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await remove(ref(db, `depositOffers/${offerId}`));
      toast.success('Offer removed successfully');
    } catch (err: any) {
      console.error('Failed to delete offer:', err);
      toast.error('Failed to delete offer');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-[460px] max-h-[90vh] bg-zinc-950 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
        >
          {/* Top Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                <Gift className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Deposit Offers Management
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">Configure bonus offers for user deposits</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {/* Master Toggle */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wide">
                    Deposit Offers Status
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {isEnabled ? 'Users can view & claim these offers in their wallet' : 'Offers are completely hidden in user wallet'}
                  </div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleToggleOfferStatus(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {/* Add New Offer Form */}
            <form onSubmit={handleAddOffer} className="bg-zinc-900/60 border border-yellow-500/20 p-4 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-yellow-500" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Add New Deposit Offer
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Deposit Coins
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={coinsInput}
                      onChange={(e) => setCoinsInput(e.target.value)}
                      placeholder="e.g. 100"
                      min="1"
                      className="w-full bg-black/80 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none transition-colors"
                    />
                    <img src={PK_COIN_ICON} alt="Coins" className="w-4 h-4 object-contain absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                    Bonus Coins
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bonusInput}
                      onChange={(e) => setBonusInput(e.target.value)}
                      placeholder="e.g. 10"
                      min="1"
                      className="w-full bg-black/80 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-bold text-yellow-400 outline-none transition-colors"
                    />
                    <Gift className="w-4 h-4 text-yellow-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {coinsInput && bonusInput && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl text-[11px] text-yellow-400 flex items-center justify-between">
                  <span>Preview:</span>
                  <span className="font-bold">
                    Deposit {coinsInput} Coins → Get +{bonusInput} Bonus (Total: {Number(coinsInput) + Number(bonusInput)} Coins)
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving || !coinsInput.trim() || !bonusInput.trim()}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                <Plus className="w-4 h-4" />
                <span>{isSaving ? 'Adding Offer...' : 'Save & Add Offer'}</span>
              </button>
            </form>

            {/* Existing Active Offers List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Active Offers ({offers.length})
                </h4>
                <span className="text-[10px] text-zinc-500 font-medium">Sorted by coins</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-500">Loading offers...</div>
              ) : offers.length === 0 ? (
                <div className="py-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-2 p-4">
                  <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-medium">No deposit offers added yet</p>
                  <p className="text-[10px] text-zinc-600">Add an offer above (e.g. 100 Coins + 10 Bonus) to show it to users</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-zinc-900/80 border border-zinc-800/90 hover:border-yellow-500/30 p-3 rounded-2xl flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex flex-col items-center justify-center p-1 shadow-sm">
                          <img src={PK_COIN_ICON} alt="Coin" className="w-4 h-4 object-contain drop-shadow-[0_0_4px_rgba(234,179,8,0.4)] mb-0.5" />
                          <span className="text-[9px] font-black text-yellow-500 leading-none">{offer.coins}</span>
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{offer.coins} COINS</span>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              +{offer.bonus} BONUS
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            Total Coins: <span className="text-yellow-400 font-bold">{offer.coins + offer.bonus}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              Done / Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
