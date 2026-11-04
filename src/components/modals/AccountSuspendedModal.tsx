import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ShieldAlert, LifeBuoy, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters.ts';

export const AccountSuspendedModal: React.FC = () => {
  const { bannedInfo, setBannedInfo, logout, setOpenSupportModal } = useAuth();

  if (!bannedInfo || !bannedInfo.isBanned) return null;

  const isTemporary = bannedInfo.banType === 'TEMPORARY' || bannedInfo.status === 'TEMPORARILY_BANNED';
  const reasonText = bannedInfo.reason || 'Violation of platform fair play and tournament guidelines';

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e1017] border border-rose-600/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl shadow-rose-950/60 relative overflow-hidden text-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-lg shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 ${
              isTemporary
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isTemporary ? <Clock className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {isTemporary ? 'Temporarily Banned' : 'Permanently Banned'}
          </span>
          <h2 className="text-xl font-black text-white font-heading tracking-wide">
            Your Account Has Been Suspended
          </h2>
        </div>

        {/* User Required Message */}
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-left space-y-2">
          <p className="text-xs text-rose-200 leading-relaxed font-medium">
            “Your account has been suspended. Reason:{' '}
            <strong className="text-white font-bold">{reasonText}</strong>. Contact Support if you believe this is a mistake.”
          </p>

          {isTemporary && bannedInfo.expiresAt && (
            <div className="pt-2 border-t border-rose-800/30 text-[11px] text-amber-300/90 flex items-center justify-between">
              <span>Suspension Expires:</span>
              <span className="font-mono font-bold text-white">
                {formatDateTime(bannedInfo.expiresAt)}
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Access to protected tournament participation, wallet deposits, and withdrawals is currently restricted. Your account data and wallet balance are safely preserved.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setBannedInfo(null);
              logout();
            }}
            className="w-full sm:flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpenSupportModal(true);
            }}
            className="w-full sm:flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 transition"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
};
