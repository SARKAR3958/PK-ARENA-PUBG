import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCheck, Clock, Trophy, Wallet, Sparkles, MessageSquare, ShieldAlert } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  url?: string;
  type?: string;
  createdAt: number;
  isGlobal?: boolean;
}

interface UserNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead?: () => void;
}

export function UserNotificationsModal({ isOpen, onClose, onMarkAllRead }: UserNotificationsModalProps) {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (onMarkAllRead) {
      onMarkAllRead();
    }
  }, [isOpen, onMarkAllRead]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const uid = currentUser.uid;
    const globalRef = ref(db, 'notifications');
    const userRef = ref(db, `userNotifications/${uid}`);

    let globalList: AppNotification[] = [];
    let userList: AppNotification[] = [];

    const unsubscribeGlobal = onValue(globalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        globalList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id: `global_${id}`,
          title: val.title || 'Announcement',
          message: val.message || '',
          url: val.url || '',
          type: val.type || 'BROADCAST',
          createdAt: typeof val.createdAt === 'number' ? val.createdAt : Date.now(),
          isGlobal: true,
        }));
      } else {
        globalList = [];
      }
      combineAndSet();
    });

    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        userList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id: `user_${id}`,
          title: val.title || 'Notification',
          message: val.message || '',
          url: val.url || '',
          type: val.type || 'USER',
          createdAt: typeof val.createdAt === 'number' ? val.createdAt : (val.timestamp || Date.now()),
          isGlobal: false,
        }));
      } else {
        userList = [];
      }
      combineAndSet();
    });

    function combineAndSet() {
      const combined = [...globalList, ...userList];
      combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(combined);
      setLoading(false);
    }

    return () => {
      unsubscribeGlobal();
      unsubscribeUser();
    };
  }, [currentUser?.uid]);

  const getNotificationIcon = (title: string, message: string, type?: string) => {
    const text = `${title} ${message} ${type}`.toLowerCase();
    if (text.includes('won') || text.includes('winner') || text.includes('victory') || text.includes('prize') || text.includes('trophy')) {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    }
    if (text.includes('deposit') || text.includes('coin') || text.includes('balance') || text.includes('withdraw') || text.includes('wallet')) {
      return <Wallet className="w-5 h-5 text-emerald-400" />;
    }
    if (text.includes('room') || text.includes('match') || text.includes('id:') || text.includes('pass:')) {
      return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
    if (text.includes('support') || text.includes('chat') || text.includes('message') || text.includes('reply')) {
      return <MessageSquare className="w-5 h-5 text-blue-400" />;
    }
    if (text.includes('ban') || text.includes('warn') || text.includes('alert') || text.includes('failed') || text.includes('rejected')) {
      return <ShieldAlert className="w-5 h-5 text-red-400" />;
    }
    return <Bell className="w-5 h-5 text-yellow-500" />;
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Recently';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

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
                <Bell className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Notifications
                  <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">
                    {notifications.length}
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">All notifications & updates</p>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide max-h-[55vh]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Bell className="w-7 h-7 text-zinc-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No Notifications</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">You're all caught up! New alerts will appear here.</p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-zinc-900/70 border border-zinc-800/90 hover:border-yellow-500/30 p-3.5 rounded-2xl transition-all flex items-start space-x-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(notif.title, notif.message, notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-white tracking-tight truncate group-hover:text-yellow-400 transition-colors">
                        {notif.title}
                      </h4>
                      <span className="text-[9px] text-zinc-500 shrink-0 font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed break-words font-normal whitespace-pre-wrap">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium ml-1">
              <CheckCheck className="w-3.5 h-3.5 text-yellow-500" />
              <span>Marked as read</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-yellow-500 text-black font-black text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
