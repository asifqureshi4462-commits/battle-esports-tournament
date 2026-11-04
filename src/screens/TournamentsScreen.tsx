import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Tournament, GameType, TournamentStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatPaise, formatDateTime, getTimeRemaining } from '../utils/formatters.ts';
import {
  Trophy,
  Search,
  Filter,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Gamepad2,
  RefreshCw,
} from 'lucide-react';

export const TournamentsScreen: React.FC = () => {
  const { user, setSelectedTournamentId } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGame, setSelectedGame] = useState<string>('ALL');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'MY_JOINED'>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const games: { label: string; value: string }[] = [
    { label: 'All Games', value: 'ALL' },
    { label: 'BGMI', value: 'BGMI' },
    { label: 'Free Fire MAX', value: 'FREE FIRE MAX' },
    { label: 'BGMI TDM', value: 'BGMI TDM' },
    { label: 'COD Mobile', value: 'CALL OF DUTY' },
  ];

  const statusTabs: { label: string; value: 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'MY_JOINED' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Upcoming', value: 'UPCOMING' },
    { label: 'Live', value: 'LIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'My Joined', value: 'MY_JOINED' },
  ];

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getTournaments();
      setTournaments(res.tournaments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Filter pipeline
  const filtered = tournaments.filter((t) => {
    // Game filter
    if (selectedGame !== 'ALL' && t.game !== selectedGame) return false;

    // Status tab filter
    if (selectedStatusTab === 'MY_JOINED') {
      if (!user) return false;
      const isJoined = t.registeredParticipants.some((p) => p.userId === user.id);
      if (!isJoined) return false;
    } else if (selectedStatusTab !== 'ALL') {
      if (t.status !== selectedStatusTab) return false;
    }

    // Mode filter
    if (selectedMode !== 'ALL' && t.mode !== selectedMode) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchMap = t.map.toLowerCase().includes(q);
      const matchGame = t.game.toLowerCase().includes(q);
      if (!matchTitle && !matchMap && !matchGame) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto px-3.5 pt-2">
      {/* Title & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-heading tracking-wide">
            Tournaments Hub
          </h1>
          <p className="text-xs text-zinc-400">
            Battle for guaranteed cash prizes, solo & squad matches
          </p>
        </div>
        <button
          onClick={fetchTournaments}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Game selector chips (Horizontal scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {games.map((g) => (
          <button
            key={g.value}
            onClick={() => setSelectedGame(g.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
              selectedGame === g.value
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30'
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Status tabs & Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-zinc-800/80 pb-1 scrollbar-none">
          <div className="flex items-center gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStatusTab(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
                  selectedStatusTab === tab.value
                    ? 'text-rose-500 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {selectedStatusTab === tab.value && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Mode dropdown filter */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none shrink-0"
          >
            <option value="ALL">All Modes</option>
            <option value="Solo">Solo</option>
            <option value="Duo">Duo</option>
            <option value="Squad">Squad</option>
            <option value="1v1 TDM">1v1 TDM</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tournament name, map (Erangel, Bermuda)..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-rose-500 rounded-xl text-white text-xs placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-24 text-center text-zinc-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
          Loading tournaments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 space-y-2">
          <Gamepad2 className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-semibold">No tournaments match your current filters</p>
          <button
            onClick={() => {
              setSelectedGame('ALL');
              setSelectedStatusTab('ALL');
              setSelectedMode('ALL');
              setSearchQuery('');
            }}
            className="text-xs text-rose-500 hover:underline font-bold"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((t) => {
            const isRegistered = user
              ? t.registeredParticipants.some((p) => p.userId === user.id)
              : false;
            const slotsLeft = t.totalSlots - t.registeredParticipants.length;
            const progress = (t.registeredParticipants.length / t.totalSlots) * 100;
            const timeInfo = getTimeRemaining(t.matchTime);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between group ${
                  isRegistered
                    ? 'bg-rose-950/20 border-rose-600/50 hover:border-rose-500'
                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Banner & status top */}
                <div className="relative h-36 w-full overflow-hidden bg-zinc-950">
                  <img
                    src={t.banner}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                  {/* Badges on top of card */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-600 font-bold text-[9px] text-white uppercase tracking-wider">
                        {t.game}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-zinc-300 text-[9px] font-semibold">
                        {t.mode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRegistered && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black font-bold text-[9px] uppercase tracking-wider shadow">
                          Joined
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          t.status === 'LIVE'
                            ? 'bg-red-600 text-white animate-pulse'
                            : t.status === 'COMPLETED'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-900/80 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <h3 className="text-sm font-bold text-white font-heading truncate drop-shadow">
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-300 mt-0.5">
                      <span>Map: {t.map}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">{formatDateTime(t.matchTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="p-3.5 space-y-3">
                  {/* Prize vs Entry info */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">
                        Prize Pool
                      </span>
                      <span className="font-extrabold text-emerald-400 font-heading text-sm">
                        {formatPaise(t.prizePoolPaise)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">
                        Entry Fee
                      </span>
                      <span className="font-extrabold text-white font-heading text-sm">
                        {t.entryFeePaise === 0 ? 'FREE' : formatPaise(t.entryFeePaise)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">
                        Per Kill
                      </span>
                      <span className="font-extrabold text-amber-400 font-heading text-sm">
                        {formatPaise(t.prizeBreakdown.perKill)}
                      </span>
                    </div>
                  </div>

                  {/* Slot progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">
                        {t.registeredParticipants.length} / {t.totalSlots} Slots
                      </span>
                      <span className="text-rose-400 font-medium">
                        {slotsLeft <= 0 ? 'FULL' : `${slotsLeft} remaining`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{timeInfo.text}</span>
                    </div>

                    <button className="px-3 py-1.5 rounded-lg bg-rose-600 group-hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors">
                      {isRegistered ? 'View Room Details' : 'View Tournament'} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
