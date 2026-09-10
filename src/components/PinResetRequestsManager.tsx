import React, { useState } from 'react';
import { ref, update, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { 
  Key, Search, X, Clock, Copy, 
  User as UserIcon, Mail, Phone, 
  Smartphone, ShieldCheck, MessageSquare, 
  Trash2, Check, ShieldAlert
} from 'lucide-react';

interface PinResetRequestsManagerProps {
  pinResetRequests: any[];
}

export const PinResetRequestsManager: React.FC<PinResetRequestsManagerProps> = ({ 
  pinResetRequests 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredRequests = pinResetRequests.filter(req => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (req.username && req.username.toLowerCase().includes(q)) ||
      (req.email && req.email.toLowerCase().includes(q)) ||
      (req.phone && req.phone.toLowerCase().includes(q)) ||
      (req.currentPin && req.currentPin.toString().toLowerCase().includes(q)) ||
      (req.device && req.device.toLowerCase().includes(q)) ||
      (req.deviceName && req.deviceName.toLowerCase().includes(q)) ||
      (req.userId && req.userId.toLowerCase().includes(q))
    );
  });

  const handleCopy = (text: string, label: string) => {
    if (!text || text === 'N/A' || text === 'Not Set') {
      toast.error(`No ${label.toLowerCase()} to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleReject = async (req: any) => {
    setProcessingId(req.id);
    try {
      await remove(ref(db, `pinResetRequests/${req.id}`));
      toast.success(`Request for ${req.username || 'User'} rejected & removed.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (req: any) => {
    if (!req.userId) {
      toast.error('Cannot reset: User ID is missing.');
      return;
    }

    setProcessingId(req.id);
    try {
      const updates: any = {};
      // Reset PIN and security questions
      updates[`users/${req.userId}/appLockPin`] = null;
      updates[`users/${req.userId}/securityColor`] = null;
      updates[`users/${req.userId}/securitySport`] = null;
      // Reset lockout attempts & counters
      updates[`users/${req.userId}/pinAttempts`] = 5;
      updates[`users/${req.userId}/pinLockoutUntil`] = null;
      updates[`users/${req.userId}/pinLastFailedAt`] = null;

      await update(ref(db), updates);
      await remove(ref(db, `pinResetRequests/${req.id}`));
      toast.success(`PIN reset successfully approved for ${req.username || 'User'}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve PIN reset.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-inner">
            <Key size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                PIN Reset Requests
              </h3>
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {pinResetRequests.length} Pending
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review user verification identity and approve App Lock PIN resets
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, email, phone, PIN..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Empty States */}
      {pinResetRequests.length === 0 ? (
        <div className="text-center py-20 bg-zinc-950/60 rounded-3xl border border-zinc-800/80 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3 shadow-inner">
            <Key size={30} />
          </div>
          <h4 className="text-base font-bold text-zinc-300">No Pending PIN Reset Requests</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
            When users forget their PIN and submit a request after answering security questions, their request cards will appear here.
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-14 bg-zinc-950/60 rounded-3xl border border-zinc-800/80">
          <p className="text-sm text-zinc-400">No PIN reset requests found matching "{searchQuery}".</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-bold text-yellow-500 hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Enhanced Cards Grid */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredRequests.map((req) => {
            const isBusy = processingId === req.id;
            const deviceDisplay = req.device || (
              req.deviceName?.toLowerCase().includes('android') ? 'Android Device' :
              req.deviceName?.toLowerCase().includes('iphone') ? 'iPhone' :
              req.deviceName?.toLowerCase().includes('windows') ? 'Windows PC' :
              req.deviceName?.toLowerCase().includes('mac') ? 'Mac OS' : 'Web Client'
            );

            return (
              <div 
                key={req.id} 
                className="bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-zinc-800 hover:border-yellow-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center font-black text-yellow-500 text-lg shadow-inner shrink-0">
                        {req.username ? req.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-white group-hover:text-yellow-400 transition-colors">
                            {req.username || 'Unknown User'}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {req.userId ? req.userId.substring(0, 10) : 'UID'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                          <Clock size={12} className="text-zinc-500" />
                          <span>{req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Just now'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Pending Review
                    </div>
                  </div>

                  {/* Details in Distinct Styled Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Username Box */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <UserIcon size={13} className="text-yellow-500" /> Username
                        </span>
                        <button 
                          onClick={() => handleCopy(req.username, 'Username')}
                          className="text-zinc-500 hover:text-yellow-500 transition-colors"
                          title="Copy Username"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <div className="text-sm font-black text-white truncate">
                        {req.username || 'Unknown'}
                      </div>
                    </div>

                    {/* Email Box */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} className="text-cyan-400" /> Email Address
                        </span>
                        {req.email && req.email !== 'N/A' && (
                          <button 
                            onClick={() => handleCopy(req.email, 'Email')}
                            className="text-zinc-500 hover:text-cyan-400 transition-colors"
                            title="Copy Email"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-zinc-200 truncate" title={req.email}>
                        {req.email || 'N/A'}
                      </div>
                    </div>

                    {/* Phone Number Box */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} className="text-emerald-400" /> Phone Number
                        </span>
                        {req.phone && req.phone !== 'N/A' && (
                          <button 
                            onClick={() => handleCopy(req.phone, 'Phone number')}
                            className="text-zinc-500 hover:text-emerald-400 transition-colors"
                            title="Copy Phone"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-zinc-200 truncate font-mono">
                        {req.phone || 'Not Provided'}
                      </div>
                    </div>

                    {/* Current PIN Box */}
                    <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-3.5 flex flex-col justify-between hover:border-yellow-500/40 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-yellow-500 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Key size={13} className="text-yellow-400" /> Current PIN
                        </span>
                        {req.currentPin && (
                          <button 
                            onClick={() => handleCopy(String(req.currentPin), 'Current PIN')}
                            className="text-yellow-500/70 hover:text-yellow-400 transition-colors"
                            title="Copy Current PIN"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                      <div className="text-base font-black font-mono tracking-widest text-yellow-400">
                        {req.currentPin ? String(req.currentPin) : 'Not Set'}
                      </div>
                    </div>

                    {/* Device Box */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Smartphone size={13} className="text-purple-400" /> Device / Client
                        </span>
                        {req.deviceName && (
                          <button 
                            onClick={() => handleCopy(req.deviceName, 'Device UserAgent')}
                            className="text-zinc-500 hover:text-purple-400 transition-colors"
                            title="Copy Device UserAgent"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-bold text-zinc-200 truncate">
                        {deviceDisplay}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5" title={req.deviceName}>
                        {req.deviceName || 'Web Browser'}
                      </div>
                    </div>

                    {/* Security Question Status Box */}
                    <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-3.5 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-emerald-400" /> Security Questions
                        </span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full">
                          PASSED
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-emerald-200 truncate">
                        {req.securityColor ? `${req.securityColor} & ${req.securitySport}` : 'Verified Correctly'}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        User matched Color & Sport
                      </div>
                    </div>
                  </div>

                  {/* Reason Box (if user provided message) */}
                  {req.reason && (
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3.5 mb-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-1">
                        <MessageSquare size={13} /> User's Reason:
                      </div>
                      <p className="text-xs text-zinc-300 italic">
                        "{req.reason}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons Footer */}
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/80">
                  <button 
                    disabled={isBusy}
                    onClick={() => handleReject(req)}
                    className="flex-1 py-3 px-3 bg-zinc-900 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Reject
                  </button>

                  <button 
                    disabled={isBusy}
                    onClick={() => handleApprove(req)}
                    className="flex-[2] py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check size={16} className="stroke-[3]" />
                    {isBusy ? 'Processing...' : 'Approve & Reset PIN'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
