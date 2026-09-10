import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useApp();

  if (loading) return null; // Splash screen handles this

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
