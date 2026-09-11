import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Skull, Swords, Dices, Calendar, Coins, User, Users, Trees, Zap, Flame, X, AlertTriangle, ArrowRight, ArrowLeft, Copy, Clock, MapPin, ExternalLink, Gamepad2, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { useApp } from '../context/AppContext';
import { PK_COIN_ICON } from '../lib/assets';


function MatchCountdown({ date, time }: { date?: string, time: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!date || !time) return;
    const update = () => {
      const matchTime = new Date(`${date}T${time}`).getTime();
      const diff = matchTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('STARTED');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [date, time]);

  if (!date || !timeLeft) return null;
  return (
    <div className="bg-zinc-950/80 text-yellow-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-yellow-500/20 flex items-center shadow-md">
      <Clock className="w-3 h-3 mr-1 text-yellow-400" />
      {timeLeft}
    </div>
  );
}

const DEFAULT_BANNERS = [
  {
    id: 'default-1',
    imageUrl: '/match-card.png',
    type: 'home',
    isActive: true
  }
];

export function Home() {
  const location = useLocation();
  const isTournamentsPage = location.pathname === '/tournaments';

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeMode, setActiveMode] = useState('SOLO');
  const { joinMatch, joinedMatches, currentUser, tournaments, banners: contextBanners, announcements, t } = useApp();
  const [showAnnouncementsScreen, setShowAnnouncementsScreen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [leaderInGameName, setLeaderInGameName] = useState('');
  const [leaderGameUid, setLeaderGameUid] = useState('');
  const [teamMembers, setTeamMembers] = useState<{inGameName: string, gameUid: string}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [viewingPlayersTournament, setViewingPlayersTournament] = useState<any>(null);
  const [viewingPrizeDistribution, setViewingPrizeDistribution] = useState<any>(null);
  const [showRulesModal, setShowRulesModal] = useState<any>(null);
  const [rulesModalMode, setRulesModalMode] = useState<'rules' | 'room'>('rules');
  const [matchPlayers, setMatchPlayers] = useState<any[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);

  const banners = useMemo(() => {
    return contextBanners && contextBanners.length > 0 ? contextBanners : DEFAULT_BANNERS;
  }, [contextBanners]);

  const handleBannerClick = (link?: string) => {
    if (!link || !link.trim()) return;
    let targetUrl = link.trim();

    // Format link to ensure external opening (e.g. WhatsApp, Telegram, websites, external domains)
    if (
      targetUrl.startsWith('wa.me/') ||
      targetUrl.startsWith('chat.whatsapp.com/') ||
      targetUrl.startsWith('www.') ||
      targetUrl.startsWith('t.me/')
    ) {
      targetUrl = 'https://' + targetUrl;
    } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(targetUrl)) {
      if (targetUrl.startsWith('/')) {
        targetUrl = window.location.origin + targetUrl;
      } else {
        targetUrl = 'https://' + targetUrl;
      }
    }

    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      window.location.href = targetUrl;
    }
  };

  useEffect(() => {
    const settingsRef = ref(db, 'appSettings');
    get(settingsRef).then((snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    });
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const speed = settings?.bannerSpeed || 2000;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, speed);
    return () => clearInterval(timer);
  }, [banners, settings?.bannerSpeed]);

  useEffect(() => {
    if (viewingPlayersTournament) {
       const fetchPlayers = async () => {
         setIsLoadingPlayers(true);
         try {
            const usersRef = ref(db, 'userMatches');
            const snapshot = await get(usersRef);
            const allUserMatches = snapshot.val();
            
            const usersListRef = ref(db, 'users');
            const usersSnapshot = await get(usersListRef);
            const allUsers = usersSnapshot.val() || {};
            
            const players = [];
            if (allUserMatches) {
                for (const uid in allUserMatches) {
                   for (const mid in allUserMatches[uid]) {
                      if (allUserMatches[uid][mid].tournamentId === viewingPlayersTournament.id) {
                         const user = allUsers[uid];
                         players.push({
                            ...allUserMatches[uid][mid],
                            username: user?.username || 'Unknown',
                            inGameName: user?.inGameName || 'No Name',
                            phone: user?.phone || 'N/A'
                         });
                      }
                   }
                }
            }
            setMatchPlayers(players.sort((a, b) => a.slot - b.slot));
         } catch(err) {
            console.error(err);
         }
         setIsLoadingPlayers(false);
       };
       fetchPlayers();
    } else {
       setMatchPlayers([]);
    }
  }, [viewingPlayersTournament]);


  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return 'TBA';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const yy = String(d.getFullYear()).slice(-2);
      const m = d.getMonth() + 1;
      const dd = d.getDate();
      return `${dd}/${m}/${yy}`;
    } catch(e) { return dateStr; }
  };

  const formatTimeAMPM = (timeStr?: string) => {
    if (!timeStr) return 'TBA';
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      let hours = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${m} ${ampm}`;
    } catch(e) { return timeStr; }
  };
  const handleJoinClick = (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    const joined = joinedMatches.find(m => m.tournamentId === t.id);
    if (joined) {
      setRulesModalMode('room');
      setShowRulesModal(joined);
      return;
    }
    
    if (currentUser && currentUser.walletBalance < (t.entryFee || 0)) {
      toast.error('Insufficient coins!');
      return;
    }
    
    setSelectedTournament(t);
    setSelectedSlot(null);
  };

  const handleCardClick = (t: any) => {
    setViewingPlayersTournament(t);
  };

  const getRequiredTeamMembers = (mode: string) => {
    if (!mode) return 0;
    const m = mode.toUpperCase();
    if (m === 'DUO') return 1;
    if (m === 'TRIO' || m === 'TRI') return 2;
    if (m === 'SQUAD') return 3;
    return 0;
  };

  const handleConfirmEntry = async () => {
    if (isJoining) return;
    if (!selectedSlot) {
      toast.error('Please select a slot first');
      return;
    }
    
    const requiredMembers = getRequiredTeamMembers(selectedTournament.mode);
    if (requiredMembers > 0) {
      setLeaderInGameName(currentUser?.inGameName || '');
      setLeaderGameUid(currentUser?.gameUid || '');
      setTeamMembers(Array(requiredMembers).fill({ inGameName: '', gameUid: '' }));
      setShowTeamModal(true);
      return;
    }
    
    await executeJoinMatch([]);
  };

  const executeJoinMatch = async (teamData: any[]) => {
    setIsJoining(true);
    try {
      await joinMatch(selectedTournament, selectedSlot, teamData);
      setSelectedTournament(null);
      setShowTeamModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to join match');
    } finally {
      setIsJoining(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (!t || t.isDeleted || !t.title) return false;

    // Check mode matching
    const tMode = (t.mode || 'SOLO').toUpperCase().trim();
    const currentMode = activeMode.toUpperCase().trim();
    const matchesMode = (
      tMode === currentMode ||
      (currentMode === 'TRIO' && (tMode === 'TRI' || tMode === 'TRIO')) ||
      (currentMode === 'TRI' && (tMode === 'TRI' || tMode === 'TRIO'))
    );

    if (activeCategory === 'ALL') {
      return matchesMode;
    }

    // Category matching with broad backward compatibility
    let matchesCategory = false;
    const cat = activeCategory.toUpperCase();
    const type = (t.type || '').toUpperCase();
    const map = (t.map || '').toUpperCase();
    const title = (t.title || '').toUpperCase();

    if (cat === 'TDM') {
      matchesCategory = type === 'TDM';
    } else if (cat === 'ERANGEL') {
      matchesCategory = type === 'ERANGEL' || (type === 'BR' && !title.includes('TDM'));
    } else if (cat === 'MIRAMAR') {
      matchesCategory = type === 'MIRAMAR';
    } else if (cat === 'LIVIK') {
      matchesCategory = type === 'LIVIK' || type === 'LW';
    } else if (cat === 'SANHOK') {
      matchesCategory = type === 'SANHOK';
    } else if (cat === 'RANDOM') {
      matchesCategory = type === 'RANDOM TOURNAMENT' || type === 'RANDOM';
    } else if (cat === 'EVENT') {
      matchesCategory = type === 'EVENT';
    } else {
      matchesCategory = type === cat;
    }

    return matchesCategory && matchesMode;
  });

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col min-h-full"
    >
      {/* Banner */}
      {!isTournamentsPage && banners.length > 0 && (
      <div className="mx-4 mt-2 h-44 rounded-2xl overflow-hidden relative border border-yellow-900/50 shadow-lg select-none">
        {banners.map((banner, idx) => {
          const isCurrent = idx === currentBannerIndex;
          const hasLink = Boolean(banner.link && banner.link.trim());

          return (
            <div
              key={banner.id || idx}
              onClick={() => {
                if (hasLink) {
                  handleBannerClick(banner.link);
                }
              }}
              className={`w-full h-full absolute inset-0 transition-all duration-500 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              } ${hasLink ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
              <img 
                src={banner.imageUrl} 
                className="w-full h-full object-cover"
                alt="Battle Banner"
              />
              {hasLink && isCurrent && (
                <div className="absolute top-2.5 right-2.5 z-20 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-yellow-500/40 flex items-center space-x-1 shadow-md pointer-events-none">
                  <ExternalLink className="w-3 h-3 text-yellow-500" />
                  <span className="text-[9px] font-black text-yellow-500 uppercase tracking-wider">Tap to Open</span>
                </div>
              )}
            </div>
          );
        })}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-1.5 z-20 pointer-events-auto">
            {banners.map((_, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentBannerIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentBannerIndex ? 'w-5 bg-yellow-500' : 'w-1.5 bg-white/40'
                }`} 
              />
            ))}
          </div>
        )}
      </div>
      )}

      {/* Golden Stats Banner matching reference image (Refined & Compact) */}
      {!isTournamentsPage && (
      <motion.div 
        variants={item} 
        className="mx-3 sm:mx-4 mt-2.5 sm:mt-3 relative rounded-[16px] sm:rounded-[20px] p-[1.5px] bg-gradient-to-r from-amber-300/80 via-yellow-200/90 via-amber-400/80 to-yellow-300/85 shadow-[0_2px_15px_rgba(251,191,36,0.15)] overflow-hidden"
      >
        {/* Top-Left Diagonal Golden Bevel Accents */}
        <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none z-20 overflow-hidden">
          <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-500 rotate-45 opacity-90 shadow-sm" />
          <div className="absolute top-0.5 left-0.5 w-3 h-0.5 bg-black/50 rotate-45" />
          <div className="absolute top-1.5 left-1.5 w-3 h-0.5 bg-black/50 rotate-45" />
        </div>

        {/* Bottom-Right Diagonal Golden Bevel Accents */}
        <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none z-20 overflow-hidden">
          <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-gradient-to-tl from-yellow-100 via-amber-300 to-yellow-500 rotate-45 opacity-90 shadow-sm" />
          <div className="absolute bottom-0.5 right-0.5 w-3 h-0.5 bg-black/50 rotate-45" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-0.5 bg-black/50 rotate-45" />
        </div>

        {/* Inner Card Background */}
        <div className="bg-gradient-to-b from-[#141416] via-[#0a0a0c] to-[#040404] rounded-[14.5px] sm:rounded-[18.5px] px-1.5 sm:px-3 py-2 sm:py-2.5 grid grid-cols-3 divide-x divide-amber-400/25 relative z-10">
          
          {/* 1. Tournaments Played */}
          <div className="flex flex-col items-center justify-between text-center px-1 sm:px-2 min-w-0 space-y-0.5 sm:space-y-1">
            <div className="h-6 sm:h-7 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-[0_1px_5px_rgba(251,191,36,0.35)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 14c-1-2-1.5-4.5-1-7 1 2 2.5 3.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 9c-.5-1.5-.5-3.5 0-5 1 1 2 2 2.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 17.5c-1.5-1-2-3-2-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 14c1-2 1.5-4.5 1-7-1 2-2.5 3.5-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.5 9c.5-1.5.5-3.5 0-5-1 1-2 2-2.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 17.5c1.5-1 2-3 2-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6h8v4a4 4 0 0 1-8 0V6z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 8H6a2 2 0 0 0 0 4h2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16 8h2a2 2 0 0 1 0 4h-2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 14v3" stroke="currentColor" strokeWidth="1.6" />
                <path d="M9 19h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <polygon points="12,7.5 12.8,9.2 14.5,9.3 13.2,10.4 13.6,12 12,11.1 10.4,12 10.8,10.4 9.5,9.3 11.2,9.2" fill="currentColor" />
              </svg>
            </div>
            <div className="text-zinc-200 font-medium text-[9px] sm:text-xs leading-tight min-h-[22px] sm:min-h-[26px] flex flex-col items-center justify-center">
              <span>{t("Tournaments") || "Tournaments"}</span>
              <span>{t("Played") || "Played"}</span>
            </div>
            <span className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-400 tracking-tight">
              {currentUser?.totalMatches || 0}
            </span>
          </div>

          {/* 2. Total Wins */}
          <div className="flex flex-col items-center justify-between text-center px-1 sm:px-2 min-w-0 space-y-0.5 sm:space-y-1">
            <div className="h-6 sm:h-7 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-[0_1px_5px_rgba(251,191,36,0.35)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v2.2a.8.8 0 0 1-.8.8H3.8a.8.8 0 0 1-.8-.8V18z" />
                <path d="M3.2 16.5L2 7.5a.7.7 0 0 1 1.2-.6l4.2 3.8 3.8-6.2a.8.8 0 0 1 1.6 0l3.8 6.2 4.2-3.8a.7.7 0 0 1 1.2.6l-1.2 9H3.2z" fillOpacity="0.9" />
                <circle cx="12" cy="4" r="1.2" fill="currentColor" />
                <circle cx="3" cy="7" r="1.2" fill="currentColor" />
                <circle cx="21" cy="7" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <div className="text-zinc-200 font-medium text-[9px] sm:text-xs leading-tight min-h-[22px] sm:min-h-[26px] flex flex-col items-center justify-center">
              <span>{t("Total") || "Total"}</span>
              <span>{t("Wins") || "Wins"}</span>
            </div>
            <span className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-400 tracking-tight">
              {currentUser?.totalWins || 0}
            </span>
          </div>

          {/* 3. Total Earnings */}
          <div className="flex flex-col items-center justify-between text-center px-1 sm:px-2 min-w-0 space-y-0.5 sm:space-y-1">
            <div className="h-6 sm:h-7 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-[0_1px_5px_rgba(251,191,36,0.35)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <ellipse cx="9" cy="6.5" rx="5.5" ry="2.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.5 6.5v9.5c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V6.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.5 11.5c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5" stroke="currentColor" strokeWidth="1.6" />
                <text x="9" y="8" textAnchor="middle" fill="currentColor" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">$</text>
                <path d="M14.5 9c1.6.4 3 1.2 3 2.2v5.5c0 1.2-1.8 2.2-4 2.4" stroke="currentColor" strokeWidth="1.4" />
                <path d="M14.5 13.5c1.6.4 3 1.1 3 2" stroke="currentColor" strokeWidth="1.4" />
                <ellipse cx="16.5" cy="8.5" rx="4" ry="1.8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <div className="text-zinc-200 font-medium text-[9px] sm:text-xs leading-tight min-h-[22px] sm:min-h-[26px] flex flex-col items-center justify-center">
              <span>{t("Total") || "Total"}</span>
              <span>{t("Earnings") || "Earnings"}</span>
            </div>
            <span className="text-xs sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-400 tracking-tight whitespace-nowrap">
              PKR {currentUser?.totalEarnings || 0}
            </span>
          </div>

        </div>
      </motion.div>
      )}

      {/* Announcements Button - Only on Home screen */}
      {!isTournamentsPage && (
        <motion.div variants={item} className="px-4 mt-3.5">
          <button
            onClick={() => setShowAnnouncementsScreen(true)}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-yellow-500/30 hover:border-yellow-500/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between transition-all duration-300 shadow-lg shadow-black/40 hover:shadow-yellow-500/5 active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] group-hover:scale-105 transition-transform">
                <Megaphone className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                    ANNOUNCEMENTS
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium line-clamp-1">
                  Winner announcements, match alerts & news
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-yellow-500 font-bold text-xs bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-all">
              <span className="text-[10px] font-black uppercase tracking-wider">VIEW</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </motion.div>
      )}

      {/* Latest Announcement Preview Card ("niche" show karna) */}
      {!isTournamentsPage && announcements && announcements.length > 0 && (
        <motion.div variants={item} className="px-4 mt-2.5">
          <div 
            onClick={() => setShowAnnouncementsScreen(true)}
            className="w-full bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-950 border border-yellow-500/30 hover:border-yellow-500/60 rounded-2xl p-3.5 cursor-pointer transition-all duration-300 shadow-xl relative overflow-hidden group active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              {announcements[0].imageUrl ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative">
                  <img 
                    src={announcements[0].imageUrl} 
                    alt={announcements[0].title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {announcements[0].tag || 'LATEST'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {announcements[0].createdAt ? new Date(announcements[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                  {announcements[0].title}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {announcements[0].description}
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-yellow-500/80 font-bold group-hover:text-yellow-400">
              <span className="uppercase tracking-wider">Tap to read full announcement</span>
              <div className="flex items-center space-x-1">
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Categories */}
      <motion.div variants={item} className="mt-5 px-4 relative group">
        <div className="overflow-x-auto scrollbar-hide flex space-x-3 pb-2 pr-12">
          {[
            { id: 'ALL', icon: Calendar, label: 'ALL' },
            { id: 'TDM', icon: Swords, label: 'TDM' },
            { id: 'ERANGEL', icon: Trophy, label: 'ERANGEL' },
            { id: 'MIRAMAR', icon: Skull, label: 'MIRAMAR' },
            { id: 'LIVIK', icon: Zap, label: 'LIVIK' },
            { id: 'SANHOK', icon: Trees, label: 'SANHOK' },
            { id: 'RANDOM', icon: Dices, label: 'RANDOM\nTOURNAMENT', minWidth: 'min-w-[88px] px-2' },
            { id: 'EVENT', icon: Flame, label: 'EVENT' },
          ].map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center justify-center ${cat.minWidth || 'min-w-[74px] px-1.5'} h-[72px] rounded-xl border cursor-pointer transition-colors ${cat.id === activeCategory ? 'bg-zinc-900 border-yellow-500 text-yellow-500 shadow-lg shadow-yellow-500/10' : 'bg-pk-card border-pk-border text-zinc-400 hover:text-zinc-200'}`}
            >
              <cat.icon className="w-5 h-5 mb-1 shrink-0" />
              <span className="text-[8.5px] font-semibold text-center leading-tight whitespace-pre-line uppercase tracking-tight line-clamp-2">{t(cat.id)}</span>
            </div>
          ))}
        </div>
        
        {/* Right Scroll Indicator */}
        <div className="absolute right-4 top-0 bottom-2 w-12 bg-gradient-to-l from-black via-black/80 to-transparent pointer-events-none z-10 flex items-center justify-end pr-1">
          <motion.div 
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <ArrowRight className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
          </motion.div>
        </div>
      </motion.div>

      {/* Mode Filters (Solo & Duo on top, Trio & Squad below) */}
      <motion.div variants={item} className="mx-4 mt-5 bg-pk-card/90 border border-pk-border p-1.5 rounded-2xl shadow-lg space-y-1.5">
        {/* Top Row: SOLO & DUO */}
        <div className="grid grid-cols-2 gap-1.5">
          <button 
            type="button"
            onClick={() => setActiveMode('SOLO')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center transition-all ${
              activeMode === 'SOLO' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md shadow-yellow-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <User className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            <span>{t("SOLO")}</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('DUO')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center transition-all ${
              activeMode === 'DUO' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md shadow-yellow-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex -space-x-1 mr-1.5">
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>{t("DUO")}</span>
          </button>
        </div>

        {/* Bottom Row: TRIO & SQUAD */}
        <div className="grid grid-cols-2 gap-1.5">
          <button 
            type="button"
            onClick={() => setActiveMode('TRIO')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center transition-all ${
              activeMode === 'TRIO' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md shadow-yellow-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex -space-x-1 mr-1.5">
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>{t("TRIO")}</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('SQUAD')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center transition-all ${
              activeMode === 'SQUAD' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md shadow-yellow-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
            <span>{t("SQUAD")}</span>
          </button>
        </div>
      </motion.div>

      {/* Tournament Cards */}
      <motion.div variants={item} className="mt-5 px-4 flex space-x-5 overflow-x-auto scrollbar-hide pb-8">
        {filteredTournaments.length > 0 ? (
          filteredTournaments.map((tourney) => (
            <div 
              key={tourney.id} 
              onClick={() => handleCardClick(tourney)}
              className="min-w-[320px] w-[320px] bg-pk-card rounded-3xl border border-yellow-900/40 overflow-hidden flex flex-col cursor-pointer hover:border-yellow-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,179,8,0.1)] active:scale-[0.98] group"
            >
              <div className="relative h-36">
                <img src={tourney.image || "/match-card.png"} alt={tourney.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                
                <div className="absolute top-3 left-3 flex flex-col space-y-1.5">
                   {tourney.status === 'UPCOMING' && <MatchCountdown date={tourney.date} time={tourney.time} />}
                   {tourney.status === 'LIVE' && (
                     <div className="bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-red-400/40 flex items-center shadow-[0_0_12px_rgba(220,38,38,0.6)]">
                       <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-1.5" />
                       {t("STARTED")}
                     </div>
                   )}
                   {tourney.status === 'COMPLETED' && (
                     <div className="bg-zinc-900/90 text-zinc-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-zinc-700 flex items-center shadow">
                       {t("COMPLETED")}
                     </div>
                   )}
                   
                </div>

                <div className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg ${
                  tourney.status === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : 
                  tourney.status === 'COMPLETED' ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-600 text-white'
                }`}>
                  {t(tourney.status)}
                </div>

                
              </div>
              
              <div className="p-4 flex-1 flex flex-col bg-zinc-950">
                <div className="flex justify-between items-start mb-4">
                   <h3 className="font-black text-sm text-yellow-500 uppercase tracking-tight line-clamp-1">{tourney.title}</h3>
                   <div className="bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded text-[10px] font-black text-yellow-400 uppercase tracking-wider">
                      {t(tourney.mode)}
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("ENTRY")}</div>
                      <div className="text-[15px] font-black text-white flex items-center gap-1">
                         <img src={PK_COIN_ICON} alt="coin" className="w-4.5 h-4.5" />
                         {tourney.entryFee}
                      </div>
                   </div>
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PER KILL")}</div>
                      <div className="text-[15px] font-black text-white flex items-center gap-1">
                         <img src={PK_COIN_ICON} alt="coin" className="w-4.5 h-4.5" />
                         {tourney.perKill || 0}
                      </div>
                   </div>
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PRIZE")}</div>
                      <div className="text-[15px] font-black text-white flex items-center gap-1">
                         <img src={PK_COIN_ICON} alt="coin" className="w-4.5 h-4.5" />
                         {tourney.prizePool}
                      </div>
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("MAP")}</div>
                      <div className="text-[15px] font-black text-white truncate w-full">{tourney.type === 'BR' ? 'Erangel' : tourney.type}</div>
                   </div>
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("DATE")}</div>
                      <div className="text-[15px] font-black text-white truncate w-full">{formatDateShort(tourney.date)}</div>
                   </div>
                   <div className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/60 flex flex-col items-center justify-center text-center">
                      <div className="text-xs text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("TIME")}</div>
                      <div className="text-[15px] font-black text-white truncate w-full">{formatTimeAMPM(tourney.time)}</div>
                   </div>
                </div>


                <div className="space-y-2 mb-5">
                   <div className="flex justify-between items-end">
                      <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">{t("Slots Progress")}</div>
                      <div className="text-xs font-black text-white">
                         <span className={tourney.spotsFilled >= tourney.spotsTotal ? 'text-red-500' : 'text-yellow-500'}>{tourney.spotsFilled}</span>
                         <span className="text-zinc-600 mx-0.5">/</span>
                         <span className="text-zinc-400">{tourney.spotsTotal}</span>
                      </div>
                   </div>
                   <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(tourney.spotsFilled / tourney.spotsTotal) * 100}%` }}
                        className={`h-full transition-all duration-1000 ${
                          tourney.spotsFilled >= tourney.spotsTotal ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                        }`}
                      />
                   </div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <span>{tourney.spotsTotal - tourney.spotsFilled} {t("Slots Left")}</span>
                      <span>{Math.round((tourney.spotsFilled / tourney.spotsTotal) * 100)}% Full</span>
                   </div>
                </div>

                {tourney.status === 'COMPLETED' ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingPlayersTournament(tourney); }} 
                    className="mt-auto w-full font-black py-3.5 rounded-xl text-xs uppercase tracking-[0.2em] transition-all bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                  >
                    {t("SEE RESULTS")}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => handleJoinClick(e, tourney)} 
                    disabled={tourney.spotsFilled >= tourney.spotsTotal && !joinedMatches.some(m => m.tournamentId === tourney.id)}
                    className={`mt-auto w-full font-black py-3.5 rounded-xl text-xs uppercase tracking-[0.2em] transition-all font-extrabold ${
                      joinedMatches.some(m => m.tournamentId === tourney.id) 
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/20 active:scale-[0.95] shadow-md shadow-yellow-500/5' 
                        : tourney.spotsFilled >= tourney.spotsTotal 
                          ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                          : 'bg-gradient-pk bg-gradient-pk-hover text-black shadow-lg shadow-yellow-500/20 active:scale-[0.95]'
                    }`}
                  >
                    {joinedMatches.some(m => m.tournamentId === tourney.id) ? t('ROOM DETAILS') : tourney.spotsFilled >= tourney.spotsTotal ? t('MATCH FULL') : t('JOIN MATCH')}
                  </button>
                )}
                <div className="flex gap-2 mt-2 w-full">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setRulesModalMode('rules'); setShowRulesModal(tourney); }}
                    className="flex-1 font-black py-2.5 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                  >
                    {t("RULES")}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingPrizeDistribution(tourney); }}
                    className="flex-1 font-black py-2.5 rounded-xl text-[11px] uppercase tracking-[0.2em] transition-all bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                  >
                    {t("DETAILS")}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-zinc-500 text-center w-full py-8 text-xs font-semibold">
            No tournaments found for this category or mode.
          </div>
        )}
      </motion.div>

{document.getElementById('modal-root') ? createPortal((<>
            {/* Prize Distribution Modal */}
      <AnimatePresence>
        {viewingPrizeDistribution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingPrizeDistribution(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative"
            >
              <div className="relative w-full rounded-2xl overflow-hidden mb-6 border border-zinc-800 bg-zinc-900 shadow-xl">
                <img src={viewingPrizeDistribution.image || '/match-card.png'} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
                <div className="relative p-4 flex justify-between items-center min-h-[110px]">
                  <div className="z-10 flex flex-col justify-center max-w-[60%]">
                    <h2 className="text-xl sm:text-2xl font-black text-[#F2C94C] uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">PUBG LEGENDS</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1.5 space-y-1 sm:space-y-0">
                      <div className="flex items-center text-white text-[11px] sm:text-xs font-bold drop-shadow-md whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400 mr-1 shrink-0" />
                        Map: {viewingPrizeDistribution.type === 'BR' ? 'Erangel' : viewingPrizeDistribution.type}
                      </div>
                      <div className="flex items-center text-white text-[11px] sm:text-xs font-bold drop-shadow-md whitespace-nowrap">
                        <Gamepad2 className="w-3.5 h-3.5 text-green-400 mr-1 shrink-0" />
                        Mode: {viewingPrizeDistribution.mode}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute right-0 bottom-0 h-[88%] z-0 pointer-events-none origin-bottom flex items-end justify-end pr-1">
                    <img src="/character-box.png" alt="Character" className="h-full object-contain object-bottom max-w-[125px] drop-shadow-lg" />
                  </div>

                  <button
                    onClick={() => setViewingPrizeDistribution(null)}
                    className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                
                {/* Details Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-1.5">
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("ENTRY")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.entryFee}
                        </div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PER KILL")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.perKill || 0}
                        </div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PRIZE")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.prizePool}
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("MAP")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{viewingPrizeDistribution.type === 'BR' ? 'Erangel' : viewingPrizeDistribution.type}</div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("DATE")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{formatDateShort(viewingPrizeDistribution.date)}</div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("TIME")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{formatTimeAMPM(viewingPrizeDistribution.time)}</div>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">{t("Slots Progress")}</span>
                       <span className="text-[8px] font-black text-white">
                         <span className="text-yellow-500">{viewingPrizeDistribution.spotsFilled}</span> / {viewingPrizeDistribution.spotsTotal}
                       </span>
                     </div>
                     <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                       <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, ((viewingPrizeDistribution.spotsFilled || 0) / (viewingPrizeDistribution.spotsTotal || 1)) * 100)}%` }} />
                     </div>
                     <div className="flex justify-between items-center mt-1.5">
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">
                         {Math.max(0, viewingPrizeDistribution.spotsTotal - viewingPrizeDistribution.spotsFilled)} {t("Slots Left")}
                       </span>
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">
                         {Math.round(Math.min(100, ((viewingPrizeDistribution.spotsFilled || 0) / (viewingPrizeDistribution.spotsTotal || 1)) * 100))}% {t("Full")}
                       </span>
                     </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-800/50 w-full" />
                
                <div>
                  <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-3">Prize Distribution</h3>
                {viewingPrizeDistribution.prizeDistribution && viewingPrizeDistribution.prizeDistribution.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {viewingPrizeDistribution.prizeDistribution.map((pd: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                          Top {pd.rank}
                        </div>
                        <div className="text-xs font-black text-yellow-500 flex items-center gap-0.5">
                          <img src={PK_COIN_ICON} alt="coin" className="w-3 h-3" />
                          {pd.prize}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-semibold">No prize distribution specified.</p>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules / Room Info Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Match Rules & Room
                </h3>
                <button onClick={() => setShowRulesModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                {rulesModalMode === 'room' && (
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-yellow-500/60 uppercase font-bold mb-3 flex items-center tracking-widest">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mr-2" /> Room Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] text-zinc-500 italic">* Room ID & Pass will be updated 10 mins before match start.</p>
                </div>
                )}

                <div className="space-y-2.5">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-widest">Important Rules</div>
                  {(() => {
                    const tourney = tournaments.find(t => t.id === showRulesModal.tournamentId || t.id === showRulesModal.id) || showRulesModal;
                    const rules = tourney.rules || '';
                    const rulesList = rules.split('\n').filter((r: string) => r.trim());
                    
                    if (rulesList.length > 0) {
                      return rulesList.map((rule: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">{rule}</p>
                        </div>
                      ));
                    }
                    
                    return (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Emulators are strictly prohibited. Using them will result in a ban without refund.</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Team up in solo matches is not allowed. All players involved will be disqualified.</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Ensure your in-game name matches exactly with your profile name.</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                <button 
                  onClick={() => setShowRulesModal(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joined Players Modal */}
      <AnimatePresence>
        {viewingPlayersTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <User className="w-4 h-4 mr-2" /> Joined Players
                </h3>
                <button onClick={() => setViewingPlayersTournament(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Match Details</div>
                <div className="text-xs font-bold text-white">{viewingPlayersTournament.title}</div>

                <div className="flex items-center mt-3 text-[10px] text-zinc-500 font-semibold">
                  <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded mr-2 w-8 text-center">#</span>
                  <span>IN-GAME NAME</span>
                </div>
              </div>
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {isLoadingPlayers ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading Players...</div>
                ) : matchPlayers.length > 0 ? (
                  matchPlayers.map((player, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-yellow-500 mr-3 border border-zinc-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                          {player.slot}
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">{player.inGameName || 'No Name'}</div>
                        </div>
                      </div>
                      {viewingPlayersTournament.status === 'COMPLETED' ? (
                         <div className="text-right">
                           {player.rank ? (
                             <div className="text-[10px] font-bold text-white">Rank <span className="text-yellow-500">#{player.rank}</span></div>
                           ) : (
                             <div className="text-[10px] text-zinc-500">No Rank</div>
                           )}
                           <div className="text-[9px] text-zinc-500">{player.kills || 0} Kills</div>
                         </div>
                      ) : (
                         <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <User className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No players joined yet</div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                 {joinedMatches.some(m => m.tournamentId === viewingPlayersTournament.id) ? (
                  <button 
                  onClick={() => {
                    const joined = joinedMatches.find(m => m.tournamentId === viewingPlayersTournament.id);
                    setViewingPlayersTournament(null);
                    setShowRulesModal(joined);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors border border-zinc-700"
                >
                  View Match Rules
                </button>
                ) : (
                  <button 
                  onClick={() => {
                    const t = viewingPlayersTournament;
                    setViewingPlayersTournament(null);
                    setSelectedTournament(t);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  Join This Match
                </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase">{selectedTournament.title}</h3>
                <button onClick={() => setSelectedTournament(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-orange-500 uppercase mb-0.5">Tournament Rules</h4>
                    <div className="text-[10px] text-zinc-300 leading-relaxed space-y-1">
                      {selectedTournament.rules ? (
                        selectedTournament.rules.split('\n').filter((r: string) => r.trim()).map((rule: string, idx: number) => (
                          <div key={idx} className="flex items-start">
                            <span className="text-yellow-500 mr-1.5">•</span>
                            <span>{rule}</span>
                          </div>
                        ))
                      ) : (
                        <p>Make sure you have the correct game ID. Do not use hacks or third-party apps. Any violation will result in an instant ban without refund.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase mb-2">Select Your Slot</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: selectedTournament.spotsTotal }).map((_, i) => {
                      const slotNo = i + 1;
                      const isOccupied = slotNo <= selectedTournament.spotsFilled;
                      return (
                        <button
                          key={slotNo}
                          disabled={isOccupied}
                          onClick={() => setSelectedSlot(slotNo)}
                          className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                            isOccupied 
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed' 
                              : selectedSlot === slotNo 
                                ? 'bg-yellow-500 text-black border border-yellow-500' 
                                : 'bg-pk-card border border-pk-border text-zinc-400 hover:border-yellow-500/50'
                          }`}
                        >
                          {slotNo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                <button 
                  onClick={handleConfirmEntry}
                  disabled={isJoining}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'PROCESSING...' : `CONFIRM ENTRY (PKR ${selectedTournament.entryFee})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Details Modal */}
      <AnimatePresence>
        {showTeamModal && selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-100px)] shadow-[0_0_50px_rgba(234,179,8,0.1)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-tight flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Team Details ({selectedTournament.mode})
                  </h3>
                </div>
                <button onClick={() => setShowTeamModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Warning</h4>
                    <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                      enter your real teammate ign and id otherwise random will kick from room
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Leader (Current User) - Editable, 1 input per row */}
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-xl p-3.5 relative overflow-hidden space-y-3">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-2.5 py-1 rounded-bl-lg uppercase tracking-widest">
                      Leader (You)
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader In-Game Name (IGN)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your IGN..."
                        value={leaderInGameName} 
                        onChange={(e) => setLeaderInGameName(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader Character ID (UID)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your Character ID..."
                        value={leaderGameUid} 
                        onChange={(e) => setLeaderGameUid(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* Teammates - 1 input per row */}
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3.5 relative space-y-3">
                      <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">
                        Teammate {idx + 1}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} In-Game Name (IGN)</label>
                        <input 
                          type="text" 
                          placeholder="Teammate IGN..."
                          value={member.inGameName} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].inGameName = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} Character ID (UID)</label>
                        <input 
                          type="text"
                          placeholder="Teammate Character ID..." 
                          value={member.gameUid} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].gameUid = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                <button 
                  onClick={() => {
                    const isIncomplete = teamMembers.some(m => !m.inGameName.trim() || !m.gameUid.trim());
                    if (isIncomplete) {
                      toast.error('Please fill in all teammate details');
                      return;
                    }
                    executeJoinMatch(teamMembers);
                  }}
                  disabled={isJoining}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50"
                >
                  {isJoining ? 'PROCESSING...' : 'JOIN MATCH'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

</>), document.getElementById('modal-root')!) : (<>
            {/* Prize Distribution Modal */}
      <AnimatePresence>
        {viewingPrizeDistribution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingPrizeDistribution(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative"
            >
              <div className="relative w-full rounded-2xl overflow-hidden mb-6 border border-zinc-800 bg-zinc-900 shadow-xl">
                <img src={viewingPrizeDistribution.image || '/match-card.png'} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
                <div className="relative p-4 flex justify-between items-center min-h-[110px]">
                  <div className="z-10 flex flex-col justify-center max-w-[60%]">
                    <h2 className="text-xl sm:text-2xl font-black text-[#F2C94C] uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">PUBG LEGENDS</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1.5 space-y-1 sm:space-y-0">
                      <div className="flex items-center text-white text-[11px] sm:text-xs font-bold drop-shadow-md whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400 mr-1 shrink-0" />
                        Map: {viewingPrizeDistribution.type === 'BR' ? 'Erangel' : viewingPrizeDistribution.type}
                      </div>
                      <div className="flex items-center text-white text-[11px] sm:text-xs font-bold drop-shadow-md whitespace-nowrap">
                        <Gamepad2 className="w-3.5 h-3.5 text-green-400 mr-1 shrink-0" />
                        Mode: {viewingPrizeDistribution.mode}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute right-0 bottom-0 h-[88%] z-0 pointer-events-none origin-bottom flex items-end justify-end pr-1">
                    <img src="/character-box.png" alt="Character" className="h-full object-contain object-bottom max-w-[125px] drop-shadow-lg" />
                  </div>

                  <button
                    onClick={() => setViewingPrizeDistribution(null)}
                    className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                
                {/* Details Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-1.5">
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("ENTRY")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.entryFee}
                        </div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PER KILL")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.perKill || 0}
                        </div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("PRIZE")}</div>
                        <div className="text-sm font-black text-white flex items-center gap-1">
                           <img src={PK_COIN_ICON} alt="coin" className="w-4 h-4" />
                           {viewingPrizeDistribution.prizePool}
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("MAP")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{viewingPrizeDistribution.type === 'BR' ? 'Erangel' : viewingPrizeDistribution.type}</div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("DATE")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{formatDateShort(viewingPrizeDistribution.date)}</div>
                     </div>
                     <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">{t("TIME")}</div>
                        <div className="text-sm font-black text-white truncate w-full">{formatTimeAMPM(viewingPrizeDistribution.time)}</div>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">{t("Slots Progress")}</span>
                       <span className="text-[8px] font-black text-white">
                         <span className="text-yellow-500">{viewingPrizeDistribution.spotsFilled}</span> / {viewingPrizeDistribution.spotsTotal}
                       </span>
                     </div>
                     <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                       <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, ((viewingPrizeDistribution.spotsFilled || 0) / (viewingPrizeDistribution.spotsTotal || 1)) * 100)}%` }} />
                     </div>
                     <div className="flex justify-between items-center mt-1.5">
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">
                         {Math.max(0, viewingPrizeDistribution.spotsTotal - viewingPrizeDistribution.spotsFilled)} {t("Slots Left")}
                       </span>
                       <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest">
                         {Math.round(Math.min(100, ((viewingPrizeDistribution.spotsFilled || 0) / (viewingPrizeDistribution.spotsTotal || 1)) * 100))}% {t("Full")}
                       </span>
                     </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-800/50 w-full" />
                
                <div>
                  <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-3">Prize Distribution</h3>
                {viewingPrizeDistribution.prizeDistribution && viewingPrizeDistribution.prizeDistribution.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {viewingPrizeDistribution.prizeDistribution.map((pd: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                          Top {pd.rank}
                        </div>
                        <div className="text-xs font-black text-yellow-500 flex items-center gap-0.5">
                          <img src={PK_COIN_ICON} alt="coin" className="w-3 h-3" />
                          {pd.prize}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-semibold">No prize distribution specified.</p>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules / Room Info Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Match Rules & Room
                </h3>
                <button onClick={() => setShowRulesModal(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                {rulesModalMode === 'room' && (
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
                  <div className="text-[10px] text-yellow-500/60 uppercase font-bold mb-3 flex items-center tracking-widest">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full mr-2" /> Room Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Room ID</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).roomId); toast.success('Room ID copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Password</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-mono font-bold text-white tracking-wider">{ (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password || 'WAITING...' }</div>
                        { (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password && (tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password !== 'WAITING...' && (
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText((tournaments.find(t => t.id === showRulesModal.tournamentId) || showRulesModal).password); toast.success('Password copied!'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] text-zinc-500 italic">* Room ID & Pass will be updated 10 mins before match start.</p>
                </div>
                )}

                <div className="space-y-2.5">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-widest">Important Rules</div>
                  {(() => {
                    const tourney = tournaments.find(t => t.id === showRulesModal.tournamentId || t.id === showRulesModal.id) || showRulesModal;
                    const rules = tourney.rules || '';
                    const rulesList = rules.split('\n').filter((r: string) => r.trim());
                    
                    if (rulesList.length > 0) {
                      return rulesList.map((rule: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">{rule}</p>
                        </div>
                      ));
                    }
                    
                    return (
                      <>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Emulators are strictly prohibited. Using them will result in a ban without refund.</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Team up in solo matches is not allowed. All players involved will be disqualified.</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-[10px] text-zinc-300 leading-relaxed">Ensure your in-game name matches exactly with your profile name.</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                <button 
                  onClick={() => setShowRulesModal(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Joined Players Modal */}
      <AnimatePresence>
        {viewingPlayersTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase tracking-tight">
                  <User className="w-4 h-4 mr-2" /> Joined Players
                </h3>
                <button onClick={() => setViewingPlayersTournament(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
                <div className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Match Details</div>
                <div className="text-xs font-bold text-white">{viewingPlayersTournament.title}</div>

                <div className="flex items-center mt-3 text-[10px] text-zinc-500 font-semibold">
                  <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded mr-2 w-8 text-center">#</span>
                  <span>IN-GAME NAME</span>
                </div>
              </div>
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {isLoadingPlayers ? (
                  <div className="text-center py-10 text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading Players...</div>
                ) : matchPlayers.length > 0 ? (
                  matchPlayers.map((player, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-yellow-500 mr-3 border border-zinc-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                          {player.slot}
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">{player.inGameName || 'No Name'}</div>
                        </div>
                      </div>
                      {viewingPlayersTournament.status === 'COMPLETED' ? (
                         <div className="text-right">
                           {player.rank ? (
                             <div className="text-[10px] font-bold text-white">Rank <span className="text-yellow-500">#{player.rank}</span></div>
                           ) : (
                             <div className="text-[10px] text-zinc-500">No Rank</div>
                           )}
                           <div className="text-[9px] text-zinc-500">{player.kills || 0} Kills</div>
                         </div>
                      ) : (
                         <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <User className="w-12 h-12 text-zinc-800 mb-2" />
                    <div className="text-zinc-500 font-bold text-sm">No players joined yet</div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                 {joinedMatches.some(m => m.tournamentId === viewingPlayersTournament.id) ? (
                  <button 
                  onClick={() => {
                    const joined = joinedMatches.find(m => m.tournamentId === viewingPlayersTournament.id);
                    setViewingPlayersTournament(null);
                    setShowRulesModal(joined);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors border border-zinc-700"
                >
                  View Match Rules
                </button>
                ) : (
                  <button 
                  onClick={() => {
                    const t = viewingPlayersTournament;
                    setViewingPlayersTournament(null);
                    setSelectedTournament(t);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors"
                >
                  Join This Match
                </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80 "
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-140px)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <h3 className="text-sm font-bold text-yellow-500 flex items-center uppercase">{selectedTournament.title}</h3>
                <button onClick={() => setSelectedTournament(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-orange-500 uppercase mb-0.5">Tournament Rules</h4>
                    <div className="text-[10px] text-zinc-300 leading-relaxed space-y-1">
                      {selectedTournament.rules ? (
                        selectedTournament.rules.split('\n').filter((r: string) => r.trim()).map((rule: string, idx: number) => (
                          <div key={idx} className="flex items-start">
                            <span className="text-yellow-500 mr-1.5">•</span>
                            <span>{rule}</span>
                          </div>
                        ))
                      ) : (
                        <p>Make sure you have the correct game ID. Do not use hacks or third-party apps. Any violation will result in an instant ban without refund.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white uppercase mb-2">Select Your Slot</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: selectedTournament.spotsTotal }).map((_, i) => {
                      const slotNo = i + 1;
                      const isOccupied = slotNo <= selectedTournament.spotsFilled;
                      return (
                        <button
                          key={slotNo}
                          disabled={isOccupied}
                          onClick={() => setSelectedSlot(slotNo)}
                          className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                            isOccupied 
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed' 
                              : selectedSlot === slotNo 
                                ? 'bg-yellow-500 text-black border border-yellow-500' 
                                : 'bg-pk-card border border-pk-border text-zinc-400 hover:border-yellow-500/50'
                          }`}
                        >
                          {slotNo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                <button 
                  onClick={handleConfirmEntry}
                  disabled={isJoining}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'PROCESSING...' : `CONFIRM ENTRY (PKR ${selectedTournament.entryFee})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Details Modal */}
      <AnimatePresence>
        {showTeamModal && selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pb-20 pt-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-900/50 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100dvh-100px)] shadow-[0_0_50px_rgba(234,179,8,0.1)]"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-tight flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Team Details ({selectedTournament.mode})
                  </h3>
                </div>
                <button onClick={() => setShowTeamModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Warning</h4>
                    <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                      enter your real teammate ign and id otherwise random will kick from room
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Leader (Current User) - Editable, 1 input per row */}
                  <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-xl p-3.5 relative overflow-hidden space-y-3">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-2.5 py-1 rounded-bl-lg uppercase tracking-widest">
                      Leader (You)
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader In-Game Name (IGN)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your IGN..."
                        value={leaderInGameName} 
                        onChange={(e) => setLeaderInGameName(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Leader Character ID (UID)</label>
                      <input 
                        type="text" 
                        placeholder="Enter your Character ID..."
                        value={leaderGameUid} 
                        onChange={(e) => setLeaderGameUid(e.target.value)}
                        className="w-full bg-zinc-900 border border-yellow-500/40 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600 shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* Teammates - 1 input per row */}
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3.5 relative space-y-3">
                      <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest">
                        Teammate {idx + 1}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} In-Game Name (IGN)</label>
                        <input 
                          type="text" 
                          placeholder="Teammate IGN..."
                          value={member.inGameName} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].inGameName = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Teammate {idx + 1} Character ID (UID)</label>
                        <input 
                          type="text"
                          placeholder="Teammate Character ID..." 
                          value={member.gameUid} 
                          onChange={(e) => {
                            const newMembers = [...teamMembers];
                            newMembers[idx].gameUid = e.target.value;
                            setTeamMembers(newMembers);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-zinc-600" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                <button 
                  onClick={() => {
                    const isIncomplete = teamMembers.some(m => !m.inGameName.trim() || !m.gameUid.trim());
                    if (isIncomplete) {
                      toast.error('Please fill in all teammate details');
                      return;
                    }
                    executeJoinMatch(teamMembers);
                  }}
                  disabled={isJoining}
                  className="w-full bg-gradient-pk bg-gradient-pk-hover text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] disabled:opacity-50"
                >
                  {isJoining ? 'PROCESSING...' : 'JOIN MATCH'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

</>)}

      {/* Announcements & News Full Screen View (Portaled to document.body so it always opens reliably) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAnnouncementsScreen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col overflow-hidden text-left"
            >
              {/* Header: strictly Back icon and ANNOUNCEMENTS & NEWS text */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-20 shrink-0">
                <div className="flex items-center">
                  <button
                    onClick={() => setShowAnnouncementsScreen(false)}
                    className="p-2 -ml-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center active:scale-95"
                    title="Back to Home"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="ml-2">
                    <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                      ANNOUNCEMENTS & NEWS
                    </h1>
                    <p className="text-[10px] text-zinc-400 font-medium">Official updates and match alerts</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-500 font-black px-2.5 py-1 rounded-full border border-yellow-500/20">
                    {announcements?.length || 0} POSTS
                  </span>
                </div>
              </div>

              {/* Posts Content List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {(!announcements || announcements.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                      <Megaphone className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-black text-base uppercase tracking-wider mb-1.5">No Announcements Yet</h3>
                    <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
                      Tournament winners, match updates, alerts, and news will appear here when posted by admin.
                    </p>
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item.id || Math.random()}
                      className="bg-zinc-900/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all"
                    >
                      {item.imageUrl && (
                        <div className="relative w-full aspect-[16/9] max-h-72 bg-zinc-950 overflow-hidden border-b border-zinc-800/60">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="p-4 sm:p-5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          {item.tag && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                              {item.tag}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-zinc-500 ml-auto">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'Recent'}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white tracking-wide leading-snug">
                          {item.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}
