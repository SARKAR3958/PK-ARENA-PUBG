import { useState, useEffect, useMemo, SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, Info, AlertTriangle, CheckCircle2, Circle, ChevronRight, Edit2, Clock, X, Trophy, Gift, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { LottiePlayer } from '../components/LottiePlayer';
import { useApp } from '../context/AppContext';
import { ref, get, update, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { PK_COIN_ICON, EASYPAISA_LOGO, JAZZCASH_LOGO, SADAPAY_LOGO, NAYAPAY_LOGO, PK_LOGO_IMAGE } from '../lib/assets';
import { DepositOffersModal, DepositOffer } from '../components/DepositOffersModal';
import { playErrorSound, playDepositSuccessSound, playWithdrawSuccessSound } from '../lib/sound';
import successConfetti from '../assets/success-confetti.json';
import pendingClock from '../assets/pending-clock.json';

export function Wallet() {
  const { currentUser, transactions, addTransaction, paymentSettings, t, requirePinAuth, updateUserProfile } = useApp();
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'PROMO'>('DEPOSIT');
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay'>('easypaisa');
  const [amount, setAmount] = useState('');
  const [withdrawTitle, setWithdrawTitle] = useState('');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [showPromoSuccessModal, setShowPromoSuccessModal] = useState(false);
  const [promoReward, setPromoReward] = useState(0);
  const [showDepositSuccessModal, setShowDepositSuccessModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositOffers, setDepositOffers] = useState<DepositOffer[]>([]);
  const [depositOffersEnabled, setDepositOffersEnabled] = useState(false);
  const [showDepositOffersModal, setShowDepositOffersModal] = useState(false);

  // Listen to deposit offers & enabled toggle
  useEffect(() => {
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
        setDepositOffers(list);
      } else {
        setDepositOffers([]);
      }
    });

    const settingsRef = ref(db, 'appSettings/depositOffersEnabled');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      setDepositOffersEnabled(Boolean(snapshot.val()));
    });

    return () => {
      unsubOffers();
      unsubSettings();
    };
  }, []);

  // Success Confetti Lottie Data (Commonly used confetti)
  const [confettiData, setConfettiData] = useState<any>(null);

  useEffect(() => {
    if (successConfetti) {
      setConfettiData(successConfetti);
    }
  }, []);

  const logos = {
    easypaisa: EASYPAISA_LOGO,
    jazzcash: JAZZCASH_LOGO,
    sadapay: SADAPAY_LOGO,
    nayapay: NAYAPAY_LOGO
  };

  // Cache payment logos in localStorage to prevent reload flicker on APK / Vercel
  useEffect(() => {
    if (paymentSettings) {
      const cache: Record<string, string> = {};
      ['easypaisa', 'jazzcash', 'sadapay', 'nayapay'].forEach(key => {
        const custom = paymentSettings[`${key}Logo`];
        if (custom) cache[key] = custom;
      });
      try {
        localStorage.setItem('pk_cached_payment_logos', JSON.stringify(cache));
      } catch (e) {
        // ignore quota errors
      }
    }
  }, [paymentSettings]);

  const getLogo = (method: 'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay') => {
    const custom = paymentSettings?.[`${method}Logo`];
    if (custom && custom.trim() !== '') {
      return custom;
    }
    // Check cached logo
    try {
      const cached = localStorage.getItem('pk_cached_payment_logos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[method]) return parsed[method];
      }
    } catch (e) {}

    return logos[method] || `/${method}.png`;
  };

  const handleImgError = (e: SyntheticEvent<HTMLImageElement, Event>, method: 'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay') => {
    const target = e.currentTarget;
    if (target.src !== logos[method]) {
      target.src = logos[method];
    }
  };

  useEffect(() => {
    if (activeTab === 'WITHDRAW') {
      const isCurrentEnabled = 
        (paymentMethod === 'easypaisa' && paymentSettings?.withdrawEasypaisaEnabled !== false) ||
        (paymentMethod === 'jazzcash' && paymentSettings?.withdrawJazzcashEnabled !== false) ||
        (paymentMethod === 'sadapay' && Boolean(paymentSettings?.withdrawSadapayEnabled)) ||
        (paymentMethod === 'nayapay' && Boolean(paymentSettings?.withdrawNayapayEnabled));
      
      if (!isCurrentEnabled) {
        if (paymentSettings?.withdrawEasypaisaEnabled !== false) setPaymentMethod('easypaisa');
        else if (paymentSettings?.withdrawJazzcashEnabled !== false) setPaymentMethod('jazzcash');
        else if (paymentSettings?.withdrawSadapayEnabled) setPaymentMethod('sadapay');
        else if (paymentSettings?.withdrawNayapayEnabled) setPaymentMethod('nayapay');
      }
    }
  }, [activeTab, paymentSettings, paymentMethod]);

  const presetAmounts = [100, 200, 300, 400, 500, 1000, 1500, 2000];

  const handleDeposit = async () => {
    if (isSubmitting) return;

    const authSuccess = await requirePinAuth();
    if (!authSuccess) {
      playErrorSound(); toast.error('Authentication failed.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      playErrorSound(); toast.error('Please enter a valid amount');
      return;
    }
    if (!screenshotBase64) {
      playErrorSound(); toast.error('Please upload a screenshot of your payment');
      return;
    }
    setIsSubmitting(true);
    try {
      const newTx = {
        amount: Number(amount),
        type: 'deposit',
        status: 'pending',
        method: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
        date: new Date().toISOString(),
        screenshot: screenshotBase64,
        // old fields for backwards compatibility
        m: paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
        coins: amount,
        iconBg: paymentMethod === 'easypaisa' ? 'bg-[#009144]' : 'bg-[#ED1C24]',
        isWithdraw: false
      };
      await addTransaction(newTx);
      setDepositAmount(Number(amount));
      setShowDepositSuccessModal(true);
      playDepositSuccessSound();
      setAmount('');
      setScreenshotBase64('');
    } catch (err: any) {
      playErrorSound(); toast.error(err.message || 'Deposit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWithdrawInputs = () => {
    setAmount('');
    setWithdrawTitle('');
    setWithdrawNumber('');
  };

  const handleWithdraw = async () => {
    if (isSubmitting) return;

    if (paymentSettings?.withdrawalEnabled === false) {
      playErrorSound(); toast.error('Withdrawals are temporarily disabled.');
      resetWithdrawInputs();
      return;
    }

    const isMethodEnabled = () => {
      if (paymentMethod === 'easypaisa') return paymentSettings?.withdrawEasypaisaEnabled !== false;
      if (paymentMethod === 'jazzcash') return paymentSettings?.withdrawJazzcashEnabled !== false;
      if (paymentMethod === 'sadapay') return paymentSettings?.withdrawSadapayEnabled !== false;
      if (paymentMethod === 'nayapay') return paymentSettings?.withdrawNayapayEnabled !== false;
      return true;
    };

    if (!isMethodEnabled()) {
      playErrorSound(); toast.error('Selected withdrawal method is currently unavailable.');
      resetWithdrawInputs();
      return;
    }

    // Minimum withdrawal check: Keep inputs intact as requested by user
    if (!amount || Number(amount) < 100) {
      playErrorSound(); toast.error('Minimum withdrawal is 100 PKR.');
      return;
    }

    // Account details validation: Resets inputs on error
    if (!withdrawTitle.trim() || !withdrawNumber.trim()) {
      playErrorSound(); toast.error('Please enter account details.');
      resetWithdrawInputs();
      return;
    }

    // Insufficient balance validation: Resets inputs on error
    if ((currentUser?.walletBalance || 0) < Number(amount)) {
      playErrorSound(); toast.error('Insufficient balance for withdrawal.');
      resetWithdrawInputs();
      return;
    }

    // PIN Authentication: Resets inputs on error
    const authSuccess = await requirePinAuth();
    if (!authSuccess) {
      playErrorSound(); toast.error('Authentication failed.');
      resetWithdrawInputs();
      return;
    }

    setIsSubmitting(true);
    try {
      const getMethodName = () => {
        if (paymentMethod === 'easypaisa') return 'Easypaisa';
        if (paymentMethod === 'jazzcash') return 'JazzCash';
        if (paymentMethod === 'sadapay') return 'SadaPay';
        if (paymentMethod === 'nayapay') return 'NayaPay';
        return 'Withdrawal';
      };

      const getMethodBg = () => {
        if (paymentMethod === 'easypaisa') return 'bg-[#009144]';
        if (paymentMethod === 'jazzcash') return 'bg-[#ED1C24]';
        if (paymentMethod === 'sadapay') return 'bg-sky-500';
        if (paymentMethod === 'nayapay') return 'bg-orange-500';
        return 'bg-yellow-500';
      };

      const newTx = {
        amount: Number(amount),
        type: 'withdrawal',
        status: 'pending',
        method: getMethodName(),
        details: `Title: ${withdrawTitle} | Number: ${withdrawNumber}`,
        phoneNumber: withdrawNumber,
        date: new Date().toISOString(),
        // old fields for backwards compatibility
        m: getMethodName(),
        coins: amount,
        iconBg: getMethodBg(),
        isWithdraw: true,
        accountTitle: withdrawTitle,
        accountNumber: withdrawNumber
      };
      await addTransaction(newTx);
      setSuccessAmount(Number(amount));
      setShowSuccessModal(true);
      playWithdrawSuccessSound();
      resetWithdrawInputs();
    } catch (err: any) {
      playErrorSound(); toast.error(err.message || 'Withdrawal request failed');
      resetWithdrawInputs();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (isSubmitting) return;
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      playErrorSound(); toast.error('Please enter a valid promo code');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let reward = 0;
      let promoData: any = null;
      // Fetch promo code dynamically from Firebase Realtime Database
      try {
        const promoSnap = await get(ref(db, `promoCodes/${cleanCode}`));
        if (promoSnap.exists()) {
          const val = promoSnap.val();
          promoData = val;
          if (val && typeof val === 'object') {
            if (val.coins) {
              reward = Number(val.coins);
            }
          } else if (typeof val === 'number') {
            reward = val;
          }
        }
      } catch (e) {
        console.error("Promo code database check error:", e);
      }

      if (reward > 0 && promoData) {
        // Expiry Date validation
        if (promoData.expireDate) {
          const expDate = new Date(promoData.expireDate);
          const now = new Date();
          if (now > expDate) {
            playErrorSound(); toast.error('This promo code has expired!');
            setPromoCode('');
            setIsSubmitting(false);
            return;
          }
        }

        // Used Limit validation
        const limitVal = promoData.usedLimit !== undefined ? Number(promoData.usedLimit) : 1;
        const redeemers = promoData.redeemers || {};
        const redeemCount = Object.keys(redeemers).length;
        if (redeemCount >= limitVal) {
          playErrorSound(); toast.error('This promo code has reached its usage limit!');
          setPromoCode('');
          setIsSubmitting(false);
          return;
        }

        // Prevent duplicate redemption from the same user (account level check via Firebase list and profile)
        const userId = currentUser?.uid || currentUser?.id || 'unknown';
        const userRedeemed: string[] = currentUser?.redeemedPromos || [];
        if (userRedeemed.includes(cleanCode) || (promoData.redeemers && promoData.redeemers[userId])) {
          playErrorSound(); toast.error('You have already redeemed this promo code!');
          setPromoCode('');
          setIsSubmitting(false);
          return;
        }

        // Prevent duplicate redemption per device (device level check via localStorage)
        const deviceRedeemedRaw = localStorage.getItem('device_redeemed_promos');
        const deviceRedeemedList: string[] = deviceRedeemedRaw ? JSON.parse(deviceRedeemedRaw) : [];
        if (deviceRedeemedList.includes(cleanCode)) {
          playErrorSound(); toast.error('You have already redeemed this promo code!');
          setPromoCode('');
          setIsSubmitting(false);
          return;
        }

        const newTx = {
          amount: reward,
          type: 'deposit',
          status: 'completed',
          method: 'Promo Code',
          date: new Date().toISOString(),
          details: `Redeemed Promo: ${cleanCode}`,
          m: 'Promo Code',
          coins: reward.toString(),
          iconBg: 'bg-green-500',
          isWithdraw: false
        };
        await addTransaction(newTx);
        
        await updateUserProfile({
          depositBalance: (currentUser?.depositBalance || 0) + reward,
          walletBalance: (currentUser?.walletBalance || 0) + reward,
          redeemedPromos: [...userRedeemed, cleanCode]
        });

        // Save to device storage
        try {
          deviceRedeemedList.push(cleanCode);
          localStorage.setItem('device_redeemed_promos', JSON.stringify(deviceRedeemedList));
        } catch (storageErr) {
          console.error("Local storage update failed:", storageErr);
        }

        // Register user under the promo code's redeemers object
        try {
          const userId = currentUser?.uid || currentUser?.id || 'unknown';
          const updateData: any = {};
          updateData[`promoCodes/${cleanCode}/redeemers/${userId}`] = {
            userId,
            username: currentUser?.username || 'N/A',
            email: currentUser?.email || 'N/A',
            phone: currentUser?.phone || 'N/A',
            redeemedAt: new Date().toISOString()
          };
          
          // Check if limit reached to mark isUsed
          if (redeemCount + 1 >= limitVal) {
            updateData[`promoCodes/${cleanCode}/isUsed`] = true;
            updateData[`promoCodes/${cleanCode}/status`] = 'used';
          }
          await update(ref(db), updateData);
        } catch (dbErr) {
          console.error("Failed to update promo redeemers:", dbErr);
        }
        
        setPromoReward(reward);
        setShowPromoSuccessModal(true);
        playDepositSuccessSound();
        setPromoCode('');
      } else {
        playErrorSound(); toast.error('Invalid or expired promo code.');
        setPromoCode('');
      }
    } catch (err: any) {
      playErrorSound(); toast.error(err.message || 'Redemption failed');
      setPromoCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0 },
    show: { opacity: 1 }
  };

  return (
    <div className="flex flex-col min-h-full pb-6">
      
      {/* Tabs */}
      <div className="px-4 mt-2 mb-4 space-y-2">
        <div className="flex bg-pk-card rounded-xl p-1 border border-pk-border">
          <button 
            onClick={() => setActiveTab('DEPOSIT')}
            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'DEPOSIT' ? 'bg-gradient-pk text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            <Download className="w-5 h-5 mb-0.5" />
            <span className="font-bold text-sm">{t("DEPOSIT")}</span>
            <span className={`text-[9px] ${activeTab === 'DEPOSIT' ? 'text-black/70' : 'text-zinc-500'}`}>{t("Add Coins to Wallet")}</span>
          </button>
          <button 
            onClick={() => setActiveTab('WITHDRAW')}
            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'WITHDRAW' ? 'bg-gradient-pk text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            <Upload className="w-5 h-5 mb-0.5" />
            <span className="font-bold text-sm">{t("WITHDRAW")}</span>
            <span className={`text-[9px] ${activeTab === 'WITHDRAW' ? 'text-black/70' : 'text-zinc-500'}`}>{t("Withdraw to Accounts")}</span>
          </button>
        </div>

        {/* Promo Code Button below Deposit & Withdrawal */}
        <button 
          onClick={() => setActiveTab('PROMO')}
          className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between transition-all shadow-sm ${
            activeTab === 'PROMO' 
              ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black border-yellow-400 font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]' 
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-yellow-500/40 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTab === 'PROMO' ? 'bg-black/20 text-black' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
              <Gift className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider">
                {t("Have a Promo Code?")}
              </div>
              <div className={`text-[10px] ${activeTab === 'PROMO' ? 'text-black/80 font-medium' : 'text-zinc-500'}`}>
                {t("Tap here to redeem free coins")}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === 'PROMO' ? 'bg-black text-yellow-400' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
              {activeTab === 'PROMO' ? t("Active") : t("Redeem")}
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'PROMO' ? 'rotate-90 text-black' : 'text-zinc-500'}`} />
          </div>
        </button>

        {/* Deposit Offers Button - Auto hidden when toggle is OFF or no offers */}
        {depositOffersEnabled && depositOffers.length > 0 && (
          <button 
            onClick={() => setShowDepositOffersModal(true)}
            className="w-full mt-2 py-2.5 px-4 rounded-xl border flex items-center justify-between transition-all shadow-sm bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border-yellow-500/40 text-white hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-[0.99] group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider text-yellow-400">
                  {t("Deposit Offers")}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  {t("Get extra bonus coins on deposits")}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <ChevronRight className="w-4 h-4 text-yellow-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'DEPOSIT' ? (
            <motion.div 
              key="deposit"
              variants={container}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="space-y-5"
            >
              {/* Payment Method */}
              <motion.div variants={item}>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("Choose Payment Method")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {paymentSettings?.easypaisaEnabled !== false && (
                    <button 
                      onClick={() => setPaymentMethod('easypaisa')}
                      className={`relative p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'easypaisa' ? 'bg-[#009144]/10 border-[#009144]' : 'bg-pk-card border-pk-border opacity-70'}`}
                    >
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                        <img 
                          src={getLogo('easypaisa')} 
                          alt="Easypaisa" 
                          className="w-full h-full object-contain" 
                          onError={(e) => handleImgError(e, 'easypaisa')}
                        />
                      </div>
                      <div className="font-bold text-[10px]">{paymentSettings?.easypaisaNumber || '03123456789'}</div>
                      <div className="text-[9px] text-yellow-500">{paymentSettings?.easypaisaTitle || 'Easypaisa Admin'}</div>
                      {paymentMethod === 'easypaisa' ? (
                        <div className="mt-2 w-full bg-[#009144] text-white text-[10px] py-1 rounded flex items-center justify-center">
                          {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                        </div>
                      ) : (
                        <div className="mt-2 w-full text-zinc-600 flex justify-end">
                          <Circle className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  )}
                  {paymentSettings?.jazzcashEnabled !== false && (
                    <button 
                      onClick={() => setPaymentMethod('jazzcash')}
                      className={`relative p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'jazzcash' ? 'bg-[#ED1C24]/10 border-[#ED1C24]' : 'bg-pk-card border-pk-border opacity-70'}`}
                    >
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                        <img 
                          src={getLogo('jazzcash')} 
                          alt="JazzCash" 
                          className="w-full h-full object-contain" 
                          onError={(e) => handleImgError(e, 'jazzcash')}
                        />
                      </div>
                      <div className="font-bold text-[10px]">{paymentSettings?.jazzcashNumber || '03213456789'}</div>
                      <div className="text-[9px] text-yellow-500">{paymentSettings?.jazzcashTitle || 'JazzCash Admin'}</div>
                      {paymentMethod === 'jazzcash' ? (
                        <div className="mt-2 w-full bg-[#ED1C24] text-white text-[10px] py-1 rounded flex items-center justify-center">
                          {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                        </div>
                      ) : (
                        <div className="mt-2 w-full text-zinc-600 flex justify-end">
                          <Circle className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Enter Amount */}
              <motion.div variants={item} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("Enter Amount")}</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <img src={PK_COIN_ICON} alt="Coin" className="w-5 h-5 object-contain" />
                  </div>
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={amount}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(clean);
                    }}
                    onPaste={(e) => {
                      const pasteData = e.clipboardData.getData('text');
                      if (/[^0-9]/.test(pasteData)) {
                        e.preventDefault();
                        const clean = pasteData.replace(/[^0-9]/g, '');
                        if (clean) setAmount(clean);
                      }
                    }}
                    className="w-full h-12 bg-pk-card border border-pk-border rounded-xl pl-11 pr-4 text-white focus:border-yellow-500 outline-none font-medium text-sm" 
                    placeholder={t("Enter Amount (PKR)")}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {presetAmounts.map(a => (
                    <button 
                      key={a} 
                      type="button"
                      onClick={() => setAmount(a.toString())} 
                      className={`py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center ${
                        amount === a.toString() 
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' 
                          : 'bg-pk-card border-pk-border text-zinc-200 hover:border-yellow-500/50 hover:text-white'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-0.5 px-1">
                  <span className="text-xs text-zinc-400">{t("You will receive")}: <span className="text-yellow-500 font-bold ml-1 flex items-center inline-flex"><img src={PK_COIN_ICON} alt="Coin" className="w-4 h-4 object-contain inline-block mr-1" /> {amount || '0'} {t("Coins")}</span></span>
                  <span className="text-[10px] text-zinc-500">1 Coin = 1 PKR</span>
                </div>
              </motion.div>

              {/* Instructions & Upload */}
              <motion.div variants={item} className="bg-pk-card border border-yellow-900/30 rounded-xl p-3">
                 <h3 className="text-yellow-500 text-xs font-bold mb-2 uppercase">{t("IMPORTANT INSTRUCTIONS")}</h3>
                 <div className="flex">
                   <ul className="text-[10px] text-zinc-300 space-y-1 list-disc pl-4 flex-1">
                     <li>{t("deposit_instruction_1")}</li>
                     <li>{t("deposit_instruction_2")}</li>
                     <li>{t("deposit_instruction_3")}</li>
                     <li>{t("deposit_instruction_4")}</li>
                   </ul>
                   <div className="w-24 ml-2 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-12 bg-zinc-900 border border-yellow-500/30 rounded-md relative flex items-center justify-center mb-1">
                        <Upload className="w-5 h-5 text-yellow-500" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-black"><CheckCircle2 className="w-3 h-3" /></div>
                      </div>
                      <span className="text-[8px] text-zinc-400 leading-tight">{t("Send Payment Screenshot After Payment")}</span>
                   </div>
                 </div>
              </motion.div>

              <motion.div variants={item} className="relative">
                <input type="file" id="screenshot-upload" className="hidden" accept="image/*" onChange={(e) => { 
                  if (e.target.files?.[0]) { 
                    const file = e.target.files[0];
                    if (file.size > 2 * 1024 * 1024) {
                       playErrorSound(); toast.error('Image is too large (max 2MB)');
                       return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setScreenshotBase64(reader.result as string);
                      toast.success('Screenshot attached successfully');
                    };
                    reader.readAsDataURL(file);
                  } 
                }} />
                <label htmlFor="screenshot-upload" className={`w-full bg-zinc-900 border ${screenshotBase64 ? 'border-green-500 text-green-500' : 'border-yellow-500/50 text-yellow-500'} hover:bg-zinc-800 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center uppercase tracking-wide transition-colors cursor-pointer`}>
                  {screenshotBase64 ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />} 
                  {screenshotBase64 ? t('SCREENSHOT ATTACHED') : t('UPLOAD SCREENSHOT')}
                </label>
              </motion.div>

              <motion.button 
                onClick={handleDeposit} 
                disabled={isSubmitting} 
                variants={item} 
                className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3.5 rounded-xl text-sm flex items-center justify-center uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>{t("PROCESSING...")}</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> {t("I HAVE MADE THE PAYMENT")}
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : activeTab === 'WITHDRAW' ? (
            <motion.div 
              key="withdraw"
              variants={container}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="space-y-5"
            >
              {/* Withdraw Balance Card (Horizontal Full-Width on Top) */}
              <motion.div variants={item} className="bg-gradient-to-r from-yellow-900/30 via-pk-card to-zinc-900 border border-yellow-900/40 rounded-xl p-3.5 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center space-x-3 z-10">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <img src={PK_COIN_ICON} alt="Coins" className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{t("Available Balance")}</div>
                    <div className="text-2xl font-black text-white leading-tight">
                      {(currentUser?.walletBalance || 0).toLocaleString()} <span className="text-xs font-semibold text-yellow-500">{t("Coins")}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900/90 text-yellow-500 text-[9px] font-bold px-2.5 py-1 rounded-md border border-yellow-900/50 z-10 whitespace-nowrap">
                  1 Coin = 1 PKR
                </div>
              </motion.div>

              {/* Important Instructions Card (Horizontal Full-Width Below Available Balance) */}
              <motion.div variants={item} className="bg-pk-card border border-yellow-900/30 rounded-xl p-3.5 space-y-2">
                <h3 className="text-yellow-500 text-xs font-bold uppercase flex items-center tracking-wider">
                  <Info className="w-3.5 h-3.5 mr-1.5 text-yellow-500" /> {t("IMPORTANT")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-zinc-300">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                    <span>{t("Minimum withdrawal: 100 PKR")}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                    <span>{t("Maximum withdrawal: 10,000 PKR")}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                    <span>{t("Withdrawal processed within")} <span className="text-yellow-500 font-bold">{t("24 Hours")}</span></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                    <span>{t("Make sure payment details are correct")}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:col-span-2">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                    <span>{t("Non-refundable after withdrawal request submission")}</span>
                  </div>
                </div>
              </motion.div>

              {/* Choose Payment Method */}
              <motion.div variants={item}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("Choose Payment Method")}</h3>
                  <span className="text-[10px] text-zinc-500">Scroll to view all</span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-2.5 scrollbar-none -mx-1 px-1">
                    {/* EasyPaisa */}
                    {paymentSettings?.withdrawEasypaisaEnabled !== false && (
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('easypaisa')}
                        className={`relative flex-shrink-0 min-w-[120px] w-[126px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${paymentMethod === 'easypaisa' ? 'bg-[#009144]/15 border-[#009144] shadow-[0_0_10px_rgba(0,145,68,0.2)]' : 'bg-pk-card border-pk-border opacity-70 hover:opacity-100'}`}
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                          <img 
                            src={getLogo('easypaisa')} 
                            alt="EasyPaisa" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => handleImgError(e, 'easypaisa')}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white mb-0.5 truncate max-w-full">EasyPaisa</span>
                        {paymentMethod === 'easypaisa' ? (
                          <div className="mt-1.5 w-full bg-[#009144] text-white text-[10px] py-0.5 rounded flex items-center justify-center font-bold">
                            {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                          </div>
                        ) : (
                          <div className="mt-1.5 w-full text-zinc-600 flex justify-end">
                            <Circle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )}

                    {/* JazzCash */}
                    {paymentSettings?.withdrawJazzcashEnabled !== false && (
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('jazzcash')}
                        className={`relative flex-shrink-0 min-w-[120px] w-[126px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${paymentMethod === 'jazzcash' ? 'bg-[#ED1C24]/15 border-[#ED1C24] shadow-[0_0_10px_rgba(237,28,36,0.2)]' : 'bg-pk-card border-pk-border opacity-70 hover:opacity-100'}`}
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                          <img 
                            src={getLogo('jazzcash')} 
                            alt="JazzCash" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => handleImgError(e, 'jazzcash')}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white mb-0.5 truncate max-w-full">JazzCash</span>
                        {paymentMethod === 'jazzcash' ? (
                          <div className="mt-1.5 w-full bg-[#ED1C24] text-white text-[10px] py-0.5 rounded flex items-center justify-center font-bold">
                            {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                          </div>
                        ) : (
                          <div className="mt-1.5 w-full text-zinc-600 flex justify-end">
                            <Circle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )}

                    {/* SadaPay - Only if enabled by Admin */}
                    {Boolean(paymentSettings?.withdrawSadapayEnabled) && (
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('sadapay')}
                        className={`relative flex-shrink-0 min-w-[120px] w-[126px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${paymentMethod === 'sadapay' ? 'bg-sky-500/15 border-sky-400 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]' : 'bg-pk-card border-pk-border opacity-70 hover:opacity-100'}`}
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                          <img 
                            src={getLogo('sadapay')} 
                            alt="SadaPay" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => handleImgError(e, 'sadapay')}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white mb-0.5 truncate max-w-full">SadaPay</span>
                        {paymentMethod === 'sadapay' ? (
                          <div className="mt-1.5 w-full bg-sky-500 text-white text-[10px] py-0.5 rounded flex items-center justify-center font-bold">
                            {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                          </div>
                        ) : (
                          <div className="mt-1.5 w-full text-zinc-600 flex justify-end">
                            <Circle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )}

                    {/* NayaPay - Only if enabled by Admin */}
                    {Boolean(paymentSettings?.withdrawNayapayEnabled) && (
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('nayapay')}
                        className={`relative flex-shrink-0 min-w-[120px] w-[126px] p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${paymentMethod === 'nayapay' ? 'bg-orange-500/15 border-orange-400 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.25)]' : 'bg-pk-card border-pk-border opacity-70 hover:opacity-100'}`}
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 mb-1">
                          <img 
                            src={getLogo('nayapay')} 
                            alt="NayaPay" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => handleImgError(e, 'nayapay')}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white mb-0.5 truncate max-w-full">NayaPay</span>
                        {paymentMethod === 'nayapay' ? (
                          <div className="mt-1.5 w-full bg-orange-500 text-white text-[10px] py-0.5 rounded flex items-center justify-center font-bold">
                            {t("SELECTED")} <CheckCircle2 className="w-3 h-3 ml-1" />
                          </div>
                        ) : (
                          <div className="mt-1.5 w-full text-zinc-600 flex justify-end">
                            <Circle className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )}
                </div>
              </motion.div>

              {/* Enter Withdraw Amount */}
              <motion.div variants={item} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("Enter Withdraw Amount")}</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <img src={PK_COIN_ICON} alt="Coin" className="w-5 h-5 object-contain" />
                  </div>
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={amount}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(clean);
                    }}
                    onPaste={(e) => {
                      const pasteData = e.clipboardData.getData('text');
                      if (/[^0-9]/.test(pasteData)) {
                        e.preventDefault();
                        const clean = pasteData.replace(/[^0-9]/g, '');
                        if (clean) setAmount(clean);
                      }
                    }}
                    className="w-full h-12 bg-pk-card border border-pk-border rounded-xl pl-11 pr-4 text-white focus:border-yellow-500 outline-none font-medium text-sm" 
                    placeholder={t("Enter Amount (PKR)")}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {presetAmounts.map(a => (
                    <button 
                      key={a} 
                      type="button"
                      onClick={() => setAmount(a.toString())} 
                      className={`py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center ${
                        amount === a.toString() 
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' 
                          : 'bg-pk-card border-pk-border text-zinc-200 hover:border-yellow-500/50 hover:text-white'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Account Details Form */}
              <motion.div variants={item}>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("Account Details")}</h3>
                <div className="bg-pk-card border border-pk-border rounded-xl p-3 space-y-3">
                   <div className="relative">
                     <input 
                       type="text" 
                       value={withdrawTitle}
                       onChange={(e) => setWithdrawTitle(e.target.value)}
                       className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
                       placeholder={t("Account Title")} 
                     />
                   </div>
                   <div className="relative">
                     <input 
                       type="text" 
                       value={withdrawNumber}
                       onChange={(e) => setWithdrawNumber(e.target.value)}
                       className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
                       placeholder={t("Account Number")} 
                     />
                   </div>
                   <div className="flex items-center justify-between border-t border-zinc-800 pt-2 mt-2">
                     <span className="text-xs font-semibold text-zinc-400">{t("Withdrawal Amount")}:</span>
                     <span className="text-sm font-bold text-yellow-500">{amount || '0'} PKR</span>
                   </div>
                </div>
              </motion.div>

              <motion.div variants={item} className="bg-yellow-900/20 border border-yellow-900/50 rounded-xl p-3 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-yellow-500 mb-0.5">{t("Note")}:</div>
                  <div className="text-[10px] text-zinc-300">{t("Make sure your payment number and name are correct. Wrong details may cause payment delays.")}</div>
                </div>
              </motion.div>

              <motion.button 
                onClick={handleWithdraw} 
                disabled={isSubmitting} 
                variants={item} 
                className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3.5 rounded-xl text-sm flex flex-col items-center justify-center uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="font-bold">{t("PROCESSING...")}</span>
                ) : (
                  <>
                    <div className="flex items-center"><Upload className="w-4 h-4 mr-2" /> {t("REQUEST WITHDRAW")}</div>
                    <span className="text-[9px] font-normal mt-0.5 lowercase">{t("Withdraw will be processed within 24 Hours")}</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : activeTab === 'PROMO' ? (
            <motion.div 
              key="promo"
              variants={container}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="space-y-4"
            >
              {/* Promo Hero Header */}
              <div className="bg-gradient-to-br from-yellow-900/30 via-zinc-900 to-black border border-yellow-500/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <Gift className="w-7 h-7 text-yellow-500" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-1">{t("Redeem Promo Code")}</h3>
                <p className="text-xs text-zinc-400 max-w-xs">{t("Enter your promotional or referral voucher code below to claim instant bonus coins!")}</p>
              </div>

              {/* Promo Code Input Box */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block ml-1">{t("Promo / Voucher Code")}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/80 border border-zinc-800 focus:border-yellow-500 rounded-xl py-3.5 pl-4 pr-12 text-center text-base font-black tracking-widest text-white uppercase outline-none transition-colors" 
                    placeholder="ENTER PROMO CODE"
                  />
                  <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
                    <Sparkles className="w-5 h-5 text-yellow-500/70" />
                  </div>
                </div>

                <button 
                  onClick={handleRedeemPromo} 
                  disabled={isSubmitting || !promoCode.trim()} 
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? (
                    <span className="font-bold">{t("PROCESSING...")}</span>
                  ) : (
                    <>
                      <img src={PK_COIN_ICON} alt="Coin" className="w-4 h-4 object-contain mr-1.5" />
                      {t("REDEEM")}
                    </>
                  )}
                </button>
              </div>

              {/* Promo Code Guidelines */}
              <div className="bg-pk-card border border-zinc-800/80 rounded-xl p-3.5">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">{t("Promo Code Guidelines")}</span>
                </div>
                <ul className="text-[10px] text-zinc-400 space-y-1.5 list-disc pl-4">
                  <li>{t("Promo codes can only be redeemed once per account.")}</li>
                  <li>{t("Bonus coins are immediately credited to your wallet balance.")}</li>
                  <li>{t("Follow our official channels for limited-time match coupons and giveaways.")}</li>
                </ul>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSuccessModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-zinc-900 border border-yellow-500/30 rounded-[2rem] p-6 w-full max-w-[320px] relative z-10 flex flex-col items-center text-center shadow-[0_0_60px_rgba(234,179,8,0.2)]"
              >
                <div className="w-40 h-40 relative mt-6 mb-[6px]">
                  <LottiePlayer 
                    animationData={successConfetti} 
                    autoplay={true}
                    loop={true}
                    className="w-full h-full"
                  />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-[0.05em] mb-2.5">WITHDRAWAL SUCCESS!</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed px-1">
                  Your Withdrawal Request of <span className="text-yellow-500 font-black text-sm">{successAmount} PKR</span> has successfully sent to admin
                </p>

                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg active:scale-95 transition-all"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Promo Success Modal */}
        <AnimatePresence>
          {showPromoSuccessModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPromoSuccessModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-zinc-900 border border-yellow-500/30 rounded-[2rem] p-6 w-full max-w-[320px] relative z-10 flex flex-col items-center text-center shadow-[0_0_60px_rgba(234,179,8,0.2)]"
              >
                <div className="w-40 h-40 relative mt-6 mb-[6px]">
                  <LottiePlayer 
                    animationData={successConfetti} 
                    autoplay={true}
                    loop={true}
                    className="w-full h-full"
                  />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-[0.05em] mb-2.5">PROMO REDEEMED!</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed px-1">
                  PROMO CODE SUCCESSFULY REDEEMED <span className="text-yellow-500 font-black text-sm">{promoReward}</span> coins successfully added in your deposit balance
                </p>

                <button 
                  onClick={() => setShowPromoSuccessModal(false)}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg active:scale-95 transition-all"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Deposit Success Modal */}
        <AnimatePresence>
          {showDepositSuccessModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDepositSuccessModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-zinc-900 border border-yellow-500/30 rounded-[2rem] p-6 w-full max-w-[320px] relative z-10 flex flex-col items-center text-center shadow-[0_0_60px_rgba(234,179,8,0.2)]"
              >
                <div className="w-40 h-40 relative mt-6 mb-[6px]">
                  <LottiePlayer 
                    animationData={pendingClock} 
                    autoplay={true}
                    loop={true}
                    className="w-full h-full"
                  />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-[0.05em] mb-2.5">DEPOSIT PENDING!</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed px-1">
                  Your Deposit Request of <span className="text-yellow-500 font-black text-sm">{depositAmount} PKR</span> has Sent to admin
                </p>

                <button 
                  onClick={() => setShowDepositSuccessModal(false)}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-xs uppercase tracking-[0.15em] shadow-lg active:scale-95 transition-all"
                >
                  Got It
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Transaction History (Shared for both tabs) */}
        <motion.div variants={item} className="pb-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
              {t("Recent History")}
            </h3>
            <button onClick={() => setShowAllTransactions(true)} className="text-[10px] font-bold text-yellow-500 flex items-center hover:text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md transition-colors">
              {t("View All")} <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {transactions.slice(0, 3).map((tx, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between hover:border-yellow-900/50 transition-colors">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-sm ${tx.iconBg}`}>
                    {tx.isWithdraw ? <Upload className="w-4 h-4" /> : (tx.m === 'Easypaisa' ? 'e' : 'J')}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white mb-0.5">{tx.isWithdraw ? t('Withdrawal') : t('Deposit')} <span className="font-normal text-zinc-400">{t("via")}</span> {tx.m}</div>
                    <div className="text-[9px] text-zinc-500">{tx.date}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-bold text-white mb-0.5">Rs. {tx.amount}</div>
                  <div className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    tx.status === 'APPROVED' || tx.status === 'completed' || tx.status === 'Completed'
                      ? 'bg-green-500/20 text-green-500 border border-green-500/20'
                      : tx.status === 'rejected' || tx.status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-500 border border-red-500/20'
                      : 'bg-orange-500/20 text-orange-500 border border-orange-500/20'
                  }`}>
                    {tx.status === 'APPROVED' || tx.status === 'completed' || tx.status === 'Completed' ? t('Approved') : tx.status === 'rejected' || tx.status === 'REJECTED' ? t('Rejected') : t('Pending')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {showAllTransactions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
              >
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                  <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Clock className="w-4 h-4 mr-2" /> {t("Transaction History")}</h3>
                  <button onClick={() => setShowAllTransactions(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                  {transactions.length > 0 ? (
                    transactions.map((tx, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 text-xs ${tx.iconBg}`}>
                            {tx.isWithdraw ? <Upload className="w-3 h-3" /> : (tx.m === 'Easypaisa' ? 'e' : 'J')}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-white">{tx.isWithdraw ? t('Withdrawal') : t('Deposit')}</div>
                            <div className="text-[8px] text-zinc-500">{tx.date}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs font-bold text-white">Rs. {tx.amount}</div>
                          <div className={`text-[8px] font-bold ${
                            tx.status === 'APPROVED' || tx.status === 'completed' || tx.status === 'Completed'
                              ? 'text-green-500'
                              : tx.status === 'rejected' || tx.status === 'REJECTED'
                              ? 'text-red-500'
                              : 'text-orange-500'
                          }`}>
                            {tx.status === 'APPROVED' || tx.status === 'completed' || tx.status === 'Completed' ? t('Approved') : tx.status === 'rejected' || tx.status === 'REJECTED' ? t('Rejected') : t('Pending')}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Trophy className="w-12 h-12 text-zinc-800 mb-2" />
                      <div className="text-zinc-500 font-bold text-sm">{t("No transactions yet")}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deposit Offers Modal */}
        <DepositOffersModal
          isOpen={showDepositOffersModal}
          onClose={() => setShowDepositOffersModal(false)}
          offers={depositOffers}
          onSelectOffer={(coins) => {
            setActiveTab('DEPOSIT');
            setAmount(coins.toString());
            toast.success(`Selected offer: ${coins} Coins (+Bonus)`);
          }}
        />
      </div>
    </div>
  );
}
