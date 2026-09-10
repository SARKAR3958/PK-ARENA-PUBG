import { Bell, Settings, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { useApp } from '../context/AppContext';

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR } from '../lib/assets';

export function TopBar({ showBack = false }: { showBack?: boolean }) {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const publicRef = ref(db, 'notifications');
    const privateRef = currentUser?.uid ? ref(db, `userNotifications/${currentUser.uid}`) : null;

    let publicList: any[] = [];
    let privateList: any[] = [];

    const updateCombined = () => {
      const combined = [...publicList, ...privateList];
      combined.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(combined);
    };

    const unsubPublic = onValue(publicRef, (snapshot) => {
      const data = snapshot.val();
      publicList = data ? Object.values(data) : [];
      updateCombined();
    });

    let unsubPrivate: (() => void) | null = null;
    if (privateRef) {
      unsubPrivate = onValue(privateRef, (snapshot) => {
        const data = snapshot.val();
        privateList = data ? Object.values(data) : [];
        updateCombined();
      });
    }

    return () => {
      unsubPublic();
      if (unsubPrivate) unsubPrivate();
    };
  }, [currentUser?.uid]);

  const navigate = useNavigate();

  const user = currentUser || {
    username: 'Gamer',
    avatarUrl: DEFAULT_AVATAR
  };

  return (
    <div className="flex items-center justify-between p-4 pb-2 z-50 relative bg-zinc-950">
      <div className="flex items-center space-x-3">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="text-zinc-400 p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}
        
        <div className="w-10 h-10 rounded-2xl border-2 border-yellow-500/40 overflow-hidden p-0.5 shadow-[0_0_15px_rgba(234,179,8,0.2)] bg-black/50">
          <img src={PK_LOGO_IMAGE} alt="PK ARENA PUBG" className="w-full h-full rounded-xl object-cover" />
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-zinc-400">Welcome back,</span>
          <span className="text-sm text-white font-bold tracking-tight">{user.username}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 shadow-[0_0_10px_rgba(234,179,8,0.15)]">
          <img src={PK_COIN_ICON} alt="Coins" className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
          <span className="text-xs font-black text-yellow-500 tracking-tight">{currentUser?.walletBalance || 0}</span>
        </div>
        
        <button onClick={() => setShowNotifications(true)} className="relative text-zinc-400 hover:text-white transition-colors p-1">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-950" />
        </button>
      </div>

      <AnimatePresence>
        {showNotifications && (
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
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h3 className="text-sm font-black text-white flex items-center uppercase tracking-widest"><Bell className="w-4 h-4 mr-2 text-yellow-500" /> Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4">
                      <div className="text-xs font-bold text-white mb-1.5">{n.title}</div>
                      <div className="text-[10px] text-zinc-400 leading-relaxed mb-3">{n.message}</div>
                      <div className="flex items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest"><Clock className="w-3 h-3 mr-1" /> {new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <Bell className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No Notifications</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
