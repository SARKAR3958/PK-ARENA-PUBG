import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, KeyRound, Mail, Info, Globe, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoogleSignInHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedAnyway: () => void;
}

export function GoogleSignInHelperModal({ isOpen, onClose, onProceedAnyway }: GoogleSignInHelperModalProps) {
  const [activeTab, setActiveTab] = useState<'hindi' | 'english'>('hindi');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 "
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">APK Google Sign-In Guide</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Language Tabs */}
          <div className="flex border-b border-zinc-900 bg-zinc-900/20 p-1">
            <button
              onClick={() => setActiveTab('hindi')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'hindi' 
                  ? 'bg-yellow-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
              }`}
            >
              🇮🇳 Hindi / Urdu
            </button>
            <button
              onClick={() => setActiveTab('english')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'english' 
                  ? 'bg-yellow-500 text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
              }`}
            >
              🇬🇧 English Guide
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-xs text-zinc-300">
            {activeTab === 'hindi' ? (
              <>
                <p className="leading-relaxed text-zinc-400 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  Google security policy ke mutabik, <strong className="text-white">Direct WebView (App ke andar)</strong> me Google Sign-In block hota hai. Isko apni APK me chalane ke liye niche diye gye do tariko me se ek use karein:
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <Globe className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white mb-1">1. APK Settings (Chrome Custom Tabs)</h4>
                      <p className="leading-relaxed text-zinc-400">
                        Aap jis bhi website-to-apk converter ya wrapper tool ko use kar rhe hain, uski settings me <span className="text-yellow-500 font-semibold">"Chrome Custom Tabs"</span> ya <span className="text-yellow-500 font-semibold">"Use System Browser"</span> ko enable karein. Isse Google Sign-In direct Chrome browser me open hoga aur seamlessly login karega.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <KeyRound className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white mb-1">2. SHA-1 Key Add Karein (Crucial)</h4>
                      <p className="leading-relaxed text-zinc-400">
                        Apne Firebase Console me jaakar Project Settings me Android App add karein aur wahan apni signed APK ki <span className="text-yellow-500 font-semibold">SHA-1 Certificate Fingerprint</span> register karein, warna Firebase requests reject kar dega.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/20">
                    <Mail className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-yellow-500 mb-1">3. Sabse Easy Fallback (Email & Password)</h4>
                      <p className="leading-relaxed text-zinc-400">
                        Agar aap bina kisi configurations ke 100% stable login chahte hain, to users ko bolen ki wo <span className="text-white font-semibold">Email aur Password se Direct Register</span> karein. Ye mobile APKs me bina kisi extra setting ke perfectly kaam karega.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="leading-relaxed text-zinc-400 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900">
                  According to Google's security guidelines, <strong className="text-white">Direct WebViews (embedded inside APKs)</strong> are blocked from standard Google OAuth. Follow these methods to make Google Sign-In work on your compiled APK:
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <Globe className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white mb-1">1. Enable Chrome Custom Tabs</h4>
                      <p className="leading-relaxed text-zinc-400">
                        In your Website-to-APK builder, enable the <span className="text-yellow-500 font-semibold">"Chrome Custom Tabs"</span> or <span className="text-yellow-500 font-semibold">"Use External Browser"</span> option. This launches the Google login flow inside a native system-supported Chrome context.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <KeyRound className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white mb-1">2. Register SHA-1 Fingerprint</h4>
                      <p className="leading-relaxed text-zinc-400">
                        Go to your Firebase Console, open Project Settings, add your Android App with its package name, and register your APK's <span className="text-yellow-500 font-semibold">SHA-1 Certificate Fingerprint</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/20">
                    <Mail className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-yellow-500 mb-1">3. Cleanest Fallback (Direct Sign Up)</h4>
                      <p className="leading-relaxed text-zinc-400">
                        For ultimate 100% stability across all Android devices, recommend users sign up via their <span className="text-white font-semibold">Email & Password</span> on the Sign Up screen. This completely bypasses any APK browser constraints.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              CLOSE / BACK
            </button>
            <button 
              onClick={() => {
                onClose();
                onProceedAnyway();
              }}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors"
            >
              PROCEED ANYWAY
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
