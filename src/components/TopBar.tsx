import { useState, useEffect } from 'react';
import { ChevronLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR } from '../lib/assets';
import { UserNotificationsModal } from './UserNotificationsModal';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export function TopBar({ showBack = false }: { showBack?: boolean }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const user = currentUser || {
    username: 'Gamer',
    avatarUrl: DEFAULT_AVATAR
  };

  const getStorageKey = () => `pk_last_read_notif_${currentUser?.uid || 'guest'}`;

  // Listen to notifications and calculate unread count
  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadCount(0);
      return;
    }

    const lastRead = Number(localStorage.getItem(getStorageKey()) || '0');
    const globalRef = ref(db, 'notifications');
    const userRef = ref(db, `userNotifications/${currentUser.uid}`);

    let globalItems: any[] = [];
    let userItems: any[] = [];

    const calculateUnread = () => {
      const currentLastRead = Number(localStorage.getItem(getStorageKey()) || '0');
      let count = 0;
      globalItems.forEach(item => {
        const time = typeof item.createdAt === 'number' ? item.createdAt : 0;
        if (time > currentLastRead) count++;
      });
      userItems.forEach(item => {
        const time = typeof item.createdAt === 'number' ? item.createdAt : (item.timestamp || 0);
        if (time > currentLastRead) count++;
      });
      setUnreadCount(count);
    };

    const unsubGlobal = onValue(globalRef, (snap) => {
      const val = snap.val();
      globalItems = val ? Object.values(val) : [];
      calculateUnread();
    });

    const unsubUser = onValue(userRef, (snap) => {
      const val = snap.val();
      userItems = val ? Object.values(val) : [];
      calculateUnread();
    });

    return () => {
      unsubGlobal();
      unsubUser();
    };
  }, [currentUser?.uid]);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    handleMarkAllRead();
  };

  const handleMarkAllRead = () => {
    localStorage.setItem(getStorageKey(), Date.now().toString());
    setUnreadCount(0);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 pb-2 z-50 relative bg-zinc-950">
        <div className="flex items-center space-x-3">
          {showBack ? (
            <button onClick={() => navigate(-1)} className="text-zinc-400 p-1 -ml-1 hover:text-white transition-colors">
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

        <div className="flex items-center space-x-2.5">
          {/* Balance Display */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 shadow-[0_0_10px_rgba(234,179,8,0.15)]">
            <img src={PK_COIN_ICON} alt="Coins" className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
            <span className="text-xs font-black text-yellow-500 tracking-tight">{currentUser?.walletBalance || 0}</span>
          </div>

          {/* Notification Bell Icon */}
          <button
            onClick={handleOpenNotifications}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800/90 hover:border-yellow-500/40 text-zinc-300 hover:text-yellow-400 flex items-center justify-center transition-all relative shadow-sm active:scale-95"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 border-2 border-zinc-950 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <UserNotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  );
}

