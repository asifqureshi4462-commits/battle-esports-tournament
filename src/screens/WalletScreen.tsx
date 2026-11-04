import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { WalletTransaction, DepositOrder, WithdrawalRequest } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatPaise, formatDateTime } from '../utils/formatters.ts';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCw,
  Trophy,
  History,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const WalletScreen: React.FC = () => {
  const { user, refreshUser, setOpenAddCashModal, setOpenWithdrawModal } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await api.getWalletSummary();
      setTransactions(res.transactions);
      setDeposits(res.deposits);
      setWithdrawals(res.withdrawals);
      await refreshUser();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'DEPOSIT') return t.type === 'DEPOSIT';
    if (filterType === 'WITHDRAWAL') return t.type === 'WITHDRAWAL';
    if (filterType === 'ENTRY_FEE') return t.type === 'ENTRY_FEE';
    if (filterType === 'PRIZE') return t.type === 'PRIZE' || t.type === 'REFUND';
    return true;
  });

  const [mainTab, setMainTab] = useState<'ledger' | 'withdrawals' | 'deposits'>('ledger');
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('ALL');

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'ALL') return true;
    return w.status === withdrawalFilter;
  });

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto px-3.5 pt-2">
      {/* Screen Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-heading tracking-wide">
            Gamer Wallet & Payouts
          </h1>
          <p className="text-xs text-zinc-400">
            Real-money tournament balance, payouts, and cryptographically audited ledger
          </p>
        </div>
        <button
          onClick={fetchWallet}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Balance Card (Cyberpunk Gold/Emerald Theme) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-750 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-400 tracking-wider font-semibold block">
                Total Available Cash
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
                {formatPaise(user?.walletBalancePaise || 0)}
              </span>
            </div>
          </div>

          {/* Bonus Coins */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right">
            <div className="flex items-center gap-1 justify-end text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span className="text-xs font-bold font-mono">{user?.coins || 0}</span>
            </div>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Bonus Battle Coins</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setOpenAddCashModal(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-transform active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" /> Add Cash (UPI)
          </button>

          <button
            onClick={() => setOpenWithdrawModal(true)}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white border border-zinc-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" /> Withdraw
          </button>
        </div>
      </div>

      {/* Main Tabs: Ledger vs Withdrawal History vs Deposit Orders */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setMainTab('ledger')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            mainTab === 'ledger'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="w-3.5 h-3.5 text-rose-500" />
          <span>Ledger ({transactions.length})</span>
        </button>

        <button
          onClick={() => setMainTab('withdrawals')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            mainTab === 'withdrawals'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          <span>Withdrawal History ({withdrawals.length})</span>
        </button>

        <button
          onClick={() => setMainTab('deposits')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
            mainTab === 'deposits'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Deposit Requests ({deposits.length})</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTION LEDGER */}
      {mainTab === 'ledger' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Auditable Transaction Ledger
            </h3>
            <span className="text-[11px] text-zinc-500">
              {filteredTransactions.length} records
            </span>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DEPOSIT', label: 'Deposits' },
              { id: 'WITHDRAWAL', label: 'Withdrawals' },
              { id: 'ENTRY_FEE', label: 'Tournament Fees' },
              { id: 'PRIZE', label: 'Prizes & Refunds' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all border shrink-0 ${
                  filterType === f.id
                    ? 'bg-zinc-800 text-white border-zinc-700 font-bold'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ledger List */}
          {loading ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
              Loading transaction ledger...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 p-4 rounded-xl bg-zinc-900/40 border border-zinc-850">
              No transactions found for the selected filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.amountPaise > 0;
                const isEntry = tx.type === 'ENTRY_FEE';
                const isPrize = tx.type === 'PRIZE';
                const isDeposit = tx.type === 'DEPOSIT';
                const isWithdraw = tx.type === 'WITHDRAWAL';
                const isRefund = tx.type === 'REFUND';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {isPrize ? (
                          <Trophy className="w-4 h-4 text-amber-400" />
                        ) : isDeposit ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        ) : isWithdraw ? (
                          <ArrowUpRight className="w-4 h-4 text-amber-400" />
                        ) : isRefund ? (
                          <RefreshCw className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Coins className="w-4 h-4 text-rose-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{tx.description}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              tx.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : tx.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 font-mono">
                          <span>ID: {tx.id}</span>
                          <span>•</span>
                          <span>{formatDateTime(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-extrabold font-mono ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {formatPaise(tx.amountPaise)}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-mono">
                        Bal: {formatPaise(tx.balanceAfterPaise)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WITHDRAWAL REQUESTS & PAYOUT HISTORY */}
      {mainTab === 'withdrawals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Withdrawal Requests & Payout Status
              </h3>
              <p className="text-[10px] text-zinc-400">
                Track status across Pending, Processing, Successful payout, and Refunded
              </p>
            </div>
            <button
              onClick={() => setOpenWithdrawModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Withdrawal
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['ALL', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setWithdrawalFilter(st)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap text-xs transition border ${
                  withdrawalFilter === st
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
              Loading withdrawals...
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 p-4 rounded-xl bg-zinc-900/40 border border-zinc-850">
              No withdrawal requests found in {withdrawalFilter} status.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((w) => {
                const isPending = w.status === 'PENDING';
                const isProcessing = w.status === 'PROCESSING';
                const isSuccess = w.status === 'SUCCESSFUL';
                const isRejected = w.status === 'REJECTED';

                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isProcessing
                              ? 'bg-blue-500/20 text-blue-400'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isProcessing ? (
                            <Clock className="w-4 h-4" />
                          ) : isPending ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {formatPaise(w.amountPaise)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isSuccess
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isProcessing
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : isPending
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isPending
                                ? 'PENDING REVIEW'
                                : isProcessing
                                ? 'PROCESSING PAYOUT'
                                : isSuccess
                                ? 'PAYOUT SUCCESSFUL'
                                : 'REJECTED & REFUNDED'}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                            ID: {w.id} • {formatDateTime(w.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Destination UPI:</span>
                        <span className="font-mono text-emerald-400 font-bold text-xs">
                          {w.payoutUpiId || w.upiId}
                        </span>
                      </div>
                    </div>

                    {/* Status Details Box */}
                    {isSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Bank / Payout Reference (UTR):</span>
                          <span className="font-mono text-white font-bold">{w.referenceNo || 'N/A'}</span>
                        </div>
                        {w.adminNotes && (
                          <div className="text-[10px] text-emerald-400/80">
                            Note: {w.adminNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300">
                        <span className="font-semibold">Current State: </span>
                        <span>Your payout request is currently processing with the banking network.</span>
                        {w.adminNotes && (
                          <p className="text-[10px] text-blue-400/80 mt-1">Admin note: {w.adminNotes}</p>
                        )}
                      </div>
                    )}

                    {isRejected && (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300 space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejection Reason:</span>
                        </div>
                        <p className="text-[11px] text-white pl-4.5">{w.adminNotes || 'Declined by administration'}</p>
                        <p className="text-[10px] text-emerald-400 pl-4.5 font-semibold">
                          ✓ {formatPaise(w.amountPaise)} was automatically refunded back to your wallet.
                        </p>
                      </div>
                    )}

                    {isPending && (
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-850 text-[10px] text-zinc-400">
                        Request submitted and queued for verification. Payout will be processed to <span className="text-zinc-200 font-mono font-semibold">{w.payoutUpiId || w.upiId}</span>.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPOSIT REQUESTS */}
      {mainTab === 'deposits' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Deposit Requests & Verification Status
              </h3>
              <p className="text-[10px] text-zinc-400">
                Track your Add Cash orders, submitted UTRs, and credit confirmations
              </p>
            </div>
            <button
              onClick={() => setOpenAddCashModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Cash
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
              Loading deposits...
            </div>
          ) : deposits.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 p-4 rounded-xl bg-zinc-900/40 border border-zinc-850">
              No deposit orders registered yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {deposits.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        d.status === 'SUCCESSFUL'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : d.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {d.status === 'SUCCESSFUL' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm font-mono">
                          {formatPaise(d.amountPaise)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            d.status === 'SUCCESSFUL'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : d.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        <span>Order #{d.id}</span>
                        {d.utr && <span className="ml-2 text-zinc-400">UTR: {d.utr}</span>}
                        <span className="ml-2">• {formatDateTime(d.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                      Method
                    </span>
                    <span className="text-xs text-zinc-200 font-bold">
                      {d.paymentMethod || 'UPI QR'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
