import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Hash, Phone, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { ref, update } from 'firebase/database';
import toast from 'react-hot-toast';

export function OnboardingModal() {
  const { currentUser, updateUserProfile, isProfileComplete, logout } = useApp();
  const [formData, setFormData] = useState({
    inGameName: '',
    gameUid: '',
    phoneNumber: '',
    referralCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phoneNumber.length !== 10) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }
    
    if (!currentUser) return;

    try {
      const profileData = {
        inGameName: formData.inGameName,
        gameUid: formData.gameUid,
        phone: `+92${formData.phoneNumber}`,
        isProfileComplete: true,
        referredBy: formData.referralCode
      };

      // 1. Update Firebase & Context via updateUserProfile
      await updateUserProfile(profileData);
      
      toast.success('Profile completed! Welcome to PK ARENA PUBG.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  if (isProfileComplete || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 ">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-zinc-950 border border-yellow-900/50 rounded-3xl overflow-hidden shadow-2xl shadow-yellow-500/10"
      >
        <div className="p-6 text-center border-b border-zinc-900 bg-zinc-900/50">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/20">
            <Gamepad2 className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Complete Profile</h2>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Required to join tournaments</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Gamepad2 className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <input 
                type="text" 
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
                placeholder="In-Game Name" 
                value={formData.inGameName}
                onChange={(e) => setFormData({...formData, inGameName: e.target.value})}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <input 
                type="text" 
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
                placeholder="Game UID" 
                value={formData.gameUid}
                onChange={(e) => setFormData({...formData, gameUid: e.target.value})}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-[10px] font-bold text-zinc-500">+92</span>
              </div>
              <input 
                type="tel" 
                required
                maxLength={10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
                placeholder="3XXXXXXXXX (10 Digits)" 
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
              />
            </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">REF</span>
            </div>
            <input 
              type="text" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50" 
              placeholder="Referral Code (Optional)" 
              value={formData.referralCode}
              onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
            />
          </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-lg"
          >
            SAVE & CONTINUE
          </button>

          <button 
            type="button" 
            onClick={logout}
            className="w-full flex items-center justify-center text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest pt-2"
          >
            <LogOut className="w-3 h-3 mr-2" /> Logout
          </button>
        </form>
      </motion.div>
    </div>
  );
}
