import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Edit2, Gamepad2, Trophy, Crosshair, Users, Gift, Share2, LogOut, Copy, Calendar, MapPin, Hash, Coins as CoinsIcon, Wallet as WalletIcon, Clock, Shield, Medal, BarChart, Skull, User, X, CheckCircle2, Save, Play, Lightbulb, AlertTriangle, Info, Globe, Star, FileText, Lock, Trash2, ChevronRight, Headset } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { compressImage } from '../lib/imageUtils';
import { MyTeamModal } from '../components/MyTeamModal';
import { TeamsScreen } from '../components/TeamsScreen';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR, SUPPORT_ICON } from '../lib/assets';
import { firestore } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { auth } from '../lib/firebase';
import { updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { isMedianApp } from '../lib/onesignal';

export function Profile() {
  const navigate = useNavigate();
  const { joinedMatches, achievements, claimAchievement, referralStats, currentUser, logout, updateUserProfile, tournaments, checkUsernameExists, selectedLang, setSelectedLang, t, appSettings, requirePinAuth, setForcePinSetup } = useApp();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    username: '',
    inGameName: '',
    gameUid: '',
    newPassword: '',
    avatarUrl: '',
    bio: ''
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestionText, setSuggestionText] = useState('');
  const [reportCategory, setReportCategory] = useState('Wallet/Deposit');
  const [reportText, setReportText] = useState('');
  const [userRating, setUserRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [refTab, setRefTab] = useState<'PENDING' | 'PAID'>('PENDING');

  // App Lock State in Profile
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isFingerprintEnabled, setIsFingerprintEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const COLLECTION_NAME = 'PK-Arena_Support_ChaT';

  useEffect(() => {
    if (!currentUser?.uid) return;

    const messagesRef = collection(firestore, COLLECTION_NAME, currentUser.uid, 'messages');
    const q = query(
      messagesRef, 
      where('isAdmin', '==', true), 
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentUser) {
      setEditForm({
        username: currentUser.username || '',
        inGameName: currentUser.inGameName || '',
        gameUid: currentUser.gameUid || '',
        newPassword: '',
        avatarUrl: currentUser.avatarUrl || '',
        bio: currentUser.bio || ''
      });
      setBioInput(currentUser.bio || '');
      setIsAppLockEnabled(!!currentUser.appLockPin);
      setIsFingerprintEnabled(!!currentUser.appLockFingerprintEnabled);
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const u = editForm.username.trim();
      if (u.length >= 3) {
        if (currentUser && u.toLowerCase() === currentUser.username?.toLowerCase()) {
          setUsernameStatus('available');
          return;
        }
        setUsernameStatus('checking');
        try {
          const exists = await checkUsernameExists(u, currentUser?.uid);
          setUsernameStatus(exists ? 'taken' : 'available');
        } catch (e) {
          console.error(e);
          setUsernameStatus('idle');
        }
      } else {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [editForm.username, currentUser, checkUsernameExists]);

  if (!currentUser) return null;

  const handleUpdateBio = async () => {
    try {
      await updateUserProfile({ bio: bioInput });
      setIsEditingBio(false);
      toast.success('Bio updated!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Processing image...');

    try {
      // Compress image to speed up upload and stay under limits
      const compressedBlob = await compressImage(file, 600, 600, 0.6);
      
      const formData = new FormData();
      formData.append('image', compressedBlob, 'profile.jpg');
      
      toast.loading('Uploading...', { id: loadingToast });

      const apiKey = appSettings?.imgbbApiKey?.trim() || import.meta.env.VITE_IMGBB_API_KEY || '29348d4d4bf16a193ea8df02d632bf96';
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const imageUrl = result.data.url;
        await updateUserProfile({ avatarUrl: imageUrl });
        toast.dismiss(loadingToast);
        toast.success('Profile picture updated!');
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Error uploading image');
    }
  };

  const handleAction = (label: string) => {
    if (label === 'My Team') {
      setActiveModal('TEAMS');
      return;
    }
    setActiveModal(label);
  };

  const copyCode = () => {
    const code = currentUser?.referralCode || 'PKARENA25';
    const appName = "PK ARENA PUBG";
    const appLink = appSettings?.appLink || window.location.origin;
    const shareText = `Earn With PUBG Mobile download now ${appName} to earn exciting rewards. Use my referral code: ${code}\n\nDownload Link: ${appLink}`;
    
    navigator.clipboard.writeText(shareText);
    toast.success('Share text copied!');
  };

  const handleShare = async () => {
    const code = currentUser?.referralCode || 'PKARENA25';
    const appName = "PK ARENA PUBG";
    const appLink = appSettings?.appLink || window.location.origin;
    const text = `Earn With PUBG Mobile download now ${appName} to earn exciting rewards. Use my referral code: ${code}\n\nDownload Link: ${appLink}`;
    const url = appLink;

    if (isMedianApp()) {
      window.location.href = `gonative://share/sharePage?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      return;
    }

    setIsShareModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };



  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) {
      toast.error('Please describe your issue');
      return;
    }
    // In a real app, you would save this to Firebase/database.
    toast.success('Support ticket submitted successfully. We will contact you soon!');
    setReportText('');
    setActiveModal(null);
  };

  const handleAppLockClick = async () => {
    if (currentUser?.appLockPin) {
      const authSuccess = await requirePinAuth();
      if (!authSuccess) return;
    }
    setActiveModal('APP_LOCK');
  };

  const handleToggleAppLock = async () => {
    if (isAppLockEnabled) {
      const authSuccess = await requirePinAuth();
      if (!authSuccess) return;
      setIsAppLockEnabled(false);
      try {
        await updateUserProfile({
          appLockPin: null,
          securityColor: null,
          securitySport: null
        });
        toast.success('App Lock Disabled');
      } catch (err: any) {
        toast.error(err.message);
      }
    } else {
      setIsAppLockEnabled(true);
    }
  };

  const onUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken') {
      toast.error('This username is already taken!');
      return;
    }
    try {
      const data: any = {
        username: editForm.username,
        inGameName: editForm.inGameName,
        gameUid: editForm.gameUid,
        avatarUrl: editForm.avatarUrl,
        bio: editForm.bio
      };
      
      await updateUserProfile(data);

      if (editForm.newPassword && auth.currentUser) {
        await firebaseUpdatePassword(auth.currentUser, editForm.newPassword);
        toast.success('Password updated!');
      }

      setActiveModal(null);
      toast.success('Profile updated!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col min-h-full pb-6 overflow-y-auto scrollbar-hide relative"
    >
      
      {/* User Header Card */}
      <motion.div variants={item} className="mx-4 mt-2 bg-pk-card rounded-2xl border border-yellow-900/50 p-4 relative overflow-hidden">
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex space-x-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-yellow-500 p-0.5 overflow-hidden group">
                <button 
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="w-full h-full rounded-full relative overflow-hidden focus:outline-none"
                >
                  <img src={currentUser.avatarUrl || DEFAULT_AVATAR} alt="Profile" className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
              </div>
              <input 
                type="file" 
                id="avatar-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              <button onClick={() => document.getElementById('avatar-upload')?.click()} className="absolute bottom-0 right-0 bg-yellow-500 w-6 h-6 rounded-full flex items-center justify-center text-black border border-black hover:bg-yellow-400">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex flex-col pt-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">{currentUser.username}</h2>
                <button onClick={() => setActiveModal('EDIT_PROFILE')} className="text-zinc-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                <div className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center border border-yellow-500/30">
                  <span className="mr-1">✓</span> Verified
                </div>
              </div>
              <div className="flex flex-col space-y-0.5 mb-2">
                <div className="text-xs text-zinc-400">{currentUser.email || 'No email provided'}</div>
                <div className="text-xs text-zinc-400">{currentUser.phone || (currentUser as any).phoneNumber || 'No phone provided'}</div>
              </div>
              
              <div className="bg-gradient-pk text-black text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block w-max">
                PK Warrior
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800 relative z-10">
           <div className="flex flex-col items-center text-center">
             <div className="text-[10px] text-zinc-500 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Joined</div>
             <div className="text-xs font-semibold mt-0.5">{currentUser.joinedDate}</div>
           </div>
           <div className="flex flex-col items-center text-center border-l border-zinc-800">
             <div className="text-[10px] text-zinc-500 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Region</div>
             <div className="text-xs font-semibold mt-0.5">Pakistan</div>
           </div>
           <div className="flex flex-col items-center text-center border-l border-zinc-800">
             <div className="text-[10px] text-zinc-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> UID</div>
             <div className="text-xs font-semibold mt-0.5">{currentUser.gameUid || 'NOT SET'}</div>
           </div>
        </div>
      </motion.div>

      {/* Edit Profile Button */}
      <motion.div variants={item} className="mx-4 mt-4">
        <button 
          onClick={() => setActiveModal('EDIT_PROFILE')} 
          className="w-full bg-zinc-900 border border-yellow-500 text-yellow-500 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-md"
        >
          <User className="w-4 h-4 mr-2" /> EDIT PROFILE
        </button>
      </motion.div>

      {/* Action Grid */}
      <motion.div variants={item} className="mx-4 mt-4 grid grid-cols-2 gap-2">
         {[
           { icon: Clock, label: 'Match History' },
           { icon: Trophy, label: 'Result History' },
           { icon: Shield, label: 'Joined Tournaments' },
           { icon: Gift, label: 'Referral Program' },
         ].map((act, i) => (
           <button key={i} onClick={() => handleAction(act.label)} className="flex flex-col items-center justify-center bg-pk-card border border-pk-border rounded-xl p-2 hover:border-yellow-500 transition-colors">
             <act.icon className="w-5 h-5 text-yellow-500 mb-1" />
             <span className="text-[7px] text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full">{t(act.label)}</span>
           </button>
         ))}
      </motion.div>

      {/* About & Referral */}
      <motion.div variants={item} className="mx-4 mt-4 mb-4 space-y-4">
        <div className="bg-pk-card border border-pk-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-yellow-500 uppercase flex items-center"><User className="w-3.5 h-3.5 mr-1" /> ABOUT ME</h3>
            {!isEditingBio ? (
              <button onClick={() => setIsEditingBio(true)}><Edit2 className="w-3 h-3 text-zinc-500 hover:text-white transition-colors" /></button>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={() => setIsEditingBio(false)} 
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateBio} 
                  className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-wider"
                >
                  Save
                </button>
              </div>
            )}
          </div>
          {isEditingBio ? (
            <textarea
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-yellow-500/50 min-h-[60px] resize-none"
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Tell us about yourself..."
              autoFocus
            />
          ) : (
            <div className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {currentUser.bio || "No bio yet. Tap edit to add one! 🎮"}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 via-zinc-900 to-zinc-950 border border-yellow-500/30 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-yellow-500 flex items-center uppercase">
                  <Gift className="w-4 h-4 mr-1.5" /> MY REFERRAL CODE
                </h3>
              </div>
              <div className="flex items-center bg-black/50 border border-yellow-500/20 rounded-lg p-2 mb-2 shadow-inner">
                <span className="text-lg font-bold flex-1 text-center font-mono tracking-widest text-white drop-shadow-md">{currentUser?.referralCode || 'PKARENA25'}</span>
                <button onClick={copyCode} className="text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 p-1.5 rounded-md transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">Invite friends and earn rewards!</p>
            </div>
            <Gift className="absolute -bottom-4 -right-4 w-20 h-20 text-yellow-500/10" />
        </div>

        <button 
          onClick={() => setActiveModal('TEAMS')} 
          className="w-full bg-gradient-pk hover:bg-yellow-400 text-black font-black py-3 rounded-xl text-xs flex items-center justify-center transition-all shadow-md active:scale-95 tracking-wide uppercase mt-2.5"
        >
          <Users className="w-4 h-4 mr-2" />
          <span>MY TEAMS</span>
        </button>
      </motion.div>

      {/* Support & Info Section */}
      <motion.div variants={item} className="mx-4 mt-6">
        <h3 className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest mb-3 flex items-center">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2" />
          Support & Info
        </h3>
        <div className="bg-pk-card border border-pk-border rounded-2xl overflow-hidden divide-y divide-zinc-900">
          {[
            { id: 'CUSTOMER_SUPPORT', label: 'Customer Support', subtitle: 'Chat With Admin', icon: Headset },
            { id: 'HOW_TO_JOIN', label: 'How to Join', subtitle: 'YouTube video link', icon: Play },
            { id: 'HALAL_OR_HARAM', label: 'Halal or Haram', subtitle: 'Religious stance', icon: Shield },
            { id: 'ABOUT', label: 'About', subtitle: 'App details & version', icon: Info },
          ].map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                if (menu.id === 'CUSTOMER_SUPPORT') {
                  navigate('/support');
                } else {
                  setActiveModal(menu.id);
                }
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-xl border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-colors shrink-0 flex items-center justify-center relative">
                  <menu.icon className="w-4 h-4" />
                  {menu.id === 'CUSTOMER_SUPPORT' && unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-pk-card shadow-lg animate-bounce">
                      {unreadCount}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-yellow-500 transition-colors">{t(menu.label)}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{menu.subtitle}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Legal & App Section */}
      <motion.div variants={item} className="mx-4 mt-6">
        <h3 className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest mb-3 flex items-center">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2" />
          Legal & App
        </h3>
        <div className="bg-pk-card border border-pk-border rounded-2xl overflow-hidden divide-y divide-zinc-900">
          {[
            { id: 'CHANGE_LANGUAGE', label: 'Change Language', subtitle: 'Select language', icon: Globe },
            { id: 'SHARE_APP', label: 'Share the App', subtitle: 'Share with friends', icon: Share2 },
            { id: 'TERMS', label: 'Terms and Conditions', subtitle: 'Read Terms', icon: FileText },
            { id: 'PRIVACY', label: 'Privacy Policy', subtitle: 'Read Privacy Policy', icon: Lock },
          ].map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                if (menu.id === 'SHARE_APP') {
                  handleShare();
                } else {
                  setActiveModal(menu.id);
                }
              }}
              className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-xl border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-colors shrink-0">
                  <menu.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-yellow-500 transition-colors">{t(menu.label)}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{menu.subtitle}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Account Actions Section */}
      <motion.div variants={item} className="mx-4 mt-6 mb-8">
        <h3 className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest mb-3 flex items-center">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2" />
          Account Actions
        </h3>
        <div className="bg-pk-card border border-pk-border rounded-2xl overflow-hidden divide-y divide-zinc-900">
          <button
            onClick={handleAppLockClick}
            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="bg-green-500/10 text-green-500 p-2 rounded-xl border border-green-500/20 group-hover:bg-green-500 group-hover:text-black transition-colors shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-green-500 transition-colors">App Lock</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">PIN & Fingerprint</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="bg-red-500/10 text-red-500 p-2 rounded-xl border border-red-500/20 group-hover:bg-red-500 group-hover:text-black transition-colors shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-red-500 transition-colors">{t("Logout")}</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">{t("Sign out of your account")}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" />
          </button>
        </div>

        {/* Admin Panel Row */}
        {(currentUser.role === 'admin' || currentUser.email === 'alibabaappo@gmail.com') && (
          <div className="mt-4">
            <button onClick={() => navigate('/admin')} className="w-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center hover:bg-yellow-500/20 transition-colors">
              <Shield className="w-4 h-4 mr-2" /> ADMIN PANEL
            </button>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {document.getElementById('modal-root') ? createPortal((<>
      <AnimatePresence>
        {(activeModal === 'My Team' || activeModal === 'TEAMS') && (
          <TeamsScreen onClose={() => setActiveModal(null)} />
        )}

        {activeModal === 'EDIT_PROFILE' && (
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
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)] shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Edit2 className="w-4 h-4 mr-2" /> Edit Profile</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={onUpdateProfile} autoComplete="off" noValidate data-lpignore="true" className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Username</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        className={`w-full bg-zinc-900 border rounded-xl py-2.5 pl-4 pr-10 text-xs text-white focus:outline-none transition-colors ${
                          usernameStatus === 'taken' 
                            ? 'border-red-500/50 focus:border-red-500/50' 
                            : usernameStatus === 'available' 
                              ? 'border-green-500/50 focus:border-green-500/50' 
                              : 'border-zinc-800 focus:border-yellow-500/50'
                        }`} 
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value.replace(/\s+/g, '')})}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {usernameStatus === 'checking' && (
                          <div className="w-3.5 h-3.5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                        )}
                        {usernameStatus === 'available' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="text-[10px] text-red-500 font-bold">taken</span>
                        )}
                      </div>
                    </div>
                    {usernameStatus === 'taken' && (
                      <p className="text-[9px] text-red-400 mt-0.5 pl-1">This username already taken</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Profile Picture URL</label>
                    <input 
                      type="text" 
                      placeholder="Paste image URL here"
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                      value={editForm.avatarUrl}
                      onChange={(e) => setEditForm({...editForm, avatarUrl: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">In-Game Name</label>
                      <input 
                        type="text" 
                        autoComplete="off"
                        data-lpignore="true"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                        value={editForm.inGameName}
                        onChange={(e) => setEditForm({...editForm, inGameName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Game UID</label>
                      <input 
                        type="text" 
                        autoComplete="off"
                        data-lpignore="true"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                        value={editForm.gameUid}
                        onChange={(e) => setEditForm({...editForm, gameUid: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Bio</label>
                    <textarea 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 min-h-[60px] resize-none" 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      placeholder="Write your bio..."
                    />
                  </div>
                  <div className="pt-2 border-t border-zinc-900">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">New Password (Optional)</label>
                    <input 
                      type="password" 
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-gradient-pk text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" /> SAVE CHANGES
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {activeModal === 'Referral Program' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Users className="w-4 h-4 mr-2" /> Referral Program</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <h4 className="text-[10px] font-bold text-yellow-500 mb-1 uppercase">How it works</h4>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">
                    You will only get reward when your invited user Joined first paid match. Refer Reward is set by Admin panel.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Your Code</div>
                  <div className="flex items-center bg-black border border-yellow-500/30 rounded-lg p-2 w-full max-w-[200px]">
                    <span className="text-lg font-bold flex-1 text-center font-mono tracking-widest text-white">{currentUser?.referralCode || 'PKARENA25'}</span>
                    <button onClick={copyCode} className="text-yellow-500 hover:text-yellow-400"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Stats</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-zinc-500">Invited</div>
                      <div className="text-sm font-bold text-white">{currentUser?.referralsCount || 0}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-zinc-500">Earned</div>
                      <div className="text-sm font-bold text-yellow-500 flex items-center justify-center space-x-1">
                        <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
                        <span>{currentUser?.referralsEarned || 0}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Coins</span>
                      </div>
                    </div>
                  </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1 flex items-center justify-between">
                    <span>Recent Activity</span>
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                      <button 
                        onClick={() => setRefTab('PENDING')}
                        className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${refTab === 'PENDING' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        PENDING
                      </button>
                      <button 
                        onClick={() => setRefTab('PAID')}
                        className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${refTab === 'PAID' ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        ADDED
                      </button>
                    </div>
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const allActivities = currentUser?.referralActivity ? Object.values(currentUser.referralActivity) : [];
                      const filtered = allActivities.filter((act: any) => act.status === refTab).reverse();
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-6 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                            <div className="text-[10px] text-zinc-500">No {refTab.toLowerCase()} referrals found</div>
                          </div>
                        );
                      }

                      return filtered.map((act: any, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center mr-2">
                              <User className="w-3 h-3 text-zinc-400" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-white">{act.user}</div>
                              <div className="text-[8px] text-zinc-500">{act.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {act.status === 'PAID' ? (
                              <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center">
                                <img src={PK_COIN_ICON} alt="Coin" className="w-2.5 h-2.5 object-contain mr-1" />
                                +{act.reward} Coins
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center">Waiting for match</span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
        {activeModal === 'Match History' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Clock className="w-4 h-4 mr-2" /> Match History</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.status !== 'UPCOMING').length > 0 ? (
                  joinedMatches.filter(m => m.status !== 'UPCOMING').map((match, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col">
                      <div className="text-xs font-bold text-white mb-1">{match.title}</div>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[9px] text-zinc-500">{match.date}</span>
                         <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${match.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{match.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Clock className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No match history yet</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'Result History' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Trophy className="w-4 h-4 mr-2" /> Result History</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.rank).length > 0 ? (
                  joinedMatches.filter(m => m.rank).map((res, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col">
                      <div className="text-xs font-bold text-white mb-2">{res.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <div>Rank: <span className="font-bold text-white">#{res.rank}</span></div>
                        <div>Kills: <span className="font-bold text-white">{res.kills}</span></div>
                        <div className="text-yellow-500 font-bold flex items-center">
                          <img src={PK_COIN_ICON} alt="Coin" className="w-3 h-3 object-contain mr-1" />
                          + {res.reward} Coins
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Trophy className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No result history yet</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'Joined Tournaments' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Shield className="w-4 h-4 mr-2" /> Joined Tournaments</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.status === 'UPCOMING').length > 0 ? (
                  joinedMatches.filter(m => m.status === 'UPCOMING').map((tour, i) => {
                    const actualTour = tournaments.find(t => t.id === tour.tournamentId) || tour;
                    return (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col group hover:border-yellow-500/30 transition-colors">
                        <div className="text-xs font-bold text-white mb-2">{tour.title}</div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
                          <div className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {actualTour.date} {actualTour.time}</div>
                          <div className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">JOINED</div>
                        </div>
                        {actualTour.roomId && actualTour.roomId !== 'WAITING...' && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                            <div>
                               <div className="text-[9px] text-zinc-500 uppercase">Room ID</div>
                               <div className="flex items-center space-x-2">
                                 <div className="text-xs font-black text-white">{actualTour.roomId}</div>
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] text-zinc-500 uppercase">Password</div>
                               <div className="flex items-center space-x-2 justify-end">
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                 <div className="text-xs font-black text-white">{actualTour.password}</div>
                               </div>
                            </div>
                          </div>
                        )}
                        {(!actualTour.roomId || actualTour.roomId === 'WAITING...') && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Room Details Pending</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Shield className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No joined tournaments</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'HOW_TO_JOIN' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Play className="w-4 h-4 mr-2" /> How to Join</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  {[
                    { num: '1', title: 'Open Home Screen', desc: 'Browse the listed active tournaments.' },
                    { num: '2', title: 'Pick a Match', desc: 'Choose TDM, Erangle, or Livik & tap "JOIN MATCH".' },
                    { num: '3', title: 'Choose Slot', desc: 'Select an available slot number from the grid.' },
                    { num: '4', title: 'Confirm & Register', desc: 'Ensure you have enough coins, then confirm entry. Your In-Game Name and ID will be registered.' },
                    { num: '5', title: 'Get Room ID & Pass', desc: 'Wait for the Room ID and Password, which will be updated 10 minutes before the match start time.' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex space-x-3 bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {step.num}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{step.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a 
                  href="https://www.youtube.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-red-600/10"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span>Watch Video Tutorial</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'HALAL_OR_HARAM' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Shield className="w-4 h-4 mr-2" /> Halal or Haram?</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <span className="text-2xl block mb-1">⚖️</span>
                  <h4 className="text-sm font-black text-yellow-500 mt-2 uppercase">100% Skill-Based (Halal)</h4>
                  <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
                    Islamic scholars distinguish between games of chance (gambling/lottery) and skill-based competitions (sports/archery/gaming).
                  </p>
                </div>

                <div className="space-y-3 text-[10px] text-zinc-400 leading-relaxed">
                  <p>
                    <strong className="text-white uppercase font-bold">1. No Luck Element:</strong> Unlike Qimar (gambling) where outcomes are based on rolling dice or pure luck, PK ARENA PUBG Tournaments are based 100% on your game skills, effort, practice, and strategy.
                  </p>
                  <p>
                    <strong className="text-white uppercase font-bold">2. Entry Fee as Prize Contribution:</strong> Scholars agree that in competitive tournaments, entry fees used to build the prize pool and cover server administration costs are permissible (Mubah/Halal) when the prize reward represents payment for actual performance/skills.
                  </p>
                  <p>
                    <strong className="text-white uppercase font-bold">3. Islamic Jurisprudence:</strong> Similar to archery or horse racing contests in early Islamic history where contestants contributed and competed, PK ARENA PUBG provides a healthy, fair platform where your reward is earned directly through your own skill.
                  </p>
                </div>

                <div className="border-t border-zinc-800 pt-3 text-center text-[10px] text-zinc-500 italic">
                  "Alhamdulillah, PK ARENA PUBG guarantees a completely transparent, fair, and cheat-free environment for all gamers."
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'ABOUT' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Info className="w-4 h-4 mr-2" /> About App</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 text-center space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="w-16 h-16 bg-gradient-pk rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/10 p-1">
                  <img src={PK_LOGO_IMAGE} alt="PK ARENA PUBG" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">PK ARENA PUBG</h4>
                  <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-1">Pakistan's Best Tournament App</div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed text-justify bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
                  PK ARENA PUBG is Pakistan's premier automated mobile esports platform. We host premium, high-frequency competitive matches for games like PUBG Mobile. Gamers can join customized matches, test their battle coordination skills, claim the Booyah, and earn real monetary awards and wallet coins seamlessly.
                </p>

                <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-900">
                  © 2026 PK ARENA PUBG. All rights reserved.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'CUSTOMER_SUPPORT' && (
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
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><AlertTriangle className="w-4 h-4 mr-2" /> Support Ticket</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmitTicket} className="p-5 space-y-4 flex-1">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start space-x-3 mb-4">
                  <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-yellow-500 mb-0.5">Need Help?</div>
                    <div className="text-[10px] text-zinc-300">Submit a ticket and our support team will get back to you within 24 hours.</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Category</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 appearance-none"
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                    >
                      <option value="Wallet/Deposit">Wallet & Deposit Issues</option>
                      <option value="Match/Tournament">Match / Tournament Issues</option>
                      <option value="Account">Account Settings</option>
                      <option value="Bug">Report a Bug</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Description</label>
                    <textarea 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 min-h-[100px] resize-none" 
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Please describe your issue in detail..."
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-gradient-pk text-black font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center mt-2"
                >
                  SUBMIT TICKET
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'CHANGE_LANGUAGE' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Globe className="w-4 h-4 mr-2" /> Change Language</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto">
                {[
                  { id: 'Roman Urdu', label: 'Roman Urdu (اردو)', subtitle: 'Saray options Roman Urdu me dekhein' },
                  { id: 'English', label: 'English (US)', subtitle: 'Standard layout text display' },
                  { id: 'Urdu', label: 'Urdu (Beta)', subtitle: 'Urdu script font optimization' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setSelectedLang(lang.id as 'English' | 'Roman Urdu' | 'Urdu');
                      toast.success(`Language changed to ${lang.id}`);
                      setActiveModal(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                      selectedLang === lang.id 
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 border-yellow-500/50' 
                        : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{lang.label}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">{lang.subtitle}</div>
                    </div>
                    {selectedLang === lang.id && (
                      <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'TERMS' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><FileText className="w-4 h-4 mr-2" /> Terms & Conditions</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto scrollbar-hide text-[10px] text-zinc-400 leading-relaxed">
                <h4 className="text-xs font-bold text-white uppercase">User Agreement</h4>
                <p>Welcome to PK ARENA PUBG. By using this app, you agree to comply with the following regulations.</p>
                
                <h5 className="text-[10px] font-bold text-white uppercase mt-2">1. Account Information</h5>
                <p>Your In-Game Name and game UID must match exactly with the details configured in your profile. Incorrect details will lead to automated tournament lobbies rejecting your connection, with no refund of entry fees.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">2. Zero Tolerance Cheating</h5>
                <p>Using emulators, third-party macros, ESP hacks, aimbots, or colluding/teaming up in solo lobbies is strictly prohibited. PK ARENA PUBG anticheat systems will immediately flag and permanently ban offending accounts, freezing any remaining wallet balances.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">3. Match Refunds</h5>
                <p>Matches once locked cannot be refunded. Lobbies that are cancelled due to maintenance or structural errors will have coins credited back to the user's wallet automatically within 24 hours.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">4. Disclaimers</h5>
                <p>PK ARENA PUBG is not affiliated with, endorsed by, or associated directly with Garena or Free Fire. All intellectual trademarks belong to their respective developers.</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'PRIVACY' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Lock className="w-4 h-4 mr-2" /> Privacy Policy</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto scrollbar-hide text-[10px] text-zinc-400 leading-relaxed">
                <h4 className="text-xs font-bold text-white uppercase">Data Privacy Guidelines</h4>
                <p>We respect your privacy. This policy documents how we handle personal identifiers.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">1. Data Collected</h5>
                <p>We collect your Google profile details, phone numbers (for wallet payments), in-game nicknames, match analytics, transaction history, and operating system identifiers (for anticheat and notification routing).</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">2. How We Use Data</h5>
                <p>Data is strictly utilized for match coordination, secure deposit verification, anticheat checks, and processing withdrawals directly to Easypaisa and Jazzcash accounts.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">3. Third Party Policy</h5>
                <p>PK ARENA PUBG does not rent, sell, or disclose personal data or game IDs to any advertising networks or third-party brokers. All traffic is securely encrypted using standard TLS protocols.</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Share Modal */}
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Share2 className="w-4 h-4 mr-2" /> Share PK ARENA PUBG</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-400 text-center mb-6">Share your referral link with friends and start earning together!</p>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Earn With PUBG Mobile download now PK ARENA PUBG to earn exciting rewards. Use my referral code: ${currentUser?.referralCode || 'PKARENA25'}\n\nDownload Link: ${appSettings?.appLink || window.location.origin}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center bg-[#25D366]/10 border border-[#25D366]/30 p-4 rounded-xl hover:bg-[#25D366]/20 transition-colors"
                  >
                    <svg className="w-8 h-8 text-[#25D366] mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                    </svg>
                    <span className="text-[10px] font-bold text-[#25D366] uppercase">WhatsApp</span>
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(appSettings?.appLink || window.location.origin)}&text=${encodeURIComponent(`Earn With PUBG Mobile download now PK ARENA PUBG to earn exciting rewards. Use my referral code: ${currentUser?.referralCode || 'PKARENA25'}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center bg-[#0088cc]/10 border border-[#0088cc]/30 p-4 rounded-xl hover:bg-[#0088cc]/20 transition-colors"
                  >
                    <svg className="w-8 h-8 text-[#0088cc] mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="#0088cc"/>
                      <path d="M5.998 11.78l10.978-4.22c.51-.19.98.118.802.932l-1.874 8.815c-.15.68-.553.844-1.12.528l-3.096-2.28-1.493 1.44c-.166.166-.305.305-.625.305l.222-3.155 5.742-5.185c.25-.223-.054-.347-.388-.124l-7.098 4.47-3.064-.956c-.665-.208-.68-.666.14-.987z" fill="#ffffff"/>
                    </svg>
                    <span className="text-[10px] font-bold text-[#0088cc] uppercase">Telegram</span>
                  </a>
                </div>
                <button
                  onClick={() => { copyCode(); setIsShareModalOpen(false); }}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center hover:bg-zinc-800 transition-colors uppercase tracking-widest mt-4"
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'APP_LOCK' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Lock className="w-4 h-4 mr-2" /> Security Settings</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Enable App Lock</div>
                    <div className="text-[10px] text-zinc-400">Require PIN for sensitive actions</div>
                  </div>
                  <button 
                    onClick={handleToggleAppLock}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isAppLockEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-black transition-transform ${isAppLockEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {isAppLockEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-zinc-800">
                    <button 
                      onClick={async () => {
                        const authSuccess = await requirePinAuth();
                        if (authSuccess) {
                          setActiveModal(null);
                          setForcePinSetup(true);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 hover:border-yellow-500 hover:text-yellow-500 text-zinc-300 font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Change PIN
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

</>), document.getElementById('modal-root')!) : (<>
      <AnimatePresence>
        {(activeModal === 'My Team' || activeModal === 'TEAMS') && (
          <TeamsScreen onClose={() => setActiveModal(null)} />
        )}

        {activeModal === 'EDIT_PROFILE' && (
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
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)] shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Edit2 className="w-4 h-4 mr-2" /> Edit Profile</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={onUpdateProfile} autoComplete="off" noValidate data-lpignore="true" className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Username</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        className={`w-full bg-zinc-900 border rounded-xl py-2.5 pl-4 pr-10 text-xs text-white focus:outline-none transition-colors ${
                          usernameStatus === 'taken' 
                            ? 'border-red-500/50 focus:border-red-500/50' 
                            : usernameStatus === 'available' 
                              ? 'border-green-500/50 focus:border-green-500/50' 
                              : 'border-zinc-800 focus:border-yellow-500/50'
                        }`} 
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value.replace(/\s+/g, '')})}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        {usernameStatus === 'checking' && (
                          <div className="w-3.5 h-3.5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                        )}
                        {usernameStatus === 'available' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="text-[10px] text-red-500 font-bold">taken</span>
                        )}
                      </div>
                    </div>
                    {usernameStatus === 'taken' && (
                      <p className="text-[9px] text-red-400 mt-0.5 pl-1">This username already taken</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Profile Picture URL</label>
                    <input 
                      type="text" 
                      placeholder="Paste image URL here"
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                      value={editForm.avatarUrl}
                      onChange={(e) => setEditForm({...editForm, avatarUrl: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">In-Game Name</label>
                      <input 
                        type="text" 
                        autoComplete="off"
                        data-lpignore="true"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                        value={editForm.inGameName}
                        onChange={(e) => setEditForm({...editForm, inGameName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Game UID</label>
                      <input 
                        type="text" 
                        autoComplete="off"
                        data-lpignore="true"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                        value={editForm.gameUid}
                        onChange={(e) => setEditForm({...editForm, gameUid: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Bio</label>
                    <textarea 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 min-h-[60px] resize-none" 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      placeholder="Write your bio..."
                    />
                  </div>
                  <div className="pt-2 border-t border-zinc-900">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">New Password (Optional)</label>
                    <input 
                      type="password" 
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50" 
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-gradient-pk text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" /> SAVE CHANGES
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {activeModal === 'Referral Program' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Users className="w-4 h-4 mr-2" /> Referral Program</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <h4 className="text-[10px] font-bold text-yellow-500 mb-1 uppercase">How it works</h4>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">
                    You will only get reward when your invited user Joined first paid match. Refer Reward is set by Admin panel.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Your Code</div>
                  <div className="flex items-center bg-black border border-yellow-500/30 rounded-lg p-2 w-full max-w-[200px]">
                    <span className="text-lg font-bold flex-1 text-center font-mono tracking-widest text-white">{currentUser?.referralCode || 'PKARENA25'}</span>
                    <button onClick={copyCode} className="text-yellow-500 hover:text-yellow-400"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1">Stats</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-zinc-500">Invited</div>
                      <div className="text-sm font-bold text-white">{currentUser?.referralsCount || 0}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-zinc-500">Earned</div>
                      <div className="text-sm font-bold text-yellow-500 flex items-center justify-center space-x-1">
                        <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
                        <span>{currentUser?.referralsEarned || 0}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Coins</span>
                      </div>
                    </div>
                  </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 uppercase border-b border-zinc-800 pb-1 flex items-center justify-between">
                    <span>Recent Activity</span>
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                      <button 
                        onClick={() => setRefTab('PENDING')}
                        className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${refTab === 'PENDING' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        PENDING
                      </button>
                      <button 
                        onClick={() => setRefTab('PAID')}
                        className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${refTab === 'PAID' ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        ADDED
                      </button>
                    </div>
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const allActivities = currentUser?.referralActivity ? Object.values(currentUser.referralActivity) : [];
                      const filtered = allActivities.filter((act: any) => act.status === refTab).reverse();
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-6 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                            <div className="text-[10px] text-zinc-500">No {refTab.toLowerCase()} referrals found</div>
                          </div>
                        );
                      }

                      return filtered.map((act: any, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center mr-2">
                              <User className="w-3 h-3 text-zinc-400" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-white">{act.user}</div>
                              <div className="text-[8px] text-zinc-500">{act.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {act.status === 'PAID' ? (
                              <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center">
                                <img src={PK_COIN_ICON} alt="Coin" className="w-2.5 h-2.5 object-contain mr-1" />
                                +{act.reward} Coins
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center">Waiting for match</span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
        {activeModal === 'Match History' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Clock className="w-4 h-4 mr-2" /> Match History</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.status !== 'UPCOMING').length > 0 ? (
                  joinedMatches.filter(m => m.status !== 'UPCOMING').map((match, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col">
                      <div className="text-xs font-bold text-white mb-1">{match.title}</div>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[9px] text-zinc-500">{match.date}</span>
                         <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${match.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{match.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Clock className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No match history yet</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'Result History' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Trophy className="w-4 h-4 mr-2" /> Result History</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.rank).length > 0 ? (
                  joinedMatches.filter(m => m.rank).map((res, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col">
                      <div className="text-xs font-bold text-white mb-2">{res.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <div>Rank: <span className="font-bold text-white">#{res.rank}</span></div>
                        <div>Kills: <span className="font-bold text-white">{res.kills}</span></div>
                        <div className="text-yellow-500 font-bold flex items-center">
                          <img src={PK_COIN_ICON} alt="Coin" className="w-3 h-3 object-contain mr-1" />
                          + {res.reward} Coins
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Trophy className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No result history yet</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'Joined Tournaments' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Shield className="w-4 h-4 mr-2" /> Joined Tournaments</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {joinedMatches.filter(m => m.status === 'UPCOMING').length > 0 ? (
                  joinedMatches.filter(m => m.status === 'UPCOMING').map((tour, i) => {
                    const actualTour = tournaments.find(t => t.id === tour.tournamentId) || tour;
                    return (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col group hover:border-yellow-500/30 transition-colors">
                        <div className="text-xs font-bold text-white mb-2">{tour.title}</div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
                          <div className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {actualTour.date} {actualTour.time}</div>
                          <div className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">JOINED</div>
                        </div>
                        {actualTour.roomId && actualTour.roomId !== 'WAITING...' && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                            <div>
                               <div className="text-[9px] text-zinc-500 uppercase">Room ID</div>
                               <div className="flex items-center space-x-2">
                                 <div className="text-xs font-black text-white">{actualTour.roomId}</div>
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] text-zinc-500 uppercase">Password</div>
                               <div className="flex items-center space-x-2 justify-end">
                                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(actualTour.password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                 <div className="text-xs font-black text-white">{actualTour.password}</div>
                               </div>
                            </div>
                          </div>
                        )}
                        {(!actualTour.roomId || actualTour.roomId === 'WAITING...') && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Room Details Pending</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Shield className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No joined tournaments</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'HOW_TO_JOIN' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Play className="w-4 h-4 mr-2" /> How to Join</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  {[
                    { num: '1', title: 'Open Home Screen', desc: 'Browse the listed active tournaments.' },
                    { num: '2', title: 'Pick a Match', desc: 'Choose TDM, Erangle, or Livik & tap "JOIN MATCH".' },
                    { num: '3', title: 'Choose Slot', desc: 'Select an available slot number from the grid.' },
                    { num: '4', title: 'Confirm & Register', desc: 'Ensure you have enough coins, then confirm entry. Your In-Game Name and ID will be registered.' },
                    { num: '5', title: 'Get Room ID & Pass', desc: 'Wait for the Room ID and Password, which will be updated 10 minutes before the match start time.' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex space-x-3 bg-zinc-900/50 border border-zinc-800/40 rounded-xl p-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {step.num}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{step.title}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a 
                  href="https://www.youtube.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-red-600/10"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span>Watch Video Tutorial</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'HALAL_OR_HARAM' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Shield className="w-4 h-4 mr-2" /> Halal or Haram?</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <span className="text-2xl block mb-1">⚖️</span>
                  <h4 className="text-sm font-black text-yellow-500 mt-2 uppercase">100% Skill-Based (Halal)</h4>
                  <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
                    Islamic scholars distinguish between games of chance (gambling/lottery) and skill-based competitions (sports/archery/gaming).
                  </p>
                </div>

                <div className="space-y-3 text-[10px] text-zinc-400 leading-relaxed">
                  <p>
                    <strong className="text-white uppercase font-bold">1. No Luck Element:</strong> Unlike Qimar (gambling) where outcomes are based on rolling dice or pure luck, PK ARENA PUBG Tournaments are based 100% on your game skills, effort, practice, and strategy.
                  </p>
                  <p>
                    <strong className="text-white uppercase font-bold">2. Entry Fee as Prize Contribution:</strong> Scholars agree that in competitive tournaments, entry fees used to build the prize pool and cover server administration costs are permissible (Mubah/Halal) when the prize reward represents payment for actual performance/skills.
                  </p>
                  <p>
                    <strong className="text-white uppercase font-bold">3. Islamic Jurisprudence:</strong> Similar to archery or horse racing contests in early Islamic history where contestants contributed and competed, PK ARENA PUBG provides a healthy, fair platform where your reward is earned directly through your own skill.
                  </p>
                </div>

                <div className="border-t border-zinc-800 pt-3 text-center text-[10px] text-zinc-500 italic">
                  "Alhamdulillah, PK ARENA PUBG guarantees a completely transparent, fair, and cheat-free environment for all gamers."
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'ABOUT' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Info className="w-4 h-4 mr-2" /> About App</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 text-center space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                <div className="w-16 h-16 bg-gradient-pk rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/10 p-1">
                  <img src={PK_LOGO_IMAGE} alt="PK ARENA PUBG" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">PK ARENA PUBG</h4>
                  <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-1">Pakistan's Best Tournament App</div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed text-justify bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
                  PK ARENA PUBG is Pakistan's premier automated mobile esports platform. We host premium, high-frequency competitive matches for games like PUBG Mobile. Gamers can join customized matches, test their battle coordination skills, claim the Booyah, and earn real monetary awards and wallet coins seamlessly.
                </p>

                <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-900">
                  © 2026 PK ARENA PUBG. All rights reserved.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'CUSTOMER_SUPPORT' && (
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
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><AlertTriangle className="w-4 h-4 mr-2" /> Support Ticket</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmitTicket} className="p-5 space-y-4 flex-1">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start space-x-3 mb-4">
                  <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-yellow-500 mb-0.5">Need Help?</div>
                    <div className="text-[10px] text-zinc-300">Submit a ticket and our support team will get back to you within 24 hours.</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Category</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 appearance-none"
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                    >
                      <option value="Wallet/Deposit">Wallet & Deposit Issues</option>
                      <option value="Match/Tournament">Match / Tournament Issues</option>
                      <option value="Account">Account Settings</option>
                      <option value="Bug">Report a Bug</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold mb-1 block">Description</label>
                    <textarea 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 min-h-[100px] resize-none" 
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Please describe your issue in detail..."
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-gradient-pk text-black font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center mt-2"
                >
                  SUBMIT TICKET
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'CHANGE_LANGUAGE' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Globe className="w-4 h-4 mr-2" /> Change Language</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto">
                {[
                  { id: 'Roman Urdu', label: 'Roman Urdu (اردو)', subtitle: 'Saray options Roman Urdu me dekhein' },
                  { id: 'English', label: 'English (US)', subtitle: 'Standard layout text display' },
                  { id: 'Urdu', label: 'Urdu (Beta)', subtitle: 'Urdu script font optimization' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setSelectedLang(lang.id as 'English' | 'Roman Urdu' | 'Urdu');
                      toast.success(`Language changed to ${lang.id}`);
                      setActiveModal(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                      selectedLang === lang.id 
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 border-yellow-500/50' 
                        : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{lang.label}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">{lang.subtitle}</div>
                    </div>
                    {selectedLang === lang.id && (
                      <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'TERMS' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><FileText className="w-4 h-4 mr-2" /> Terms & Conditions</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto scrollbar-hide text-[10px] text-zinc-400 leading-relaxed">
                <h4 className="text-xs font-bold text-white uppercase">User Agreement</h4>
                <p>Welcome to PK ARENA PUBG. By using this app, you agree to comply with the following regulations.</p>
                
                <h5 className="text-[10px] font-bold text-white uppercase mt-2">1. Account Information</h5>
                <p>Your In-Game Name and game UID must match exactly with the details configured in your profile. Incorrect details will lead to automated tournament lobbies rejecting your connection, with no refund of entry fees.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">2. Zero Tolerance Cheating</h5>
                <p>Using emulators, third-party macros, ESP hacks, aimbots, or colluding/teaming up in solo lobbies is strictly prohibited. PK ARENA PUBG anticheat systems will immediately flag and permanently ban offending accounts, freezing any remaining wallet balances.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">3. Match Refunds</h5>
                <p>Matches once locked cannot be refunded. Lobbies that are cancelled due to maintenance or structural errors will have coins credited back to the user's wallet automatically within 24 hours.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">4. Disclaimers</h5>
                <p>PK ARENA PUBG is not affiliated with, endorsed by, or associated directly with Garena or Free Fire. All intellectual trademarks belong to their respective developers.</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'PRIVACY' && (
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
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Lock className="w-4 h-4 mr-2" /> Privacy Policy</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3 flex-1 overflow-y-auto scrollbar-hide text-[10px] text-zinc-400 leading-relaxed">
                <h4 className="text-xs font-bold text-white uppercase">Data Privacy Guidelines</h4>
                <p>We respect your privacy. This policy documents how we handle personal identifiers.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">1. Data Collected</h5>
                <p>We collect your Google profile details, phone numbers (for wallet payments), in-game nicknames, match analytics, transaction history, and operating system identifiers (for anticheat and notification routing).</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">2. How We Use Data</h5>
                <p>Data is strictly utilized for match coordination, secure deposit verification, anticheat checks, and processing withdrawals directly to Easypaisa and Jazzcash accounts.</p>

                <h5 className="text-[10px] font-bold text-white uppercase mt-2">3. Third Party Policy</h5>
                <p>PK ARENA PUBG does not rent, sell, or disclose personal data or game IDs to any advertising networks or third-party brokers. All traffic is securely encrypted using standard TLS protocols.</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Share Modal */}
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Share2 className="w-4 h-4 mr-2" /> Share PK ARENA PUBG</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-400 text-center mb-6">Share your referral link with friends and start earning together!</p>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Earn With PUBG Mobile download now PK ARENA PUBG to earn exciting rewards. Use my referral code: ${currentUser?.referralCode || 'PKARENA25'}\n\nDownload Link: ${appSettings?.appLink || window.location.origin}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center bg-[#25D366]/10 border border-[#25D366]/30 p-4 rounded-xl hover:bg-[#25D366]/20 transition-colors"
                  >
                    <svg className="w-8 h-8 text-[#25D366] mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                    </svg>
                    <span className="text-[10px] font-bold text-[#25D366] uppercase">WhatsApp</span>
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(appSettings?.appLink || window.location.origin)}&text=${encodeURIComponent(`Earn With PUBG Mobile download now PK ARENA PUBG to earn exciting rewards. Use my referral code: ${currentUser?.referralCode || 'PKARENA25'}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center bg-[#0088cc]/10 border border-[#0088cc]/30 p-4 rounded-xl hover:bg-[#0088cc]/20 transition-colors"
                  >
                    <svg className="w-8 h-8 text-[#0088cc] mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="#0088cc"/>
                      <path d="M5.998 11.78l10.978-4.22c.51-.19.98.118.802.932l-1.874 8.815c-.15.68-.553.844-1.12.528l-3.096-2.28-1.493 1.44c-.166.166-.305.305-.625.305l.222-3.155 5.742-5.185c.25-.223-.054-.347-.388-.124l-7.098 4.47-3.064-.956c-.665-.208-.68-.666.14-.987z" fill="#ffffff"/>
                    </svg>
                    <span className="text-[10px] font-bold text-[#0088cc] uppercase">Telegram</span>
                  </a>
                </div>
                <button
                  onClick={() => { copyCode(); setIsShareModalOpen(false); }}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center hover:bg-zinc-800 transition-colors uppercase tracking-widest mt-4"
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === 'APP_LOCK' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase"><Lock className="w-4 h-4 mr-2" /> Security Settings</h3>
                <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Enable App Lock</div>
                    <div className="text-[10px] text-zinc-400">Require PIN for sensitive actions</div>
                  </div>
                  <button 
                    onClick={handleToggleAppLock}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isAppLockEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-black transition-transform ${isAppLockEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {isAppLockEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-zinc-800">
                    <button 
                      onClick={async () => {
                        const authSuccess = await requirePinAuth();
                        if (authSuccess) {
                          setActiveModal(null);
                          setForcePinSetup(true);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 hover:border-yellow-500 hover:text-yellow-500 text-zinc-300 font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Change PIN
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

</>)}
    </motion.div>
  );
}

