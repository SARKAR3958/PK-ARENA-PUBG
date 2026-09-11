import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Mail, Edit2, Gamepad2, Hash, Phone, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { GoogleSignInHelperModal } from '../components/GoogleSignInHelperModal';
import { stopAuthBgSound } from '../lib/sound';

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleHelperOpen, setIsGoogleHelperOpen] = useState(false);
  const navigate = useNavigate();
  const { signInWithGoogle, currentUser, registerManual, checkUsernameExists } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inGameName: '',
    gameUid: '',
    phoneNumber: '',
    referralCode: ''
  });

  useEffect(() => {
    if (currentUser) {
      stopAuthBgSound();
      navigate('/home');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const u = formData.username.trim();
      if (u.length >= 3) {
        setUsernameStatus('checking');
        try {
          const exists = await checkUsernameExists(u);
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
  }, [formData.username, checkUsernameExists]);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    if (usernameStatus === 'taken') {
      toast.error('This username is already taken!');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    if (formData.phoneNumber.length !== 10) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }

    const data = {
      username: formData.username,
      inGameName: formData.inGameName,
      gameUid: formData.gameUid,
      phone: `+92${formData.phoneNumber}`,
      referredBy: formData.referralCode
    };

    setIsLoading(true);
    try {
       await registerManual(formData.email, formData.password, data);
       stopAuthBgSound();
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
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
        toast.error(err.message || 'Google signup failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedGoogleRegisterAnyway = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      stopAuthBgSound();
    } catch (err: any) {
      toast.error(err.message || 'Google signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <AuthLayout title="CREATE ACCOUNT" subtitle="JOIN PK ARENA PUBG AND START YOUR JOURNEY">
      <GoogleSignInHelperModal
        isOpen={isGoogleHelperOpen}
        onClose={() => setIsGoogleHelperOpen(false)}
        onProceedAnyway={handleProceedGoogleRegisterAnyway}
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
            transition: { staggerChildren: 0.05 }
          }
        }}
        onSubmit={handleRegister} 
        className="flex flex-col flex-1 pb-10"
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
              className={`w-full bg-zinc-900/50 border rounded-xl py-2.5 pl-9 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 transition-colors ${
                usernameStatus === 'taken' 
                  ? 'border-red-500/50 focus:border-red-500/50' 
                  : usernameStatus === 'available' 
                    ? 'border-green-500/50 focus:border-green-500/50' 
                    : 'border-zinc-800 focus:border-yellow-500/50'
              }`} 
              placeholder="Username" 
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value.replace(/\s+/g, '')})}
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

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <input 
              type="email" 
              required
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
              placeholder="Email Address" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Gamepad2 className="h-3.5 w-3.5 text-zinc-500" />
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
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
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
                placeholder="Game UID" 
                value={formData.gameUid}
                onChange={(e) => setFormData({...formData, gameUid: e.target.value})}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-bold text-zinc-500">+92</span>
            </div>
            <input 
              type="tel" 
              required
              maxLength={10}
              disabled={isLoading}
              autoComplete="off"
              data-lpignore="true"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
              placeholder="3XXXXXXXXX (10 Digits)" 
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
                placeholder="Password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
                placeholder="Confirm" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-1">
            <button 
              type="button" 
              disabled={isLoading}
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPassword ? 'Hide Passwords' : 'Show Passwords'}
            </button>
          </div>

          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">REF</span>
            </div>
            <input 
              type="text" 
              disabled={isLoading}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" 
              placeholder="Referral Code (Optional)" 
              value={formData.referralCode}
              onChange={(e) => setFormData({...formData, referralCode: e.target.value.toUpperCase()})}
            />
          </div>
        </motion.div>

        <motion.button 
          variants={item} 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3 rounded-xl text-xs tracking-wide mt-6 shadow-lg shadow-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'PROCESSING...' : 'CREATE ACCOUNT'}
        </motion.button>

        <motion.div variants={item} className="mt-auto pt-6 text-center text-[10px] text-zinc-400">
          Already have an account?{' '}
          <Link to="/" className="text-yellow-500 hover:text-yellow-400 font-semibold">Login</Link>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
