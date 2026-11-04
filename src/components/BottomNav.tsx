import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Home, Trophy, Swords, Wallet, User, Shield } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'matches', label: 'My Matches', icon: Swords },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0a0b12]/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-flow-col auto-cols-fr gap-1 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isAdmin = item.id === 'admin';

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? isAdmin
                    ? 'text-amber-400 font-bold'
                    : 'text-rose-500 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <span
                  className={`absolute -top-1.5 w-6 h-0.5 rounded-full ${
                    isAdmin ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  }`}
                />
              )}
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? (isAdmin ? 'bg-amber-500/10 scale-110' : 'bg-rose-500/10 scale-110') : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isAdmin && !isActive ? 'text-amber-500/70' : ''}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
