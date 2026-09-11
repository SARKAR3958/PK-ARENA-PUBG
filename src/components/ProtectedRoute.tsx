import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { stopAuthBgSound } from '../lib/sound';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useApp();

  useEffect(() => {
    stopAuthBgSound();
  }, []);

  if (loading) return null; // Splash screen handles this

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
