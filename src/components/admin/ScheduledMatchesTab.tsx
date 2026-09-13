import React from 'react';
import { 
  CalendarClock, Clock, Sliders, Zap, CheckCircle, 
  AlertTriangle, Plus, Play, Calendar, MapPin, 
  Users, Key, FileText, Edit2, Trash2
} from 'lucide-react';
import { Tournament } from '../../types';
import { PK_COIN_ICON } from '../../lib/assets';

interface ScheduledMatchesTabProps {
  tournaments: Tournament[];
  scheduleUploadDateTime: string;
  setScheduleUploadDateTime: (val: string) => void;
  publishOnTime: boolean;
  setPublishOnTime: (val: boolean) => void;
  formatScheduledTime: (dateTimeStr?: string) => string;
  getPublishCountdown: (scheduledPublishTime?: string) => { isReady: boolean; label: string };
  onAddMatchClick: () => void;
  onPublishNow: (matchId: string, title?: string) => void;
  onEditMatch: (match: Tournament) => void;
  onDeleteMatch: (matchId: string) => void;
  onViewPlayers?: (matchId: string) => void;
  onRoomInfo?: (match: Tournament) => void;
  onRules?: (match: Tournament) => void;
}

export const ScheduledMatchesTab: React.FC<ScheduledMatchesTabProps> = ({
  tournaments,
  scheduleUploadDateTime,
  setScheduleUploadDateTime,
  publishOnTime,
  setPublishOnTime,
  formatScheduledTime,
  getPublishCountdown,
  onAddMatchClick,
  onPublishNow,
  onEditMatch,
  onDeleteMatch,
  onViewPlayers,
  onRoomInfo,
  onRules,
}) => {
  const scheduledList = tournaments.filter(
    t => !t.isDeleted && (t.isScheduled || t.status === 'SCHEDULED')
  );

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Schedule Matches
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 lowercase tracking-normal">
                  auto-publishing
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Set upload date & time and toggle auto-publish. Matches will remain in pending status and will push live to tournaments at the scheduled upload time.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-xs font-bold text-zinc-300">
              Pending Scheduled: <span className="text-yellow-500 font-mono">{scheduledList.length}</span>
            </div>
          </div>
        </div>

        {/* Upload Time & Auto-Publish Settings */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 space-y-5">
          <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-widest">
            <Sliders className="w-4 h-4" />
            <span>Upload Schedule & Automation Controls</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time of Upload Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-yellow-500" />
                  Time of Upload (Date & Time)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Fixed Time • Auto Next Day
                </span>
              </label>
              <input 
                type="datetime-local" 
                value={scheduleUploadDateTime} 
                onChange={(e) => setScheduleUploadDateTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none transition-colors"
              />
              {/* Quick time adjustment chips - Preserves admin time & advances day */}
              {(() => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const currDate = new Date(scheduleUploadDateTime);
                const hasValidDate = !isNaN(currDate.getTime());
                const h = hasValidDate ? currDate.getHours() : 18;
                const m = hasValidDate ? currDate.getMinutes() : 30;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const timeOnlyFormatted = `${pad(h12)}:${pad(m)} ${ampm}`;

                const setDateKeepTime = (daysFromNow: number) => {
                  const d = new Date();
                  d.setDate(d.getDate() + daysFromNow);
                  d.setHours(h, m, 0, 0);
                  setScheduleUploadDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`);
                };

                const addMs = (ms: number) => {
                  const base = hasValidDate ? currDate.getTime() : Date.now();
                  const d = new Date(base + ms);
                  setScheduleUploadDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                };

                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 self-center mr-1 font-semibold">Quick Day/Time:</span>
                      
                      {/* 1. Next Day (Keep Admin Time) */}
                      <button
                        type="button"
                        onClick={() => setDateKeepTime(1)}
                        className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 text-[10px] font-black transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                        title={`Set to Tomorrow at ${timeOnlyFormatted}`}
                      >
                        <CalendarClock className="w-3 h-3 text-yellow-400" />
                        <span>Tomorrow ({timeOnlyFormatted})</span>
                      </button>

                      {/* 2. Day After Tomorrow (+2 Days, Keep Time) */}
                      <button
                        type="button"
                        onClick={() => setDateKeepTime(2)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition-colors"
                        title={`Set to Day After Tomorrow at ${timeOnlyFormatted}`}
                      >
                        +2 Days
                      </button>

                      {/* 3. +3 Days */}
                      <button
                        type="button"
                        onClick={() => setDateKeepTime(3)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition-colors"
                        title={`Set to 3 Days later at ${timeOnlyFormatted}`}
                      >
                        +3 Days
                      </button>

                      {/* 4. Today (if not passed) */}
                      <button
                        type="button"
                        onClick={() => setDateKeepTime(0)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition-colors"
                        title={`Reset to Today at ${timeOnlyFormatted}`}
                      >
                        Today
                      </button>

                      {/* 5. Minute/Hour adjustments */}
                      <button
                        type="button"
                        onClick={() => addMs(30 * 60 * 1000)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium transition-colors"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        onClick={() => addMs(60 * 60 * 1000)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium transition-colors"
                      >
                        +1h
                      </button>
                    </div>

                    <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <span>Upload Time: <strong className="text-white">{formatScheduledTime(scheduleUploadDateTime)}</strong></span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Time: <strong className="text-yellow-400">{timeOnlyFormatted}</strong> (Auto Next Day)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Toggle: Publish matches on time */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Publish Matches On Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setPublishOnTime(!publishOnTime)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      publishOnTime ? 'bg-yellow-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                        publishOnTime ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {publishOnTime ? (
                    <span className="text-green-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      Auto-Publish ACTIVE: Matches will automatically push to live Upcoming Tournaments at the selected upload time.
                    </span>
                  ) : (
                    <span className="text-yellow-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Auto-Publish PAUSED: Matches will stay pending until you manually click "Publish Now".
                    </span>
                  )}
                </p>
              </div>

              <div className="text-[11px] text-zinc-500 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/40">
                ⚡ Matches added below are saved in <span className="text-yellow-500 font-bold">PENDING</span> status and are completely hidden from regular players until published.
              </div>
            </div>
          </div>

          {/* Add Matches Button - Directly underneath settings */}
          <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              Click <span className="text-yellow-500 font-bold">Add Matches</span> below to configure tournament match details with this scheduled upload time.
            </div>
            <button
              type="button"
              onClick={onAddMatchClick}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_16px_rgba(234,179,8,0.25)] flex items-center justify-center space-x-2 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Matches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Matches Queue */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Scheduled Matches Queue ({scheduledList.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pending matches waiting for upload time to become live in tournaments.
            </p>
          </div>
        </div>

        {scheduledList.length === 0 ? (
          <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
              <CalendarClock className="w-7 h-7 text-yellow-500/50" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No Scheduled Matches</h4>
            <p className="text-xs text-zinc-500 max-w-md mb-5">
              You don't have any pending scheduled matches. Set your upload date and time above and click <span className="text-yellow-500 font-semibold">"Add Matches"</span> to schedule upcoming tournaments.
            </p>
            <button
              type="button"
              onClick={onAddMatchClick}
              className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule First Match</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6 w-full">
            {scheduledList.map((t, i) => {
              const countdown = getPublishCountdown(t.scheduledPublishTime);
              const spotsFilled = t.spotsFilled || 0;
              const spotsTotal = t.spotsTotal || 48;
              const fillPercentage = Math.min(100, Math.round((spotsFilled / spotsTotal) * 100));
              const matchBanner = t.image || (
                t.type === 'TDM' ? '/tdm-card.png' :
                t.type === 'Erangel' ? '/erangel-card.png' :
                t.type === 'Miramar' ? '/miramar-card.png' :
                t.type === 'Livik' ? '/livik-card.png' :
                t.type === 'Sanhok' ? '/sanhok-card.png' :
                '/match-card.png'
              );

              return (
                <div 
                  key={t.id || i}
                  className="w-full bg-[#121215] border border-zinc-800 hover:border-yellow-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col relative group"
                >
                  {/* Top Neon Line */}
                  <div className="h-1 w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600"></div>

                  {/* 1. Header: MATCH Tag, Title & PENDING Status Badge */}
                  <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40">
                    <div className="flex justify-between items-center mb-1.5">
                      {/* MATCH Tag */}
                      <span className="bg-yellow-400 text-black font-black text-[11px] px-2.5 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
                        MATCH #{(t as any).matchNumber || (t as any).matchNo || (i + 1)}
                      </span>
                      {/* PENDING Status Badge */}
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border bg-yellow-400/10 text-yellow-400 border-yellow-400/30 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                        PENDING
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-extrabold text-white text-base tracking-wide leading-tight line-clamp-1">
                      {t.title}
                    </h4>
                  </div>

                  {/* 2. Match Landscape Banner Image (Title ke baad) */}
                  <div className="px-4 pt-3.5">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 shadow-md group">
                      <img 
                        src={matchBanner} 
                        alt={t.title || 'Match Banner'} 
                        onError={(e) => { (e.target as HTMLImageElement).src = '/match-card.png'; }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-2.5 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span> {t.type || 'TDM'} • {t.mode || 'SOLO'}
                      </div>
                    </div>
                  </div>

                  {/* 3. Main Body Content */}
                  <div className="p-4 space-y-3 flex-1">
                    {/* Financials Hero Banner (ENTRY / PER KILL / PRIZE) */}
                    <div className="grid grid-cols-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl divide-x divide-zinc-800/80 p-2.5 text-center shadow-inner">
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">ENTRY</div>
                        <div className="text-xs font-black text-white mt-0.5 flex items-center justify-center gap-1">
                          {t.entryFee ? (
                            <>
                              <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
                              <span>{t.entryFee}</span>
                            </>
                          ) : (
                            'FREE'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">PER KILL</div>
                        <div className="text-xs font-black text-yellow-400 mt-0.5 flex items-center justify-center gap-1">
                          <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
                          <span>{t.perKill || 0}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">PRIZE</div>
                        <div className="text-xs font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                          <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
                          <span>{t.prizePool || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Map & Slots Progress Bar */}
                    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-yellow-400" /> 
                          Map: <span className="text-white font-bold">{t.map || t.type || 'TDM'}</span>
                        </span>
                        <span className="text-[11px] font-bold text-zinc-300">
                          <span className="text-yellow-400 font-black">{spotsFilled}</span> / {spotsTotal} Slots
                        </span>
                      </div>
                      {/* Yellow Progress Bar */}
                      <div className="w-full bg-zinc-800/90 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${fillPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Room Credentials Box (Centered, with Pass Given underneath) */}
                    <div className="bg-black/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-1.5">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        ROOM ID / PASS
                      </div>
                      <div className="font-mono text-xs font-bold tracking-wider text-zinc-200">
                        {t.roomId ? `${t.roomId} / ${t.password || '******'}` : 'Not Assigned'}
                      </div>
                      <div className="pt-0.5">
                        <span className={`text-[10px] font-black px-3 py-0.5 rounded-md uppercase tracking-wider border inline-block ${
                          t.roomId 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {t.roomId ? 'PASS GIVEN' : 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Match Start Countdown Timer (Centered) */}
                    <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-zinc-900/90 border border-yellow-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-1.5">
                      <div className="text-[9px] text-zinc-400 uppercase font-black tracking-widest flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-yellow-400 animate-spin" style={{ animationDuration: '8s' }} />
                        <span>COUNTDOWN</span>
                      </div>
                      <div className="text-xs font-black text-yellow-400 tracking-tight font-mono bg-black/70 px-3 py-1 rounded border border-zinc-800">
                        {(() => {
                          if (!t.date || !t.time) return 'TBD';
                          const matchTime = new Date(`${t.date} ${t.time}`).getTime();
                          if (isNaN(matchTime)) return 'TBD';
                          const diff = matchTime - Date.now();
                          if (diff <= 0) return 'MATCH STARTED';
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                          return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
                        })()}
                      </div>
                    </div>

                    {/* DATE & TIME (Countdown Ke Baad - Left & Right) */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/30 border border-zinc-800/60 px-3.5 py-2 rounded-xl">
                      <span className="flex items-center gap-2 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{t.date || 'TBD'}</span>
                      </span>
                      <span className="flex items-center gap-2 font-medium">
                        <Clock className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{t.time || 'TBD'}</span>
                      </span>
                    </div>

                    {/* --- BEAUTIFULLY REDESIGNED TIME OF UPLOAD SECTION --- */}
                    <div className="relative overflow-hidden bg-gradient-to-b from-yellow-500/[0.08] via-zinc-950 to-zinc-950 border border-yellow-500/30 rounded-xl p-3.5 shadow-lg space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                            <CalendarClock className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                            TIME OF UPLOAD
                          </span>
                        </div>
                        
                        {/* Auto-Publish status pill */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.autoPublishOnTime !== false 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            t.autoPublishOnTime !== false ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                          }`} />
                          {t.autoPublishOnTime !== false ? 'Auto-Publish: ON' : 'Manual Push'}
                        </span>
                      </div>

                      {/* Scheduled Upload Date & Time */}
                      <div className="bg-black/70 border border-zinc-800/80 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span>{formatScheduledTime(t.scheduledPublishTime)}</span>
                        </span>
                      </div>

                      {/* Countdown to Live Ticker */}
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-yellow-400" />
                          COUNTDOWN TO LIVE:
                        </span>
                        <span className="font-mono text-xs font-black tracking-wider text-yellow-400 tabular-nums">
                          {countdown.isReady ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3" /> Ready to Publish
                            </span>
                          ) : (
                            countdown.label
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Action Buttons */}
                  <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 space-y-2">
                    {/* Publish Now - Instant Live Push */}
                    <button 
                      onClick={() => onPublishNow(t.id, t.title)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-widest transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 active:scale-95"
                      title="Publish immediately to Live Tournaments"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Publish Now (Go Live)</span>
                    </button>

                    {/* Upper Row: Players, Room, Rules */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => onViewPlayers && onViewPlayers(t.id)} 
                        className="py-2 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        title="View Players"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Players</span>
                      </button>
                      
                      <button 
                        onClick={() => onRoomInfo && onRoomInfo(t)} 
                        className="py-2 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        title="Room Info"
                      >
                        <Key className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Room</span>
                      </button>
                      
                      <button 
                        onClick={() => onRules && onRules(t)} 
                        className="py-2 px-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        title="Match Rules"
                      >
                        <FileText className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Rules</span>
                      </button>
                    </div>

                    {/* Lower Row: Edit, Delete */}
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => onEditMatch(t)} 
                        className="py-2 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        title="Edit Match"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => onDeleteMatch(t.id)} 
                        className="py-2 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        title="Delete Match"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
