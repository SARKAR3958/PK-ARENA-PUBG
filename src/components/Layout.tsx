import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingModal } from './OnboardingModal';
import { AppPopupModal } from './AppPopupModal';
import { GoldenParticlesBg } from './GoldenParticlesBg';
import { Headset } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { firestore } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { startInAppMusic, stopInAppMusic } from '../lib/sound';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const isSupportPage = location.pathname === '/support';
  const [resetKey, setResetKey] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const COLLECTION_NAME = 'PK-Arena_Support_ChaT';

  useEffect(() => {
    if (!currentUser?.uid || isSupportPage) {
      setUnreadCount(0);
      return;
    }

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
  }, [currentUser?.uid, isSupportPage]);

  // Global In-App background music running across Home, Matches, Wallet, Profile, etc.
  // Starts 500ms after landing on Home screen or completing PIN setup
  useEffect(() => {
    const isAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
    const isPinBlocking = currentUser && !isAdmin && !currentUser.appLockPin;

    if (!isPinBlocking) {
      startInAppMusic(500);
    }

    return () => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath === '/' || currentPath === '/register') {
        stopInAppMusic();
      }
    };
  }, [currentUser?.appLockPin, currentUser?.uid]);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setResetKey(prev => prev + 1);
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Reset button position when changing routes (wallet, profile, etc.)
  useEffect(() => {
    setResetKey(prev => prev + 1);
  }, [location.pathname]);

  return (
    <div className="flex justify-center min-h-screen bg-black sm:py-4">
      <div className="w-full max-w-[400px] h-[100dvh] sm:h-[90vh] bg-zinc-950 sm:rounded-[40px] sm:border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col font-sans">
        <GoldenParticlesBg />
        <OnboardingModal />
        <AppPopupModal />
        {!isSupportPage && <TopBar />}
        
        <div className={`flex-1 overflow-hidden relative ${!isSupportPage ? 'pb-20' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide ${!isSupportPage ? 'pb-20' : ''}`}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Support Button */}
        {!isSupportPage && (
          <motion.button
            key={resetKey}
            drag
            dragConstraints={{ left: -150, right: 0, top: -400, bottom: 0 }}
            dragElastic={0.1}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, cursor: 'grabbing' }}
            onClick={() => navigate('/support')}
            className="fixed bottom-24 right-[calc(50%-180px)] sm:right-auto sm:left-[calc(50%+120px)] lg:left-[calc(50%+140px)] z-[60] w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(234,179,8,0.4)] border-2 border-zinc-950 active:shadow-none transition-shadow cursor-grab active:cursor-grabbing"
            style={{
              // For mobile within the centered container
              position: 'absolute',
              bottom: '90px',
              right: '20px',
            }}
          >
            <div className="relative pointer-events-none">
              <Headset className="w-7 h-7 text-black" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg animate-bounce">
                  {unreadCount}
                </div>
              )}
            </div>
          </motion.button>
        )}

        <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto"></div>
        
        {!isSupportPage && <BottomNav />}
      </div>
    </div>
  );
}
