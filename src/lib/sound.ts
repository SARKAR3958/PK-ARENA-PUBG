// Web Audio API Sound Utility for PK Arena
// Provides high quality, zero-latency sounds without external MP3 dependencies

let audioCtx: AudioContext | null = null;
let lastClickSoundTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Play a crisp, subtle tactile button click/tap sound
 */
export function playButtonClickSound() {
  try {
    const now = Date.now();
    // Throttle click sound to avoid duplicate double-tap playback across touch/click events
    if (now - lastClickSoundTime < 60) return;
    lastClickSoundTime = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency drop for tactile "pop"
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.045);

    // Short snappy envelope
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  } catch (e) {
    // Ignore audio errors silently
  }
}

/**
 * Play deposit request success sound (Chime / Golden Coin Pickup)
 */
export function playDepositSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 4 celebratory coin tones: C5, E5, G5, C6
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.12, gain: 0.22 },
      { freq: 659.25, time: 0.08, dur: 0.14, gain: 0.24 },
      { freq: 783.99, time: 0.16, dur: 0.16, gain: 0.26 },
      { freq: 1046.50, time: 0.24, dur: 0.45, gain: 0.30 },
    ];

    const baseTime = ctx.currentTime;

    notes.forEach(({ freq, time, dur, gain: noteGain }) => {
      const startTime = baseTime + time;
      
      // Primary chime tone
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Shimmering second harmonic
      const harmonic = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, startTime);
      harmGain.gain.setValueAtTime(noteGain * 0.35, startTime);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      gainNode.gain.setValueAtTime(noteGain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gainNode);
      harmonic.connect(harmGain);
      gainNode.connect(ctx.destination);
      harmGain.connect(ctx.destination);

      osc.start(startTime);
      harmonic.start(startTime);
      osc.stop(startTime + dur);
      harmonic.stop(startTime + dur);
    });
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Play withdrawal request success sound (Cashout / Transaction Ding)
 */
export function playWithdrawSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime;

    // Two harmonious tones: D5 (587Hz) followed by high A5 (880Hz) + D6 (1174Hz)
    const tones = [
      { freq: 587.33, time: 0.00, dur: 0.15, vol: 0.25 },
      { freq: 880.00, time: 0.10, dur: 0.55, vol: 0.30 },
      { freq: 1174.66, time: 0.12, dur: 0.60, vol: 0.20 },
    ];

    tones.forEach(({ freq, time, dur, vol }) => {
      const startTime = baseTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Play wrong PIN / validation error beep sound (Crisp digital electronic alert double-beep)
 */
export function playWrongPinSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime;

    // Two distinct, crisp electronic error beeps (High clarity 820Hz-760Hz alert beep)
    const beeps = [
      { start: 0.00, dur: 0.09, freq: 820, vol: 0.32 },
      { start: 0.13, dur: 0.12, freq: 760, vol: 0.34 },
    ];

    beeps.forEach(({ start, dur, freq, vol }) => {
      const startTime = baseTime + start;
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();
      const harmGain = ctx.createGain();

      // Main clear electronic beep tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle overtone for authentic digital security keypad sound
      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 1.5, startTime);

      // Fast, clean envelope (no clicks, snappy beep attack & decay)
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.006);
      gain.gain.setValueAtTime(vol, startTime + dur - 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      harmGain.gain.setValueAtTime(0.0001, startTime);
      harmGain.gain.linearRampToValueAtTime(vol * 0.2, startTime + 0.006);
      harmGain.gain.setValueAtTime(vol * 0.2, startTime + dur - 0.012);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      harmonic.connect(harmGain);
      gain.connect(ctx.destination);
      harmGain.connect(ctx.destination);

      osc.start(startTime);
      harmonic.start(startTime);
      osc.stop(startTime + dur);
      harmonic.stop(startTime + dur);
    });
  } catch (e) {
    // Ignore audio errors silently
  }
}

/**
 * Alias for general error sound
 */
export const playErrorSound = playWrongPinSound;

/**
 * Play PIN unlock success sound (Crisp ascending chime)
 */
export function playPinSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0.00, dur: 0.12, vol: 0.22 }, // D5
      { freq: 880.00, start: 0.08, dur: 0.25, vol: 0.28 }, // A5
    ];

    notes.forEach(({ freq, start, dur, vol }) => {
      const startTime = baseTime + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  } catch (e) {
    // Ignore audio errors
  }
}

let authBgAudio: HTMLAudioElement | null = null;
let authBgTimeout: any = null;
let isAuthScreenActive = false;

/**
 * Start background sound for Login/Signup screens with 500ms delay and infinite loop.
 * Plays `/login-signup-bg-sound.mp3`.
 */
export function startAuthBgSound(delayMs = 500) {
  isAuthScreenActive = true;

  // If already playing, keep it running smoothly across Login/Signup switch
  if (authBgAudio && !authBgAudio.paused) {
    return;
  }

  if (authBgTimeout) {
    clearTimeout(authBgTimeout);
    authBgTimeout = null;
  }

  authBgTimeout = setTimeout(() => {
    if (!isAuthScreenActive) return;

    try {
      if (!authBgAudio) {
        authBgAudio = new Audio('/login-signup-bg-sound.mp3');
        authBgAudio.loop = true;
        authBgAudio.volume = 0.65;
      }

      const playPromise = authBgAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If autoplay restricted by browser before first interaction,
          // automatically resume on first tap or touch anywhere on screen
          const handleFirstInteraction = () => {
            if (isAuthScreenActive && authBgAudio && authBgAudio.paused) {
              authBgAudio.play().catch(() => {});
            }
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
          };

          window.addEventListener('click', handleFirstInteraction, { once: true });
          window.addEventListener('touchstart', handleFirstInteraction, { once: true });
          window.addEventListener('keydown', handleFirstInteraction, { once: true });
        });
      }
    } catch (e) {
      // Ignore
    }
  }, delayMs);
}

/**
 * Stop background sound when leaving Login/Signup or after logging in / signing up
 */
export function stopAuthBgSound() {
  isAuthScreenActive = false;
  if (authBgTimeout) {
    clearTimeout(authBgTimeout);
    authBgTimeout = null;
  }
  if (authBgAudio) {
    try {
      authBgAudio.pause();
      authBgAudio.currentTime = 0;
    } catch (e) {}
    authBgAudio = null;
  }
}

/* ==========================================================================
   IN-APP BACKGROUND MUSIC MANAGER (Home, Matches, Wallet, Profile, etc.)
   ========================================================================== */

export interface MusicTrack {
  id: string;
  name: string;
  subtitle: string;
  src: string;
  isDefault?: boolean;
}

export const APP_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'home-default',
    name: 'MAIN THEME',
    subtitle: 'PUBG Official Theme Song',
    src: '/home-default.mp3',
    isDefault: true,
  },
  {
    id: 'WHISPER-PRIMEWOOD',
    name: 'WHISPER',
    subtitle: 'PrimeWood Genisis Theme Song',
    src: '/WHISPER-PRIMEWOOD.mp3',
  },
  {
    id: 'HELIOS',
    name: 'HELIOS',
    subtitle: 'PUBG 4.4 Theme Song',
    src: '/HELIOS.mp3',
  },
];

const STORAGE_MUTED_KEY = 'pk_arena_music_muted';
const STORAGE_TRACK_KEY = 'pk_arena_music_track';
const STORAGE_VOLUME_KEY = 'pk_arena_music_volume';

let inAppAudio: HTMLAudioElement | null = null;
let inAppTimeout: any = null;
let isInAppAllowed = false;

export interface MusicState {
  isMuted: boolean;
  trackId: string;
  volume: number;
  isPlaying: boolean;
}

type MusicListener = (state: MusicState) => void;
const musicListeners = new Set<MusicListener>();

export function getMusicSettings() {
  if (typeof window === 'undefined') {
    return { isMuted: false, trackId: 'home-default', volume: 0.65 };
  }
  const isMuted = localStorage.getItem(STORAGE_MUTED_KEY) === 'true';
  const trackId = localStorage.getItem(STORAGE_TRACK_KEY) || 'home-default';
  const volume = parseFloat(localStorage.getItem(STORAGE_VOLUME_KEY) || '0.65');
  return { isMuted, trackId, volume };
}

function notifyMusicListeners() {
  const settings = getMusicSettings();
  const isPlaying = inAppAudio !== null && !inAppAudio.paused && !settings.isMuted;
  const state: MusicState = { ...settings, isPlaying };
  musicListeners.forEach(fn => fn(state));
}

export function subscribeMusicSettings(listener: MusicListener): () => void {
  musicListeners.add(listener);
  const settings = getMusicSettings();
  const isPlaying = inAppAudio !== null && !inAppAudio.paused && !settings.isMuted;
  listener({ ...settings, isPlaying });
  return () => {
    musicListeners.delete(listener);
  };
}

/**
 * Start In-App background music with 500ms delay.
 * Runs continuously in loop across Home, Matches, Wallet, Profile, etc.
 */
export function startInAppMusic(delayMs = 500) {
  isInAppAllowed = true;
  const { isMuted, trackId, volume } = getMusicSettings();

  if (isMuted) {
    notifyMusicListeners();
    return;
  }

  if (inAppTimeout) {
    clearTimeout(inAppTimeout);
    inAppTimeout = null;
  }

  inAppTimeout = setTimeout(() => {
    if (!isInAppAllowed) return;

    try {
      const currentTrack = APP_MUSIC_TRACKS.find(t => t.id === trackId) || APP_MUSIC_TRACKS[0];

      // If already playing the requested track, do nothing
      if (inAppAudio && !inAppAudio.paused && inAppAudio.src.includes(encodeURI(currentTrack.src).replace(/^\//, ''))) {
        notifyMusicListeners();
        return;
      }

      if (!inAppAudio) {
        inAppAudio = new Audio(currentTrack.src);
      } else if (!inAppAudio.src.includes(encodeURI(currentTrack.src).replace(/^\//, ''))) {
        inAppAudio.pause();
        inAppAudio = new Audio(currentTrack.src);
      }

      inAppAudio.loop = true;
      inAppAudio.volume = volume;

      const playPromise = inAppAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            notifyMusicListeners();
          })
          .catch(() => {
            // Autoplay restriction: wait for user's next tap/click/touch
            const handleFirstGesture = () => {
              const currentSettings = getMusicSettings();
              if (isInAppAllowed && !currentSettings.isMuted && inAppAudio && inAppAudio.paused) {
                inAppAudio.play().then(notifyMusicListeners).catch(() => {});
              }
              window.removeEventListener('click', handleFirstGesture);
              window.removeEventListener('touchstart', handleFirstGesture);
              window.removeEventListener('pointerdown', handleFirstGesture);
            };
            window.addEventListener('click', handleFirstGesture, { once: true });
            window.addEventListener('touchstart', handleFirstGesture, { once: true });
            window.addEventListener('pointerdown', handleFirstGesture, { once: true });
          });
      }
    } catch (e) {
      // Ignore
    }
  }, delayMs);
}

/**
 * Stop In-App background music (e.g. when user logs out or returns to login screen)
 */
export function stopInAppMusic() {
  isInAppAllowed = false;
  if (inAppTimeout) {
    clearTimeout(inAppTimeout);
    inAppTimeout = null;
  }
  if (inAppAudio) {
    try {
      inAppAudio.pause();
      inAppAudio.currentTime = 0;
    } catch (e) {}
    inAppAudio = null;
  }
  notifyMusicListeners();
}

/**
 * Toggle or set mute status.
 * If unmuted, music resumes after 500ms.
 */
export function setMusicMuted(muted: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_MUTED_KEY, muted ? 'true' : 'false');
  }

  if (muted) {
    if (inAppTimeout) {
      clearTimeout(inAppTimeout);
      inAppTimeout = null;
    }
    if (inAppAudio) {
      try {
        inAppAudio.pause();
      } catch (e) {}
    }
    notifyMusicListeners();
  } else {
    // Unmuted: start playing after 500ms delay
    startInAppMusic(500);
    notifyMusicListeners();
  }
}

/**
 * Select a soundtrack.
 * Stops previous track and starts new track after 500ms delay.
 */
export function setMusicTrack(trackId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_TRACK_KEY, trackId);
  }

  // Stop currently playing track immediately
  if (inAppTimeout) {
    clearTimeout(inAppTimeout);
    inAppTimeout = null;
  }
  if (inAppAudio) {
    try {
      inAppAudio.pause();
      inAppAudio = null;
    } catch (e) {}
  }
  notifyMusicListeners();

  // If not muted, start new track after 500ms delay
  const { isMuted } = getMusicSettings();
  if (!isMuted) {
    startInAppMusic(500);
  }
}

/**
 * Adjust music volume (0.0 to 1.0)
 */
export function setMusicVolume(vol: number) {
  const clamped = Math.max(0, Math.min(1, vol));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_VOLUME_KEY, clamped.toString());
  }
  if (inAppAudio) {
    inAppAudio.volume = clamped;
  }
  notifyMusicListeners();
}

/**
 * Initialize global button click sound listener
 * Listens for user taps/clicks on buttons, links, or clickable elements
 */
export function initGlobalButtonSound(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleClick = (event: MouseEvent | TouchEvent) => {
    try {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Check if target or any ancestor is a button, link, or clickable element
      const clickable = target.closest<HTMLElement>(
        'button, [role="button"], a, input[type="button"], input[type="submit"], .clickable-sound'
      );

      if (clickable) {
        // Skip if specifically opted-out via attribute
        if (clickable.getAttribute('data-sound') === 'none') {
          return;
        }
        playButtonClickSound();
      }
    } catch (e) {
      // Ignore
    }
  };

  // Use capture phase so all dynamic React elements trigger click feedback reliably
  document.addEventListener('click', handleClick, { capture: true, passive: true });

  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
  };
}
