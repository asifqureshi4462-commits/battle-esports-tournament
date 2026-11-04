import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Tournament } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatPaise, formatDateTime, getTimeRemaining } from '../utils/formatters.ts';
import {
  Swords,
  Key,
  Copy,
  Check,
  Clock,
  Trophy,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Award,
} from 'lucide-react';

export const MyMatchesScreen: React.FC = () => {
  const { user, setSelectedTournamentId, setActiveTab } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabFilter] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchMatches = async () => {
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
    fetchMatches();
  }, []);

  const myJoinedMatches = tournaments.filter((t) =>
    user ? t.registeredParticipants.some((p) => p.userId === user.id) : false
  );

  const filteredMatches = myJoinedMatches.filter((t) => {
    if (activeTab === 'UPCOMING') return t.status === 'UPCOMING';
    if (activeTab === 'LIVE') return t.status === 'LIVE';
    if (activeTab === 'COMPLETED') return t.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return t.status === 'CANCELLED';
    return true;
  });

  const copyCreds = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto px-3.5 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-heading tracking-wide">
            My Match Schedule
          </h1>
          <p className="text-xs text-zinc-400">
            Assigned slots, private room credentials & match results
          </p>
        </div>
        <button
          onClick={fetchMatches}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
        {(['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => {
          const count = myJoinedMatches.filter((m) => m.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTabFilter(tab)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
          Checking your registered matches...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <Swords className="w-12 h-12 mx-auto text-zinc-600" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">
              No {activeTab.toLowerCase()} matches found
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              You haven't registered for any tournaments in this category yet.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('tournaments')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
          >
            Browse Active Tournaments
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredMatches.map((t) => {
            const myParticipant = t.registeredParticipants.find((p) => p.userId === user?.id);
            const slotNo = myParticipant?.slotNo || 1;
            const timeInfo = getTimeRemaining(t.matchTime);
            const myResult = t.results?.find((r) => r.userId === user?.id || r.username === user?.username);

            return (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-3.5"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.banner}
                      alt={t.title}
                      className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded bg-rose-600/30 text-rose-400 font-bold text-[9px] uppercase border border-rose-500/30">
                          {t.game}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {t.mode} • {t.map}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white font-heading">{t.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{formatDateTime(t.matchTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Slot Badge */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center shrink-0">
                    <span className="text-[9px] uppercase text-zinc-400 block font-semibold">
                      Your Slot
                    </span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      #{slotNo}
                    </span>
                  </div>
                </div>

                {/* ROOM CREDENTIALS CARD */}
                {t.status === 'UPCOMING' || t.status === 'LIVE' ? (
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase font-heading">
                        <Key className="w-3.5 h-3.5 text-rose-500" />
                        <span>Private Custom Room Credentials</span>
                      </div>
                      {t.roomDetails.released && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          UNLOCKED
                        </span>
                      )}
                    </div>

                    {t.roomDetails.released && t.roomDetails.roomId ? (
                      <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-600/30 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Room ID</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-white text-sm">
                              {t.roomDetails.roomId}
                            </span>
                            <button
                              onClick={() => copyCreds(t.roomDetails.roomId!, `room_${t.id}`)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                              title="Copy Room ID"
                            >
                              {copiedKey === `room_${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-400 block">Password</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-white text-sm">
                              {t.roomDetails.roomPassword}
                            </span>
                            <button
                              onClick={() => copyCreds(t.roomDetails.roomPassword!, `pass_${t.id}`)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                              title="Copy Password"
                            >
                              {copiedKey === `pass_${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                        <div>
                          <p className="font-semibold text-white">Room details will be announced soon.</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            The custom Room ID and Password will be unlocked here automatically once tournament officials publish them.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Match Result if Completed */}
                {t.status === 'COMPLETED' && myResult && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="font-bold text-white block">
                          Rank #{myResult.rank} ({myResult.kills} Kills)
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Official match result published
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block uppercase">Prize Earned</span>
                      <span className="font-bold text-emerald-400 text-sm font-mono">
                        {formatPaise(myResult.prizePaise)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">
                    Registered IGN: <strong className="text-zinc-200">{myParticipant?.gameIgn}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedTournamentId(t.id)}
                    className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                  >
                    Match Details <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
