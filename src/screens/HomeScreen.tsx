import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Tournament, Announcement } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatPaise, getTimeRemaining } from '../utils/formatters.ts';
import {
  Trophy,
  Flame,
  Swords,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Clock,
  Sparkles,
  LifeBuoy,
  Volume2,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    user,
    setActiveTab,
    setOpenAddCashModal,
    setOpenWithdrawModal,
    setOpenSupportModal,
    setSelectedTournamentId,
  } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tourRes, ancRes] = await Promise.all([
          api.getTournaments(),
          api.getAnnouncements(),
        ]);
        setTournaments(tourRes.tournaments);
        setAnnouncements(ancRes.announcements);
        setNotice(ancRes.notice);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const featuredTournament = tournaments.find((t) => t.status === 'UPCOMING') || tournaments[0];
  const upcomingTournaments = tournaments.filter((t) => t.status === 'UPCOMING').slice(0, 4);
  const completedMatches = tournaments.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto px-3.5 pt-2">
      {/* Live Announcement Marquee */}
      {notice && (
        <div className="bg-rose-950/40 border border-rose-600/30 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden text-xs">
          <Volume2 className="w-4 h-4 text-rose-500 shrink-0" />
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none text-rose-200 font-medium tracking-wide">
            {notice}
          </div>
        </div>
      )}

      {/* Hero Featured Tournament Card */}
      {featuredTournament && (
        <div
          onClick={() => setSelectedTournamentId(featuredTournament.id)}
          className="relative rounded-2xl overflow-hidden border border-rose-900/40 cursor-pointer group shadow-2xl bg-zinc-900"
        >
          <div className="relative h-48 sm:h-60 w-full overflow-hidden">
            <img
              src={featuredTournament.banner}
              alt={featuredTournament.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/60 to-transparent" />

            {/* Featured Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-rose-900/40 clip-badge">
                <Flame className="w-3.5 h-3.5" /> Featured Battle
              </span>
              <span className="px-2 py-0.5 rounded-md bg-black/60 text-zinc-300 text-[10px] font-semibold border border-white/10 backdrop-blur-sm">
                {featuredTournament.game}
              </span>
            </div>

            {/* Match info bottom overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-2xl font-bold text-white font-heading leading-tight drop-shadow-md">
                  {featuredTournament.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span>{featuredTournament.mode}</span>
                  <span>•</span>
                  <span>{featuredTournament.map}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-medium">
                    {getTimeRemaining(featuredTournament.matchTime).text}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase text-zinc-400 font-semibold block">
                  Prize Pool
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-heading">
                  {formatPaise(featuredTournament.prizePoolPaise)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats footer on card */}
          <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-zinc-400">
                <Users className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {featuredTournament.registeredParticipants.length} / {featuredTournament.totalSlots} Slots
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Entry: {featuredTournament.entryFeePaise === 0 ? 'FREE' : formatPaise(featuredTournament.entryFeePaise)}</span>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1">
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Buttons Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-center">
        <button
          onClick={() => setActiveTab('tournaments')}
          className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-rose-500/40 flex flex-col items-center justify-center gap-1.5 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-zinc-200">Tournaments</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/40 flex flex-col items-center justify-center gap-1.5 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Swords className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-zinc-200">My Matches</span>
        </button>

        <button
          onClick={() => setOpenAddCashModal(true)}
          className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 flex flex-col items-center justify-center gap-1.5 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-zinc-200">Add Cash</span>
        </button>

        <button
          onClick={() => setOpenWithdrawModal(true)}
          className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/40 flex flex-col items-center justify-center gap-1.5 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-zinc-200">Withdraw</span>
        </button>

        <button
          onClick={() => setOpenSupportModal(true)}
          className="hidden sm:flex p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-purple-500/40 flex-col items-center justify-center gap-1.5 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-zinc-200">Support</span>
        </button>
      </div>

      {/* Upcoming Tournaments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <h3 className="text-base font-bold text-white font-heading">
              Live & Upcoming Battles
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('tournaments')}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            See All ({tournaments.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {upcomingTournaments.map((t) => {
            const slotsLeft = t.totalSlots - t.registeredParticipants.length;
            const progress = (t.registeredParticipants.length / t.totalSlots) * 100;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className="p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={t.banner}
                    alt={t.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-zinc-800 group-hover:border-rose-500/30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600/30 text-rose-400 border border-rose-500/30 uppercase">
                        {t.game}
                      </span>
                      <span className="text-[10px] text-zinc-400">{t.mode}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate font-heading group-hover:text-rose-400 transition-colors">
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                      <span>{t.map}</span>
                      <span>•</span>
                      <span className="text-amber-400">{getTimeRemaining(t.matchTime).text}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and prizes */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">
                      {t.registeredParticipants.length} / {t.totalSlots} joined
                    </span>
                    <span className="text-rose-400 font-medium">{slotsLeft} left</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-600 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Prize</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatPaise(t.prizePoolPaise)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block uppercase">Entry</span>
                    <span className="font-bold text-white font-mono">
                      {t.entryFeePaise === 0 ? 'FREE' : formatPaise(t.entryFeePaise)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hall of Champions (Completed Matches Results) */}
      {completedMatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                Recent Tournament Champions
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              100% Paid Out
            </span>
          </div>

          <div className="space-y-2">
            {completedMatches.map((cm) => (
              <div
                key={cm.id}
                onClick={() => setSelectedTournamentId(cm.id)}
                className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-white">{cm.title}</h4>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Winner:{' '}
                    <strong className="text-amber-400">
                      {cm.results?.[0]?.username || 'Champion Player'}
                    </strong>{' '}
                    (Prize: {formatPaise(cm.results?.[0]?.prizePaise || 0)})
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]">
                  View Brackets →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust & Fair Play Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center pt-2">
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col items-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400 mb-1" />
          <h4 className="text-xs font-bold text-white">Anti-Cheat Certified</h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">Strict bans on emulators and hack tools</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col items-center">
          <Zap className="w-6 h-6 text-amber-400 mb-1" />
          <h4 className="text-xs font-bold text-white">Instant UPI Withdrawals</h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">Direct into your verified UPI ID in minutes</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col items-center">
          <Users className="w-6 h-6 text-rose-500 mb-1" />
          <h4 className="text-xs font-bold text-white">24/7 Battle Support</h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">Dedicated admins for custom rooms</p>
        </div>
      </div>
    </div>
  );
};
