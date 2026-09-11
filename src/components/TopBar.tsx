import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR } from '../lib/assets';

export function TopBar({ showBack = false }: { showBack?: boolean }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  const user = currentUser || {
    username: 'Gamer',
    avatarUrl: DEFAULT_AVATAR
  };

  return (
    <div className="flex items-center justify-between p-4 pb-2 z-50 relative bg-zinc-950">
      <div className="flex items-center space-x-3">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="text-zinc-400 p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}
        
        <div className="w-10 h-10 rounded-2xl border-2 border-yellow-500/40 overflow-hidden p-0.5 shadow-[0_0_15px_rgba(234,179,8,0.2)] bg-black/50">
          <img src={PK_LOGO_IMAGE} alt="PK ARENA PUBG" className="w-full h-full rounded-xl object-cover" />
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-zinc-400">Welcome back,</span>
          <span className="text-sm text-white font-bold tracking-tight">{user.username}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 shadow-[0_0_10px_rgba(234,179,8,0.15)]">
          <img src={PK_COIN_ICON} alt="Coins" className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
          <span className="text-xs font-black text-yellow-500 tracking-tight">{currentUser?.walletBalance || 0}</span>
        </div>
      </div>
    </div>
  );
}
