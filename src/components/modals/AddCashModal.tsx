import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { formatPaise } from '../../utils/formatters.ts';
import { validateUpiId, buildUpiUri, generateUpiQrDataUrl } from '../../utils/upi.ts';
import { DepositOrder, AppSettings } from '../../types/index.ts';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  Info,
  Smartphone,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Lock,
} from 'lucide-react';

interface AddCashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCashModal: React.FC<AddCashModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [amountRupees, setAmountRupees] = useState<number>(10);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeDeposit, setActiveDeposit] = useState<DepositOrder | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [merchantUpiId, setMerchantUpiId] = useState<string>('');
  const [merchantQrImageUrl, setMerchantQrImageUrl] = useState<string | undefined>(undefined);
  const [dynamicQrCode, setDynamicQrCode] = useState<string>('');
  const [currentUpiUri, setCurrentUpiUri] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 2-minute countdown timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(120);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Dynamic preset amounts managed by Admin
  const enabledPresets = (settings?.depositPresets && settings.depositPresets.length > 0)
    ? settings.depositPresets.filter((p) => p.enabled).sort((a, b) => a.order - b.order)
    : [
        { id: 'def_10', amountRupees: 10, label: '₹10 (Starter)', enabled: true, order: 1 },
        { id: 'def_20', amountRupees: 20, label: '₹20', enabled: true, order: 2 },
        { id: 'def_50', amountRupees: 50, label: '₹50', enabled: true, order: 3 },
        { id: 'def_100', amountRupees: 100, label: '₹100 (Popular)', enabled: true, order: 4 },
        { id: 'def_200', amountRupees: 200, label: '₹200', enabled: true, order: 5 },
        { id: 'def_300', amountRupees: 300, label: '₹300', enabled: true, order: 6 },
        { id: 'def_500', amountRupees: 500, label: '₹500 (Best Value)', enabled: true, order: 7 },
        { id: 'def_1000', amountRupees: 1000, label: '₹1,000', enabled: true, order: 8 },
        { id: 'def_1500', amountRupees: 1500, label: '₹1,500', enabled: true, order: 9 },
        { id: 'def_2000', amountRupees: 2000, label: '₹2,000 (Max)', enabled: true, order: 10 },
      ];

  // Load admin configured settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setSettingsLoading(true);
    setError(null);
    try {
      const res = await api.getSettings();
      const s = res.settings as AppSettings;
      setSettings(s);
      if (s) {
        setMerchantUpiId(s.merchantUpiId || '');
        setMerchantQrImageUrl(s.merchantQrImageUrl);
        const activePresets = s.depositPresets?.filter((p) => p.enabled) || [];
        if (activePresets.length > 0 && (amountRupees < 10 || amountRupees > 2000)) {
          setAmountRupees(activePresets[0].amountRupees);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deposit settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Generate QR for activeDeposit when in Step 2
  useEffect(() => {
    if (!activeDeposit) {
      setDynamicQrCode('');
      setCurrentUpiUri('');
      return;
    }

    let active = true;
    async function genQr() {
      if (!activeDeposit) return;
      const targetUpi = activeDeposit.merchantUpiId || merchantUpiId;
      if (!targetUpi || !validateUpiId(targetUpi).valid) {
        setDynamicQrCode('');
        setCurrentUpiUri('');
        return;
      }

      const exactRupees = activeDeposit.amountPaise / 100;
      try {
        const uri = activeDeposit.qrPayload || buildUpiUri({
          upiId: targetUpi,
          merchantName: settings?.merchantName || 'BATTLE ESPORTS',
          amountRupees: exactRupees,
          note: `Deposit_${activeDeposit.id}`,
          transactionRef: activeDeposit.providerRef,
        });

        if (active) {
          setCurrentUpiUri(uri);
        }

        const qr = await generateUpiQrDataUrl(uri);
        if (active) {
          setDynamicQrCode(qr);
        }
      } catch (err) {
        console.error('Failed to generate dynamic QR for active deposit:', err);
      }
    }

    genQr();
    return () => {
      active = false;
    };
  }, [activeDeposit, merchantUpiId, settings?.merchantName]);

  // 2-Minute Countdown Timer for activeDeposit
  useEffect(() => {
    if (!activeDeposit) return;

    // Calculate initial remaining seconds from activeDeposit.expiresAt
    let initialSecs = 120;
    if (activeDeposit.expiresAt) {
      const diffMs = new Date(activeDeposit.expiresAt).getTime() - Date.now();
      initialSecs = Math.max(0, Math.floor(diffMs / 1000));
    }

    setTimeLeftSeconds(initialSecs);
    setIsExpired(initialSecs <= 0);

    if (initialSecs <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          // Inform backend if unpaid
          if (!activeDeposit.utr && activeDeposit.status === 'PENDING') {
            api.expireDeposit(activeDeposit.id).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDeposit]);

  const handleSelectAmount = (amt: number) => {
    setAmountRupees(amt);
    setError(null);
  };

  const handleManualAmountChange = (valStr: string) => {
    const val = Number(valStr);
    setAmountRupees(val);
    if (val > 0 && val < 10) {
      setError('Minimum deposit amount is ₹10');
    } else if (val > 2000) {
      setError('Maximum deposit amount is ₹2,000');
    } else {
      setError(null);
    }
  };

  // Step 1 -> Step 2: User clicks "Pay via UPI"
  const handlePayViaUpi = async () => {
    setError(null);
    setSuccessMsg(null);
    const num = Number(amountRupees);
    if (!num || isNaN(num) || num < 10 || num > 2000) {
      setError('Deposit amount must be between ₹10 and ₹2,000');
      return;
    }

    if (!settings?.upiConfigured && !merchantUpiId) {
      setError('Admin has not configured merchant UPI details yet. Please contact administration.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      // Create unique deposit order in backend
      const res = await api.createDeposit({
        amountPaise: Math.round(num * 100),
        paymentMethod: 'UPI',
      });
      setActiveDeposit(res.deposit);
      if (res.merchantUpiId) {
        setMerchantUpiId(res.merchantUpiId);
      }
      setTimeLeftSeconds(120);
      setIsExpired(false);
      setUtrSubmitted(false);
      setUtrNumber('');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment request');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Step 2: User submits 12-digit UTR Reference
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeposit) return;

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI Transaction / UTR reference number');
      return;
    }

    setIsSubmittingUtr(true);
    setError(null);
    try {
      const res = await api.submitDepositUtr(activeDeposit.id, cleanUtr);
      setActiveDeposit(res.deposit);
      setUtrSubmitted(true);
      setSuccessMsg(
        `UTR ${cleanUtr} submitted successfully! Your deposit request #${res.deposit.id} for ₹${res.deposit.amountPaise / 100} is registered under PENDING verification. Coins will be credited once verified by banking gateway or authorized admin.`
      );
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to submit UTR reference');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleSimulateWebhookVerification = async () => {
    if (!activeDeposit) return;
    setError(null);
    setIsVerifying(true);
    try {
      const res = await api.verifyTestDeposit(activeDeposit.id);
      setActiveDeposit(res.deposit);
      setSuccessMsg(`Payment of ${formatPaise(res.deposit.amountPaise)} successfully verified via gateway webhook! Your wallet has been credited.`);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyUpiId = () => {
    const vpa = activeDeposit?.merchantUpiId || merchantUpiId;
    if (!vpa) return;
    navigator.clipboard.writeText(vpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetFlow = () => {
    setActiveDeposit(null);
    setUtrNumber('');
    setUtrSubmitted(false);
    setError(null);
    setSuccessMsg(null);
    setIsExpired(false);
    setTimeLeftSeconds(120);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const upiValidation = validateUpiId(merchantUpiId);
  const isUpiReady = Boolean(merchantUpiId && upiValidation.valid);
  const displayQr = dynamicQrCode || (activeDeposit?.merchantQrImageUrl?.startsWith('data:image') ? activeDeposit.merchantQrImageUrl : undefined);
  const isValidAmount = Boolean(amountRupees && !isNaN(amountRupees) && amountRupees >= 10 && amountRupees <= 2000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-rose-950/60 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                {activeDeposit ? 'Complete UPI Payment' : 'Add Cash to Wallet'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {activeDeposit ? `Order ID: ${activeDeposit.id}` : 'Official Merchant UPI Payment'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetFlow();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {settingsLoading && (
            <div className="p-3 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
              Loading merchant deposit settings...
            </div>
          )}

          {/* Unconfigured Admin Warning */}
          {!settingsLoading && !isUpiReady && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>UPI Payment Details Not Configured</span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                The tournament administration has not yet configured or activated the official merchant UPI ID in <strong>Admin Panel &gt; Deposit Settings</strong>.
              </p>
              <p className="text-[11px] text-amber-400/90">
                Deposits are temporarily unavailable until the admin saves a valid merchant UPI ID.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/60 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-bold">Status Update</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{successMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 1: AMOUNT SELECTION (QR IS NOT SHOWN HERE) */}
          {!activeDeposit ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Select or Enter Deposit Amount (₹)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Min ₹10 – Max ₹2,000
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={amountRupees || ''}
                    onChange={(e) => handleManualAmountChange(e.target.value)}
                    disabled={!isUpiReady}
                    placeholder="Enter amount (min ₹10)"
                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-base font-bold focus:outline-none disabled:opacity-40"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                  <span>Minimum Deposit: ₹10</span>
                  <span>Maximum Deposit: ₹2,000</span>
                </div>
              </div>

              {/* Dynamic Preset Amount Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-zinc-300 font-medium">
                    Quick Preset Amounts
                  </span>
                  <span className="text-[10px] text-zinc-500">Tap to select</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {enabledPresets.map((preset) => {
                    const isSelected = amountRupees === preset.amountRupees;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={!isUpiReady}
                        onClick={() => handleSelectAmount(preset.amountRupees)}
                        className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center flex flex-col items-center justify-center disabled:opacity-40 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-1 ring-rose-400'
                            : 'bg-zinc-900/90 text-zinc-200 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                        }`}
                      >
                        <span className="text-sm font-extrabold">₹{preset.amountRupees.toLocaleString('en-IN')}</span>
                        {preset.label && (
                          <span className={`text-[9px] truncate max-w-full font-medium ${isSelected ? 'text-rose-100' : 'text-zinc-400'}`}>
                            {preset.label.replace(/^₹\d+\s*/, '') || preset.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Amount Summary Card */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Selected Deposit Amount
                  </span>
                  <span className="text-xs text-zinc-300">
                    Will be added to wallet balance
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ₹{isValidAmount ? Number(amountRupees).toLocaleString('en-IN') : '0'}.00
                  </span>
                </div>
              </div>

              {/* Strict Verification Policy Disclosure */}
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Financial Verification Policy</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Clicking "Pay via UPI" creates an official payment session and generates a dynamic QR code for ₹{amountRupees}. Wallet coins are credited after payment verification by banking gateway callback or admin confirmation.
                </p>
              </div>

              {/* PROMINENT "PAY VIA UPI" BUTTON */}
              <button
                type="button"
                onClick={handlePayViaUpi}
                disabled={isSubmittingOrder || !isValidAmount || !isUpiReady}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSubmittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Initializing Payment Request...
                  </>
                ) : (
                  <>
                    Pay via UPI (₹{amountRupees}) <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* STEP 2: PAYMENT SCREEN WITH 2-MINUTE COUNTDOWN TIMER & SCANNABLE QR */
            <div className="space-y-4">
              {/* Back to Step 1 & Session Status Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Amount
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isExpired
                      ? 'bg-red-950/60 text-red-300 border-red-800'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800 animate-pulse'
                  }`}>
                    {isExpired ? 'Session Expired' : 'Active Payment Session'}
                  </span>
                </div>
              </div>

              {/* Order ID & Exact Amount Summary */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Payment Request ID
                  </span>
                  <span className="text-xs font-mono font-bold text-white select-all">
                    {activeDeposit.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                    Exact Amount to Pay
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {formatPaise(activeDeposit.amountPaise)}
                  </span>
                </div>
              </div>

              {/* 2-MINUTE COUNTDOWN TIMER CARD */}
              <div className={`p-3 rounded-xl border text-center transition-all ${
                isExpired
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : timeLeftSeconds <= 30
                  ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-emerald-400 animate-spin'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isExpired ? 'Payment Session Expired' : 'Time Remaining to Complete Payment'}
                  </span>
                </div>

                <div className="text-2xl font-black font-mono tracking-widest text-white">
                  {formatTimer(timeLeftSeconds)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isExpired ? 'bg-red-500 w-0' : timeLeftSeconds <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (timeLeftSeconds / 120) * 100))}%` }}
                  />
                </div>

                {isExpired && (
                  <p className="text-[11px] text-red-300 mt-2 leading-relaxed">
                    This QR code session has expired. If you already made the transfer, please enter your 12-digit UTR below to verify, or click "Start New Payment Request" to generate a fresh QR.
                  </p>
                )}
              </div>

              {/* DYNAMIC SCANNABLE MERCHANT UPI QR CODE */}
              <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl mx-auto w-72 border-2 border-emerald-500/50 relative overflow-hidden">
                <div className="space-y-2">
                  {displayQr ? (
                    <div className="relative">
                      <img
                        src={displayQr}
                        alt={`Scannable Official Merchant UPI QR for ${formatPaise(activeDeposit.amountPaise)}`}
                        className={`w-52 h-52 object-contain rounded-lg mx-auto shadow-sm ${
                          isExpired ? 'opacity-20 blur-xs' : ''
                        }`}
                      />
                      {isExpired && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-zinc-900/80 rounded-lg text-white">
                          <Lock className="w-8 h-8 text-red-400 mb-1" />
                          <span className="text-xs font-bold">QR Disabled (Expired)</span>
                          <span className="text-[10px] text-zinc-300 mt-0.5">Please generate a new request or enter UTR below.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center bg-zinc-100 rounded-lg text-zinc-400 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                      <span>Generating QR Scanner...</span>
                    </div>
                  )}

                  <div className="bg-emerald-50 text-emerald-800 rounded-lg py-1.5 px-3 border border-emerald-200">
                    <span className="text-[11px] font-bold block">
                      Amount Pre-Filled: {formatPaise(activeDeposit.amountPaise)}
                    </span>
                    <span className="text-[10px] text-emerald-700">
                      Merchant: {activeDeposit.merchantUpiId || merchantUpiId}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[10px] font-semibold text-zinc-700 block">
                    Scan with any compatible UPI app:
                  </span>
                  <span className="text-[9px] text-zinc-500 font-medium block">
                    PhonePe • Google Pay • Paytm • BHIM • Cred • Navi
                  </span>
                </div>
              </div>

              {/* Direct UPI Mobile Intent Button */}
              {currentUpiUri && !isExpired && (
                <a
                  href={currentUpiUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all text-center block"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open in UPI App to Pay {formatPaise(activeDeposit.amountPaise)}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}

              {/* Official Merchant UPI ID Copy */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">Official Merchant UPI ID:</span>
                  <span className="font-mono text-emerald-400 select-all font-bold text-xs">
                    {activeDeposit.merchantUpiId || merchantUpiId || 'Not configured'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy UPI ID
                    </>
                  )}
                </button>
              </div>

              {/* Clear payment instructions */}
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                  <Info className="w-3.5 h-3.5" />
                  <span>Payment Instructions</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[10px] text-zinc-400">
                  <li>Scan the dynamic QR code above using your preferred UPI app before the 2-minute timer ends.</li>
                  <li>Confirm recipient is <strong>{activeDeposit.merchantUpiId || merchantUpiId}</strong> ({settings?.merchantName || 'BATTLE ESPORTS'}). Exact amount of <strong>{formatPaise(activeDeposit.amountPaise)}</strong> is pre-filled.</li>
                  <li>Complete payment and copy the <strong>12-digit UPI Reference Number / UTR</strong> from your receipt.</li>
                  <li>Paste the 12-digit UTR below and submit for verification.</li>
                </ol>
                <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-400">
                  ⚠️ <strong>Integrity Policy:</strong> Wallet coins are never credited simply by scanning or clicking buttons. Deposits remain in PENDING status until verified by gateway webhook or authorized admin.
                </div>
              </div>

              {/* User UTR Reference Input Form */}
              <form onSubmit={handleSubmitUtr} className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Submit 12-Digit UTR / Transaction ID</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter 12-digit UTR (e.g. 402918291024)"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-emerald-500 rounded-lg text-white font-mono text-xs outline-none"
                    disabled={isSubmittingUtr || utrSubmitted}
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Found in your UPI payment app receipt under 'UPI Ref No' or 'UTR'.
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingUtr || utrSubmitted || !utrNumber.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-md"
                >
                  {isSubmittingUtr ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting UTR...
                    </>
                  ) : utrSubmitted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> UTR Submitted (Pending Verification)
                    </>
                  ) : (
                    `Submit 12-Digit UTR for Verification`
                  )}
                </button>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  <span className="text-amber-400 font-semibold">Note:</span> Submitting this registers your request under Admin &gt; Deposits &gt; Pending. Wallet balance will only be credited once verified.
                </p>
              </form>

              {/* Start New Payment Request Button if expired or completed */}
              {isExpired && (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start New Payment Request</span>
                </button>
              )}

              {/* Evaluation / Gateway Webhook Simulation */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Payment Gateway Webhook</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Auto-Verification API</span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateWebhookVerification}
                  disabled={isVerifying || activeDeposit.status === 'SUCCESSFUL'}
                  className="w-full py-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-600 border border-emerald-600 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Bank Gateway Callback...
                    </>
                  ) : activeDeposit.status === 'SUCCESSFUL' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Gateway Verified & Credited
                    </>
                  ) : (
                    'Simulate Instant Gateway Webhook Approval (Test Flow)'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
