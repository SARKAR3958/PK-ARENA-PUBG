import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { PasswordResetModal } from '../components/PasswordResetModal';
import { GoogleSignInHelperModal } from '../components/GoogleSignInHelperModal';
import { stopAuthBgSound } from '../lib/sound';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isGoogleHelperOpen, setIsGoogleHelperOpen] = useState(false);
  const navigate = useNavigate();
  const { signInWithGoogle, currentUser, loginManual, appSettings } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      stopAuthBgSound();
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!email || !password) {
      toast.error('Please enter email/username and password');
      return;
    }
    setIsLoading(true);
    try {
      await loginManual(email, password);
      stopAuthBgSound();
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    // Check if inside WebView (common in APK wrappers)
    const isWebView = /wv|Android|iPhone|iPad/i.test(navigator.userAgent) && !/Safari/i.test(navigator.userAgent);
    if (isWebView) {
      setIsGoogleHelperOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      await signInWithGoogle();
      stopAuthBgSound();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/disallowed-useragent' || err.message?.includes('useragent') || err.message?.includes('disallowed')) {
        setIsGoogleHelperOpen(true);
      } else {
        toast.error(err.message || 'Google sign in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedGoogleLoginAnyway = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResetModalOpen(true);
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <AuthLayout title="WELCOME BACK" subtitle="Login to continue your journey">
      <PasswordResetModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
      />
      <GoogleSignInHelperModal
        isOpen={isGoogleHelperOpen}
        onClose={() => setIsGoogleHelperOpen(false)}
        onProceedAnyway={handleProceedGoogleLoginAnyway}
      />
      <motion.form 
        initial="hidden"
        animate="show"
        autoComplete="off"
        noValidate
        data-lpignore="true"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        onSubmit={handleLogin} 
        className="flex flex-col flex-1"
      >
        <motion.div variants={item} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <input 
              type="text" 
              required
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-colors disabled:opacity-50"
              placeholder="Email or Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              disabled={isLoading}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              data-form-type="other"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 transition-colors disabled:opacity-50"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5 text-zinc-500" /> : <Eye className="h-3.5 w-3.5 text-zinc-500" />}
            </button>
          </div>
        </motion.div>

        <motion.div variants={item} className="flex items-center justify-between mt-3 mb-5 text-[10px]">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-sm border border-yellow-500 flex items-center justify-center bg-yellow-500/20">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-sm" />
            </div>
            <span className="text-zinc-300">Remember me</span>
          </label>
          <button 
            type="button"
            disabled={isLoading}
            onClick={handleForgotPassword}
            className="text-yellow-500 hover:text-yellow-400 disabled:opacity-50"
          >
            Forgot Password?
          </button>
        </motion.div>

        <motion.button 
          variants={item}
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-2.5 rounded-xl text-xs tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'PROCESSING...' : 'LOGIN'}
        </motion.button>

        <motion.div variants={item} className="mt-auto pt-5 text-center text-[10px] text-zinc-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-yellow-500 hover:text-yellow-400 font-semibold">Sign Up</Link>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
