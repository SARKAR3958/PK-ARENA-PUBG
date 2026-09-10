import { motion } from 'motion/react';
import { Trophy, Medal, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PK_COIN_ICON, DEFAULT_AVATAR } from '../lib/assets';

export function Leaderboard() {
  const { currentUser, leaderboard, t } = useApp();
  
  const leaderboardData = leaderboard.slice(0, 20).map((user, index) => ({
    rank: index + 1,
    username: user.username || 'Anonymous',
    coinsWon: user.totalEarnings || 0,
    isCurrentUser: user.uid === currentUser?.uid,
    avatarUrl: user.avatarUrl
  }));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col min-h-full pb-6 overflow-y-auto scrollbar-hide"
    >
      <motion.div variants={item} className="mx-4 mt-4 bg-gradient-to-br from-yellow-900/40 via-zinc-900 to-zinc-950 border border-yellow-500/30 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <h2 className="text-2xl font-bold font-display tracking-wider text-gradient mb-1">{t("LEADERBOARD")}</h2>
          <p className="text-xs text-zinc-400">{t("Top players by total coins won")}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="mx-4 mt-4 flex items-center justify-between px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span className="w-8 text-center">{t("Rank")}</span>
        <span className="flex-1 ml-4">{t("Player")}</span>
        <span className="flex items-center space-x-1">
          <img src={PK_COIN_ICON} alt="Coin" className="w-3.5 h-3.5 object-contain" />
          <span>{t("Coins Won")}</span>
        </span>
      </motion.div>

      <motion.div variants={item} className="mx-4 mt-2 space-y-2">
        {leaderboardData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
            <Flame className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">{t("No Players Yet")}</p>
          </div>
        ) : leaderboardData.map((player) => (
          <div 
            key={player.rank}
            className={`flex items-center p-3 rounded-xl border ${player.isCurrentUser ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <div className="w-8 flex justify-center items-center">
              {player.rank === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
              {player.rank === 2 && <Medal className="w-5 h-5 text-zinc-400" />}
              {player.rank === 3 && <Medal className="w-5 h-5 text-amber-700" />}
              {player.rank > 3 && <span className="text-xs font-bold text-zinc-500">#{player.rank}</span>}
            </div>
            
            <div className="flex-1 ml-4 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                <img 
                  src={player.avatarUrl || DEFAULT_AVATAR} 
                  alt={player.username} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${player.isCurrentUser ? 'text-yellow-500' : 'text-white'}`}>
                  {player.username} {player.isCurrentUser && `(${t("You")})`}
                </span>
                {player.rank <= 3 && <span className="text-[9px] text-zinc-400 flex items-center"><Flame className="w-3 h-3 text-orange-500 mr-1" /> {t("Top Player")}</span>}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-yellow-500/20">
              <img src={PK_COIN_ICON} alt="Coins" className="w-4 h-4 object-contain drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]" />
              <span className="text-xs font-bold text-white">{player.coinsWon.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
