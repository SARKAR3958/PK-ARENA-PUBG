import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Volume2, VolumeX, Check, Disc3, Sparkles, X, Sliders } from 'lucide-react';
import {
  APP_MUSIC_TRACKS,
  subscribeMusicSettings,
  setMusicMuted,
  setMusicTrack,
  setMusicVolume,
  MusicState,
} from '../lib/sound';

interface MusicSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicSettingsModal: React.FC<MusicSettingsModalProps> = ({ isOpen, onClose }) => {
  const [musicState, setMusicState] = useState<MusicState>({
    isMuted: false,
    trackId: 'home-default',
    volume: 0.65,
    isPlaying: false,
  });

  useEffect(() => {
    const unsubscribe = subscribeMusicSettings((state) => {
      setMusicState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative bg-zinc-950 border border-yellow-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shadow-inner">
                <Music className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  Music & Soundtracks
                </h3>
                <p className="text-[10px] text-zinc-400">Background audio controls</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide">
            {/* Master Mute / Unmute Toggle Card */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    !musicState.isMuted
                      ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  {!musicState.isMuted ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Background Music</span>
                    {!musicState.isMuted && (
                      <span className="flex items-center gap-0.5 h-3">
                        <span className="w-1 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-3 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1.5 bg-yellow-500 rounded-full animate-bounce" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {!musicState.isMuted ? (
                      <span className="text-yellow-400 font-semibold">Active (Unmuted)</span>
                    ) : (
                      <span className="text-zinc-500">Muted</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setMusicMuted(!musicState.isMuted)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !musicState.isMuted ? 'bg-yellow-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    !musicState.isMuted ? 'translate-x-5 bg-black' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Control */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-yellow-500" />
                  Volume
                </span>
                <span className="text-[10px] font-mono font-bold text-yellow-500">
                  {Math.round(musicState.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicState.volume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Soundtrack Selection Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-yellow-500/90 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Select Soundtrack
                </span>
                <span className="text-[9px] text-zinc-500">3 Available</span>
              </div>

              {/* Tracks List */}
              <div className="space-y-2">
                {APP_MUSIC_TRACKS.map((track) => {
                  const isSelected = musicState.trackId === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => setMusicTrack(track.id)}
                      className={`w-full p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left group ${
                        isSelected
                          ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                          : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-yellow-500 text-black border-yellow-400 font-bold shadow-md'
                              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50 group-hover:text-zinc-200'
                          }`}
                        >
                          <Disc3
                            className={`w-4 h-4 ${isSelected && !musicState.isMuted ? 'animate-spin' : ''}`}
                            style={{ animationDuration: '4s' }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold transition-colors ${
                                isSelected ? 'text-yellow-400' : 'text-white group-hover:text-yellow-500'
                              }`}
                            >
                              {track.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400">{track.subtitle}</div>
                        </div>
                      </div>

                      {/* Select / Active Indicator */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMusicTrack(track.id);
                        }}
                        className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-yellow-500 text-black shadow-md'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          'Select'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
