import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatPaise } from '../utils/formatters.ts';
import { Bell, Plus, Shield, Wallet, LogOut } from 'lucide-react';
import { NotificationDrawer } from './modals/NotificationDrawer.tsx';

export const Navbar: React.FC = () => {
  const {
    user,
    logout,
    setOpenAddCashModal,
    unreadNotificationsCount,
    activeTab,
    setActiveTab,
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0a0b12]/95 backdrop-blur-md border-b border-rose-950/40 px-3.5 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* App Branding */}
          <div
            onClick={() => setActiveTab(user?.role === 'admin' ? 'admin' : 'home')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-rose-950/50 border border-rose-500/40 group-hover:scale-110 transition-transform">
              <img
                src="/assets/aistudio/file_000000002f448211a4cad723873e084a_76d4f186.png"
                alt="Logo"
                className="w-full h-full object-cover scale-125"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading text-lg font-bold tracking-wider text-rose-500">BATTLE</span>
                <span className="font-heading text-lg font-bold tracking-wider text-white">ESPORTS</span>
              </div>
              <span className="text-[9px] font-semibold tracking-widest text-zinc-400 uppercase">
                {user?.role === 'admin' ? 'Admin Portal' : 'Official Tournament App'}
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2">
            {/* Admin Panel Link for Authorized Administrators */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-zinc-900/90 text-amber-400 border-amber-500/30 hover:border-amber-400'
                }`}
                title="Go to Admin Panel"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* Wallet Balance Pill */}
            {user && (
              <div
                onClick={() => setOpenAddCashModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-zinc-900 to-zinc-900/90 hover:from-zinc-800 hover:to-zinc-850 px-2.5 py-1.5 rounded-full border border-zinc-750 hover:border-rose-500/50 cursor-pointer transition-all shadow-inner group"
                title="Click to Add Cash"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-3 h-3" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-zinc-400 leading-none">Wallet</span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {formatPaise(user.walletBalancePaise)}
                  </span>
                </div>
                <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center group-hover:rotate-90 transition-transform">
                  <Plus className="w-2.5 h-2.5" />
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Logout shortcut */}
            {user && (
              <button
                onClick={() => {
                  if (confirm(`Log out of account ${user.username}? Your balance and records will be preserved.`)) {
                    logout();
                  }
                }}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/50 transition-colors cursor-pointer"
                title={`Log out from ${user.username}`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Admin Quick Indicator */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`sm:hidden p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-zinc-900 text-amber-400 border-amber-500/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};
