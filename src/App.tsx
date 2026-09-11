import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Login } from './screens/Login';
import { Register } from './screens/Register';
import { Home } from './screens/Home';
import { Wallet } from './screens/Wallet';
import { Profile } from './screens/Profile';
import { Leaderboard } from './screens/Leaderboard';
import { Teams } from './screens/Teams';
import { SupportChat } from './screens/SupportChat';
import { AdminDashboard } from './screens/AdminDashboard';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { useApp } from './context/AppContext';
import { initOneSignal } from './lib/onesignal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PK_LOGO_IMAGE } from './lib/assets';
import { isMedianApp } from './lib/deviceCheck';
import { AccessDenied404 } from './components/AccessDenied404';

export default function App() {
  const { loading, appSettings, currentUser } = useApp();

  // If opening in standard web browser (Chrome, Safari, PC etc.) without Median / WebView, show 404
  if (!isMedianApp()) {
    return <AccessDenied404 />;
  }

  useEffect(() => {
    initOneSignal();

    // Disable pinch-to-zoom on mobile devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Disable double-tap zoom
    let lastTouchTime = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = new Date().getTime();
      if (now - lastTouchTime <= 300) {
        e.preventDefault();
      }
      lastTouchTime = now;
    };
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Also prevent gesturestart events on iOS
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, []);

  if (currentUser?.isBanned || currentUser?.status === 'banned') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-8 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20">
           <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
        </div>
        <h1 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-4">Account Restricted</h1>
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-sm mx-auto space-y-4">
          <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest">Reason for Restriction</p>
          <p className="text-white text-sm font-medium leading-relaxed italic">
            "{currentUser.banReason || 'No specific reason provided. Please contact support for more information.'}"
          </p>
        </div>
        <button 
          onClick={() => window.location.href = 'mailto:support@pakarena.com'}
          className="mt-10 px-8 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 uppercase tracking-widest hover:bg-zinc-800 transition-all"
        >
           Appeal Restriction
        </button>
      </div>
    );
  }

  const isMaintenanceMode = appSettings?.isMaintenanceMode;
  const isAdmin = currentUser?.role === 'admin';
  const isLoginPage = window.location.pathname === '/' || window.location.pathname === '/register';
  const isAdminPage = window.location.pathname.startsWith('/admin');

  if (isMaintenanceMode && !isAdmin && !isAdminPage) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-8">
          <img src={PK_LOGO_IMAGE} className="w-full h-full rounded-2xl object-cover shadow-[0_0_25px_rgba(234,179,8,0.2)]" alt="PK ARENA PUBG Logo" />
        </div>
        <h1 className="text-2xl font-black text-yellow-500 uppercase tracking-widest mb-4">Under Maintenance</h1>
        <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
          {appSettings.maintenanceMessage || 'We are currently upgrading our systems for a better gaming experience. We will be back online shortly.'}
        </p>
        <div className="mt-10 px-6 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
           Status: SYSTEM_UPGRADE_IN_PROGRESS
        </div>
        {isLoginPage && (
          <p className="mt-6 text-[10px] text-zinc-600 uppercase tracking-widest">Admin? Access dashboard to disable.</p>
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SplashScreen isLoading={loading} />
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #3f3f46',
            fontSize: '12px'
          },
          success: {
            iconTheme: {
              primary: '#eab308',
              secondary: '#18181b',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        <Route element={<ProtectedRoute><Layout /><OnboardingModal /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/tournaments" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/support" element={<SupportChat />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
