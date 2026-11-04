import React, { useEffect } from 'react';
import { InAppPushAlert } from '../../types/index.ts';
import { Key, Wallet, Trophy, Bell, X, ArrowRight } from 'lucide-react';

interface InAppPushBannerProps {
  alert: InAppPushAlert | null;
  onDismiss: () => void;
  onAction: (tab: string) => void;
}

export const InAppPushBanner: React.FC<InAppPushBannerProps> = ({ alert, onDismiss, onAction }) => {
  useEffect(() => {
    if (!alert) return;
    // Auto dismiss after 7 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isRoom = alert.type === 'ROOM';
  const isWallet = alert.type === 'WALLET';
  const isMatch = alert.type === 'MATCH';

  const categoryLabel = isRoom
    ? 'ROOM CREDENTIALS'
    : isWallet
    ? 'WALLET & PAYOUT'
    : isMatch
    ? 'MATCH STARTING SOON'
    : 'ANNOUNCEMENT';

  const actionLabel = isRoom
    ? 'View Room ID'
    : isWallet
    ? 'View Wallet'
    : isMatch
    ? 'Go to Matches'
    : 'View Details';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-bounce-in pointer-events-auto">
      <div
        className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl transition-all ${
          isRoom
            ? 'bg-rose-950/90 border-rose-500/60 shadow-rose-950/80 text-rose-100'
            : isWallet
            ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-950/80 text-emerald-100'
            : isMatch
            ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-950/80 text-amber-100'
            : 'bg-zinc-900/95 border-zinc-700 shadow-zinc-950/80 text-zinc-100'
        }`}
      >
        {/* Glow Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isRoom
              ? 'from-rose-500 via-red-500 to-amber-500'
              : isWallet
              ? 'from-emerald-400 to-teal-400'
              : isMatch
              ? 'from-amber-400 via-orange-500 to-rose-500'
              : 'from-blue-500 to-purple-500'
          }`}
        />

        <div className="flex items-start gap-3">
          {/* Channel Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isRoom
                ? 'bg-rose-600 text-white'
                : isWallet
                ? 'bg-emerald-600 text-white'
                : isMatch
                ? 'bg-amber-500 text-black font-black'
                : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            {isRoom ? (
              <Key className="w-5 h-5 animate-pulse" />
            ) : isWallet ? (
              <Wallet className="w-5 h-5 animate-pulse" />
            ) : isMatch ? (
              <Trophy className="w-5 h-5 animate-pulse" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          {/* Alert Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isRoom
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isWallet
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isMatch
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                🔔 {categoryLabel}
              </span>
              <span className="text-[10px] text-zinc-400">Just Now</span>
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white leading-tight font-heading">
              {alert.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-zinc-200 mt-1 leading-snack line-clamp-2">
              {alert.message}
            </p>

            {/* Quick Action Button */}
            {alert.linkTab && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAction(alert.linkTab!);
                    onDismiss();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                    isRoom
                      ? 'bg-white text-rose-950 hover:bg-rose-50'
                      : isWallet
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                      : isMatch
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-zinc-200 text-black'
                  }`}
                >
                  <span>{actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 cursor-pointer transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
