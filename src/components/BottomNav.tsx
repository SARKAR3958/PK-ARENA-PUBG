import { Home, Trophy, Wallet, User, BarChart2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'home', icon: Home, label: 'HOME', path: '/home' },
  { id: 'tournaments', icon: Trophy, label: 'MATCHES', path: '/tournaments' },
  { id: 'leaderboard', icon: BarChart2, label: 'RANKS', path: '/leaderboard' },
  { id: 'wallet', icon: Wallet, label: 'WALLET', path: '/wallet' },
  { id: 'profile', icon: User, label: 'PROFILE', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, requirePinAuth } = useApp();

  const handleNavigate = async (path: string) => {
    if (path === '/wallet') {
      const success = await requirePinAuth();
      if (!success) return;
    }
    navigate(path);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-pk-card border-t border-pk-border flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/home');
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.path)}
            className={clsx(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-pk-yellow" : "text-zinc-500 hover:text-zinc-400"
            )}
          >
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-semibold tracking-wider">{t(item.label)}</span>
          </button>
        );
      })}
    </div>
  );
}
