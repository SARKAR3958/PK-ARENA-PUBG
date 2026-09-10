import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Users, Shield, Plus, UserPlus, Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

export function MyTeamModal({ onClose }: { onClose: () => void }) {
  const { currentUser, t } = useApp();
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  // In a real app, you would fetch the user's team from Firebase.
  // For now, we use a placeholder local state to represent the team creation flow.
  const [hasTeam, setHasTeam] = useState(false);
  const [players, setPlayers] = useState([
    { name: currentUser?.inGameName || currentUser?.username || 'Captain', role: 'Captain' }
  ]);
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateTeam = () => {
    if (!teamName || teamName.length < 3) {
      toast.error('Team name must be at least 3 characters.');
      return;
    }
    const newTeamId = 'TEAM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setTeamId(newTeamId);
    setHasTeam(true);
    toast.success('Team created successfully!');
  };

  const handleJoinTeam = () => {
    if (!inviteCode || inviteCode.length < 5) {
      toast.error('Invalid invite code.');
      return;
    }
    setHasTeam(true);
    setTeamName('Squad ' + inviteCode);
    setTeamId(inviteCode);
    setPlayers([
      { name: 'Unknown Captain', role: 'Captain' },
      { name: currentUser?.inGameName || currentUser?.username || 'Player', role: 'Player' }
    ]);
    toast.success('Joined team successfully!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)] shadow-2xl"
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
          <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase">
            <Users className="w-4 h-4 mr-2" /> {t("My Team")}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {!hasTeam ? (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                <Shield className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Create or Join a Team</h4>
                <p className="text-[10px] text-zinc-400">Team up with your squad for Squad/Duo tournaments!</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Create New Team</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter Team Name"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50"
                  />
                  <button
                    onClick={handleCreateTeam}
                    className="bg-gradient-pk text-black font-bold px-4 rounded-xl text-xs flex items-center hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] text-zinc-500 uppercase font-bold">OR</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Join Existing Team</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter Invite Code"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 uppercase"
                  />
                  <button
                    onClick={handleJoinTeam}
                    className="bg-zinc-800 text-white font-bold px-4 rounded-xl text-xs hover:bg-zinc-700"
                  >
                    JOIN
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2 border border-yellow-500/30">
                  <Shield className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">{teamName}</h2>
                <div className="text-[10px] text-zinc-400 mt-1 bg-black px-3 py-1 rounded-full border border-zinc-800 font-mono">
                  Code: <span className="text-yellow-500 font-bold">{teamId}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-2">
                  <h4 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Team Members</h4>
                  <span className="text-[10px] text-zinc-500 font-bold">{players.length}/4</span>
                </div>
                <div className="space-y-2">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{p.name}</div>
                          <div className={`text-[9px] font-bold ${p.role === 'Captain' ? 'text-yellow-500' : 'text-zinc-500'}`}>
                            {p.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {players.length < 4 && (
                    <button className="w-full border border-dashed border-zinc-700 rounded-lg p-3 flex items-center justify-center text-zinc-500 hover:text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
                      <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Invite Player</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-500 mb-1" />
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Matches Won</div>
                    <div className="text-lg font-black text-white">0</div>
                 </div>
                 <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Tournaments</div>
                    <div className="text-lg font-black text-white">0</div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
