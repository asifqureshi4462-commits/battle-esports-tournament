import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { formatPaise } from '../../utils/formatters.ts';
import { X, Send, AlertTriangle, ShieldCheck, RefreshCw, Wallet, Clock } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [amountRupees, setAmountRupees] = useState<number>(100);
  const [upiId, setUpiId] = useState<string>(user?.upiId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableBalancePaise = user?.walletBalancePaise || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!upiId || !upiId.includes('@')) {
      setError('Please provide a valid UPI ID (e.g., yourname@oksbi or 9876543210@paytm)');
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise < 10000 || amountPaise > 1000000) {
      setError('Withdrawal amount must be between ₹100 and ₹10,000 per request');
      return;
    }

    if (amountPaise > availableBalancePaise) {
      setError(`Insufficient available funds. Your balance is ${formatPaise(availableBalancePaise)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.requestWithdrawal({
        amountPaise,
        payoutUpiId: upiId.trim(),
      });
      setSuccess(
        `Withdrawal of ${formatPaise(amountPaise)} submitted! Request ID: ${res.withdrawal.id}. Amount has been reserved.`
      );
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Withdrawal request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Withdraw Winnings</h2>
              <p className="text-[11px] text-zinc-400">Direct transfer to your verified UPI ID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Available balance card */}
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-zinc-400">Available Wallet Balance</div>
            <div className="text-base font-bold text-emerald-400">
              {formatPaise(availableBalancePaise)}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/60 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-bold">Request Submitted</p>
                <p className="mt-0.5">{success}</p>
              </div>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Withdrawal Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                min={100}
                max={10000}
                value={amountRupees || ''}
                onChange={(e) => setAmountRupees(Number(e.target.value))}
                placeholder="Min ₹100, Max ₹10,000"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-white text-base font-bold focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
              <span>Min ₹100</span>
              <button
                type="button"
                onClick={() => setAmountRupees(Math.floor(availableBalancePaise / 100))}
                className="text-amber-400 hover:underline font-semibold"
              >
                Withdraw Max ({formatPaise(availableBalancePaise)})
              </button>
            </div>
          </div>

          {/* UPI ID input */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Payout UPI ID
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. mobile@paytm or name@oksbi"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-white text-sm focus:outline-none"
              required
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Ensure this UPI ID is active and belongs to you. Payouts are non-reversible once sent.
            </span>
          </div>

          {/* Policy notes */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Processing Timeline</span>
            </div>
            <p>
              Standard withdrawals are processed within 15 to 30 minutes. If declined for incorrect UPI format or fair-play review, reserved funds are automatically refunded to your wallet.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || amountRupees < 100 || amountRupees * 100 > availableBalancePaise}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Request...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Request Payout for ₹{amountRupees || 0}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
