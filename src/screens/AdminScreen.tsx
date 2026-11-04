import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Tournament,
  UserProfile,
  DepositOrder,
  WithdrawalRequest,
  SupportTicket,
  AppSettings,
  DepositPreset,
  AuditLog,
  GameType,
  MatchMode,
  UserAccountStatus,
  BanType,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatPaise, formatDateTime } from '../utils/formatters.ts';
import { validateUpiId, buildUpiUri, generateUpiQrDataUrl } from '../utils/upi.ts';
import {
  Shield,
  ShieldAlert,
  Calendar,
  Trophy,
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  LifeBuoy,
  Settings,
  Bell,
  Plus,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  Send,
  FileText,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Image,
  Clock,
  ArrowRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Eye,
  LogOut,
} from 'lucide-react';
import { ApkGuideModal } from '../components/modals/ApkGuideModal.tsx';

export const AdminScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<
    'overview' | 'tournaments' | 'deposits' | 'deposit-settings' | 'withdrawals' | 'users' | 'support' | 'broadcast' | 'settings'
  >('overview');

  // Stats
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [deposits, setDeposits] = useState<DepositOrder[]>([]);
  const [depositFilter, setDepositFilter] = useState<'PENDING' | 'SUCCESSFUL' | 'REJECTED' | 'EXPIRED' | 'ALL'>('PENDING');
  const [selectedDepositDetails, setSelectedDepositDetails] = useState<DepositOrder | null>(null);
  const [depositConfirmAction, setDepositConfirmAction] = useState<{ id: string; action: 'SUCCESSFUL' | 'REJECTED'; amount: number; username: string } | null>(null);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('PENDING');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Action modals
  const [selectedTour, setSelectedTour] = useState<Tournament | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPassInput, setRoomPassInput] = useState('');
  const [roomModalSaving, setRoomModalSaving] = useState(false);
  const [roomModalFeedback, setRoomModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [rank1User, setRank1User] = useState('');
  const [rank1Ign, setRank1Ign] = useState('');
  const [rank1Kills, setRank1Kills] = useState(6);
  const [rank1Prize, setRank1Prize] = useState(2500);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showNewTourModal, setShowNewTourModal] = useState(false);
  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourGame, setNewTourGame] = useState<GameType>('BGMI');
  const [newTourMode, setNewTourMode] = useState<MatchMode>('Squad');
  const [newTourMap, setNewTourMap] = useState('Erangel');
  const [newTourEntryRupees, setNewTourEntryRupees] = useState(50);
  const [newTourPrizeRupees, setNewTourPrizeRupees] = useState(5000);
  const [newTourSlots, setNewTourSlots] = useState(100);
  const [newTourMatchTime, setNewTourMatchTime] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState<UserProfile | null>(null);
  const [adjustAmountRupees, setAdjustAmountRupees] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const [showApkGuide, setShowApkGuide] = useState(false);

  // Withdrawal action confirmation modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<'PROCESSING' | 'SUCCESSFUL' | 'REJECTED' | null>(null);
  const [withdrawalRefInput, setWithdrawalRefInput] = useState('');
  const [withdrawalNotesInput, setWithdrawalNotesInput] = useState('');
  const [withdrawalConfirmCheck, setWithdrawalConfirmCheck] = useState(false);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalActionError, setWithdrawalActionError] = useState<string | null>(null);
  const [withdrawalActionSuccess, setWithdrawalActionSuccess] = useState<string | null>(null);

  // Deposit settings and QR state
  const [depositSettingsSuccess, setDepositSettingsSuccess] = useState<string | null>(null);
  const [depositSettingsError, setDepositSettingsError] = useState<string | null>(null);
  const [depositSettingsSaving, setDepositSettingsSaving] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');
  const [isRegeneratingQr, setIsRegeneratingQr] = useState(false);

  // Preset deposit amount manager state
  const [newPresetAmount, setNewPresetAmount] = useState<string>('');
  const [newPresetLabel, setNewPresetLabel] = useState<string>('');
  const [presetManagerError, setPresetManagerError] = useState<string | null>(null);

  // User Management & Ban/Unban System State
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TEMPORARILY_BANNED' | 'PERMANENTLY_BANNED'>('ALL');
  const [banTargetUser, setBanTargetUser] = useState<UserProfile | null>(null);
  const [banTypeInput, setBanTypeInput] = useState<BanType>('TEMPORARY');
  const [banDurationPreset, setBanDurationPreset] = useState<number>(24); // 24 hours
  const [banCustomDurationHours, setBanCustomDurationHours] = useState<number>(24);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);

  const [unbanTargetUser, setUnbanTargetUser] = useState<UserProfile | null>(null);
  const [unbanReasonInput, setUnbanReasonInput] = useState('');
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);
  const [unbanError, setUnbanError] = useState<string | null>(null);

  // Administrative Audit Logs state
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);

  const handleAddPreset = () => {
    setPresetManagerError(null);
    const amt = parseInt(newPresetAmount, 10);
    if (isNaN(amt) || amt < 10 || amt > 2000) {
      setPresetManagerError('Preset amount must be between ₹10 and ₹2,000');
      return;
    }
    const current = settings?.depositPresets || [];
    if (current.some((p) => p.amountRupees === amt)) {
      setPresetManagerError(`A preset for ₹${amt} already exists. Duplicates are not allowed.`);
      return;
    }
    const newPreset: DepositPreset = {
      id: `pre_${amt}_${Date.now()}`,
      amountRupees: amt,
      label: newPresetLabel.trim() || undefined,
      enabled: true,
      order: current.length + 1,
    };
    const updated = [...current, newPreset].sort((a, b) => a.order - b.order);
    setSettings({ ...settings!, depositPresets: updated });
    setNewPresetAmount('');
    setNewPresetLabel('');
    setDepositSettingsSuccess(`Added preset ₹${amt}! Remember to click "Save All Deposit Settings" to persist.`);
    setTimeout(() => setDepositSettingsSuccess(null), 4000);
  };

  const handleTogglePreset = (id: string) => {
    if (!settings) return;
    const updated = (settings.depositPresets || []).map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSettings({ ...settings, depositPresets: updated });
  };

  const handleDeletePreset = (id: string) => {
    if (!settings) return;
    const updated = (settings.depositPresets || [])
      .filter((p) => p.id !== id)
      .map((p, idx) => ({ ...p, order: idx + 1 }));
    setSettings({ ...settings, depositPresets: updated });
  };

  const handleMovePreset = (index: number, direction: 'up' | 'down') => {
    if (!settings || !settings.depositPresets) return;
    const list = [...settings.depositPresets];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSettings({ ...settings, depositPresets: updated });
  };

  const handleResetToStandardPresets = () => {
    if (!settings) return;
    const standardPresets: DepositPreset[] = [
      { id: 'pre_10', amountRupees: 10, label: '₹10 (Starter)', enabled: true, order: 1 },
      { id: 'pre_20', amountRupees: 20, label: '₹20', enabled: true, order: 2 },
      { id: 'pre_50', amountRupees: 50, label: '₹50', enabled: true, order: 3 },
      { id: 'pre_100', amountRupees: 100, label: '₹100 (Popular)', enabled: true, order: 4 },
      { id: 'pre_200', amountRupees: 200, label: '₹200', enabled: true, order: 5 },
      { id: 'pre_300', amountRupees: 300, label: '₹300', enabled: true, order: 6 },
      { id: 'pre_500', amountRupees: 500, label: '₹500 (Best Value)', enabled: true, order: 7 },
      { id: 'pre_1000', amountRupees: 1000, label: '₹1,000', enabled: true, order: 8 },
      { id: 'pre_1500', amountRupees: 1500, label: '₹1,500', enabled: true, order: 9 },
      { id: 'pre_2000', amountRupees: 2000, label: '₹2,000 (Max)', enabled: true, order: 10 },
    ];
    setSettings({ ...settings, depositPresets: standardPresets });
    setDepositSettingsSuccess('Loaded 10 standard deposit presets (₹10 – ₹2,000). Click Save Settings to persist.');
    setTimeout(() => setDepositSettingsSuccess(null), 4000);
  };

  // Auto-generate scannable QR preview whenever UPI ID or merchant name changes
  useEffect(() => {
    let isMounted = true;
    async function updatePreview() {
      if (!settings?.merchantUpiId) {
        setLiveQrDataUrl('');
        return;
      }
      const val = validateUpiId(settings.merchantUpiId);
      if (!val.valid) {
        setLiveQrDataUrl('');
        return;
      }
      if (settings.merchantQrImageUrl && settings.merchantQrImageUrl.startsWith('data:image')) {
        setLiveQrDataUrl(settings.merchantQrImageUrl);
        return;
      }
      try {
        const uri = buildUpiUri({
          upiId: settings.merchantUpiId,
          merchantName: settings.merchantName || 'BATTLE ESPORTS',
        });
        const qr = await generateUpiQrDataUrl(uri);
        if (isMounted) setLiveQrDataUrl(qr);
      } catch (err) {
        console.error('Failed to preview QR:', err);
      }
    }
    updatePreview();
    return () => {
      isMounted = false;
    };
  }, [settings?.merchantUpiId, settings?.merchantName, settings?.merchantQrImageUrl]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ovRes, tourRes, depRes, wthRes, usersRes, tktRes, setRes, auditRes] = await Promise.all([
        api.getAdminOverview(),
        api.getTournaments(),
        api.getAdminDeposits(),
        api.getAdminWithdrawals(),
        api.getAdminUsers(),
        api.getAdminTickets(),
        api.getSettings(),
        api.getAdminAuditLogs().catch(() => ({ auditLogs: [] })),
      ]);

      setOverview(ovRes);
      setTournaments(tourRes.tournaments);
      setDeposits(depRes.deposits);
      setWithdrawals(wthRes.withdrawals);
      setUsersList(usersRes.users);
      setTickets(tktRes.tickets);
      setSettings(setRes.settings as AppSettings);
      setAuditLogsList(auditRes.auditLogs || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAll();
    }
  }, [user]);

  // Strict Non-Admin Guard
  if (user?.role !== 'admin') {
    return (
      <div className="py-20 max-w-md mx-auto px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white font-heading">
          Administrator Privileges Required
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Access to this section is restricted exclusively to authorized administrators. Ordinary user accounts cannot access or perform tournament administrative operations.
        </p>
        <button
          onClick={async () => {
            if (confirm('Log out of current account to sign in with authorized administrator credentials?')) {
              await logout();
            }
          }}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign In as Administrator
        </button>
      </div>
    );
  }

  // Save room details handler (supports draft vs immediate publish)
  const handleSaveRoomDetails = async (publishNow: boolean) => {
    if (!selectedTour) return;
    const cleanId = roomIdInput.trim();
    const cleanPass = roomPassInput.trim();

    if (!cleanId || !cleanPass) {
      setRoomModalFeedback({ type: 'error', text: 'Both Room ID and Room Password are required.' });
      return;
    }

    setRoomModalSaving(true);
    setRoomModalFeedback(null);
    try {
      const res = await api.releaseRoom(selectedTour.id, {
        roomId: cleanId,
        roomPassword: cleanPass,
        publishNow,
      });

      setTournaments((prev) => prev.map((t) => (t.id === res.tournament.id ? res.tournament : t)));
      setSelectedTour(res.tournament);
      setRoomModalFeedback({
        type: 'success',
        text: res.message || (publishNow ? 'Room details published and joined players notified!' : 'Room details saved as draft!'),
      });
      await loadAll();
      if (publishNow) {
        setTimeout(() => {
          setShowRoomModal(false);
          setRoomModalFeedback(null);
        }, 1800);
      }
    } catch (err: any) {
      setRoomModalFeedback({ type: 'error', text: err.message || 'Failed to save room details' });
    } finally {
      setRoomModalSaving(false);
    }
  };

  // Publish results handler
  const handlePublishResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTour) return;

    // Pick a participant or rank1User
    const targetUserId = selectedTour.registeredParticipants[0]?.userId;

    const results = [
      {
        rank: 1,
        userId: targetUserId,
        username: rank1User.trim() || 'Winner1',
        gameIgn: rank1Ign.trim() || 'CHAMPION⚡',
        kills: Number(rank1Kills) || 0,
        prizePaise: Math.round(Number(rank1Prize) * 100),
      },
    ];

    try {
      await api.publishTournamentResults(selectedTour.id, results);
      setShowResultsModal(false);
      setSelectedTour(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to publish results');
    }
  };

  // Cancel tournament handler
  const handleCancelTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTour) return;

    try {
      await api.cancelTournament(selectedTour.id, cancelReason.trim() || 'Cancelled by Admin');
      setShowCancelModal(false);
      setSelectedTour(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel tournament');
    }
  };

  // Create tournament handler
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourTitle.trim()) return;

    const mTime = newTourMatchTime
      ? new Date(newTourMatchTime).toISOString()
      : new Date(Date.now() + 60 * 60000).toISOString();

    try {
      await api.createAdminTournament({
        title: newTourTitle.trim(),
        game: newTourGame,
        mode: newTourMode,
        map: newTourMap,
        entryFeePaise: Math.round(newTourEntryRupees * 100),
        prizePoolPaise: Math.round(newTourPrizeRupees * 100),
        totalSlots: Number(newTourSlots),
        matchTime: mTime,
        registrationDeadline: mTime,
      });
      setShowNewTourModal(false);
      setNewTourTitle('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create tournament');
    }
  };

  // Update deposit status (Pending -> Successful or Rejected)
  const handleUpdateDeposit = async (depId: string, newStatus: 'SUCCESSFUL' | 'REJECTED') => {
    try {
      const res = await api.updateDepositStatus(
        depId,
        newStatus,
        newStatus === 'SUCCESSFUL' ? 'Verified & approved by Admin' : 'Declined by Admin'
      );
      setDeposits((prev) => prev.map((d) => (d.id === depId ? res.deposit : d)));
      if (selectedDepositDetails?.id === depId) {
        setSelectedDepositDetails(res.deposit);
      }
      setDepositConfirmAction(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update deposit');
    }
  };

  // Open withdrawal confirmation modal
  const openWithdrawalModal = (wth: WithdrawalRequest, action: 'PROCESSING' | 'SUCCESSFUL' | 'REJECTED') => {
    setSelectedWithdrawal(wth);
    setWithdrawalAction(action);
    setWithdrawalRefInput(action === 'SUCCESSFUL' ? 'IMPS_' + Date.now().toString().slice(-8) : '');
    setWithdrawalNotesInput(action === 'PROCESSING' ? 'Payout initiated in banking payment queue' : '');
    setWithdrawalConfirmCheck(false);
    setWithdrawalActionError(null);
    setWithdrawalActionSuccess(null);
  };

  // Submit withdrawal action to backend
  const submitWithdrawalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal || !withdrawalAction) return;

    if (withdrawalAction === 'SUCCESSFUL') {
      if (!withdrawalRefInput.trim()) {
        setWithdrawalActionError('Please enter a valid Bank Payout Reference / IMPS / UTR transaction ID.');
        return;
      }
      if (!withdrawalConfirmCheck) {
        setWithdrawalActionError('Please confirm that the funds have been successfully paid out to the user.');
        return;
      }
    }

    if (withdrawalAction === 'REJECTED' && !withdrawalNotesInput.trim()) {
      setWithdrawalActionError('Please provide a mandatory rejection reason (this will be shown to the user with their refund).');
      return;
    }

    setWithdrawalSubmitting(true);
    setWithdrawalActionError(null);
    try {
      const res = await api.updateWithdrawalStatus(
        selectedWithdrawal.id,
        withdrawalAction,
        withdrawalNotesInput.trim() || undefined,
        withdrawalAction === 'SUCCESSFUL' ? withdrawalRefInput.trim() : undefined
      );

      // Immediately update local state in Admin Panel
      setWithdrawals((prev) => prev.map((w) => (w.id === selectedWithdrawal.id ? res.withdrawal : w)));
      setWithdrawalActionSuccess(`Withdrawal ${selectedWithdrawal.id} successfully updated to ${withdrawalAction}!`);
      
      // Refresh metrics
      api.getAdminOverview().then(setOverview).catch(() => {});

      setTimeout(() => {
        setWithdrawalAction(null);
        setSelectedWithdrawal(null);
        setWithdrawalActionSuccess(null);
      }, 1200);
    } catch (err: any) {
      setWithdrawalActionError(err.message || 'Failed to update withdrawal status');
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  // Handle custom QR scanner image upload
  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setDepositSettingsError('Image size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64 && settings) {
        setSettings({ ...settings, merchantQrImageUrl: base64 });
        setDepositSettingsSuccess('QR image loaded! Click "Save Deposit & UPI QR Settings" below to activate it for all gamers.');
        setTimeout(() => setDepositSettingsSuccess(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle saving deposit settings
  const handleSaveDepositSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const validation = validateUpiId(settings.merchantUpiId);
    if (!validation.valid) {
      setDepositSettingsError(validation.error || 'Please enter a valid Merchant UPI ID.');
      return;
    }

    setDepositSettingsSaving(true);
    setDepositSettingsError(null);
    setDepositSettingsSuccess(null);
    try {
      // Auto-generate fresh QR data URL from UPI standard URI
      const uri = buildUpiUri({
        upiId: settings.merchantUpiId,
        merchantName: settings.merchantName || 'BATTLE ESPORTS',
      });
      const generatedQr = await generateUpiQrDataUrl(uri);

      const payload = {
        ...settings,
        merchantQrImageUrl: settings.merchantQrImageUrl && settings.merchantQrImageUrl.startsWith('data:image') && !settings.merchantQrImageUrl.includes('error')
          ? settings.merchantQrImageUrl
          : generatedQr,
        regenerateQr: true,
      };

      const res = await api.updateAdminSettings(payload);
      setSettings(res.settings);
      setLiveQrDataUrl(res.settings.merchantQrImageUrl || generatedQr);
      setDepositSettingsSuccess('Merchant UPI settings saved and official scannable UPI QR auto-generated successfully!');
      setTimeout(() => setDepositSettingsSuccess(null), 5000);
    } catch (err: any) {
      setDepositSettingsError(err.message || 'Failed to save deposit settings');
    } finally {
      setDepositSettingsSaving(false);
    }
  };

  // Handle regenerating official merchant QR code
  const handleRegenerateQr = async () => {
    if (!settings?.merchantUpiId) {
      setDepositSettingsError('Enter a valid Merchant UPI ID first.');
      return;
    }
    const validation = validateUpiId(settings.merchantUpiId);
    if (!validation.valid) {
      setDepositSettingsError(validation.error || 'Please enter a valid Merchant UPI ID.');
      return;
    }

    setIsRegeneratingQr(true);
    setDepositSettingsError(null);
    try {
      const res = await api.regenerateAdminQr();
      setSettings(res.settings);
      setLiveQrDataUrl(res.settings.merchantQrImageUrl || res.qrCodeUrl);
      setDepositSettingsSuccess('Fresh scannable official UPI QR code regenerated and saved successfully!');
      setTimeout(() => setDepositSettingsSuccess(null), 5000);
    } catch (err: any) {
      setDepositSettingsError(err.message || 'Failed to regenerate QR code');
    } finally {
      setIsRegeneratingQr(false);
    }
  };

  // Adjust wallet handler
  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser || !adjustReason.trim()) return;

    try {
      await api.adjustUserWallet(
        adjustTargetUser.id,
        Math.round(adjustAmountRupees * 100),
        adjustReason.trim()
      );
      setShowAdjustModal(false);
      setAdjustTargetUser(null);
      setAdjustReason('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust wallet');
    }
  };

  // Toggle user ban (legacy fallback)
  const handleToggleBan = async (userId: string) => {
    try {
      await api.toggleBanUser(userId);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle ban');
    }
  };

  // Open Ban User Modal
  const openBanModal = (target: UserProfile) => {
    setBanTargetUser(target);
    setBanTypeInput('TEMPORARY');
    setBanDurationPreset(24);
    setBanCustomDurationHours(24);
    setBanReasonInput('');
    setBanError(null);
  };

  // Submit Ban User
  const handleExecuteBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTargetUser) return;

    if (!banReasonInput.trim()) {
      setBanError('A valid ban reason is mandatory before banning a user.');
      return;
    }

    setBanSubmitting(true);
    setBanError(null);
    try {
      const duration = banTypeInput === 'TEMPORARY' ? (banDurationPreset === 0 ? banCustomDurationHours : banDurationPreset) : undefined;
      await api.banUser(banTargetUser.id, {
        reason: banReasonInput.trim(),
        banType: banTypeInput,
        durationHours: duration,
      });
      setBanTargetUser(null);
      await loadAll();
    } catch (err: any) {
      setBanError(err.message || 'Failed to ban user');
    } finally {
      setBanSubmitting(false);
    }
  };

  // Open Unban User Modal
  const openUnbanModal = (target: UserProfile) => {
    setUnbanTargetUser(target);
    setUnbanReasonInput('');
    setUnbanError(null);
  };

  // Submit Unban User
  const handleExecuteUnban = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unbanTargetUser) return;

    setUnbanSubmitting(true);
    setUnbanError(null);
    try {
      await api.unbanUser(unbanTargetUser.id, unbanReasonInput.trim() || undefined);
      setUnbanTargetUser(null);
      await loadAll();
    } catch (err: any) {
      setUnbanError(err.message || 'Failed to unban user');
    } finally {
      setUnbanSubmitting(false);
    }
  };

  // Reply to support ticket
  const handleAdminReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReplyText.trim()) return;

    try {
      const res = await api.sendTicketMessage(activeTicket.id, adminReplyText.trim());
      setActiveTicket(res.ticket);
      setTickets((prev) => prev.map((t) => (t.id === res.ticket.id ? res.ticket : t)));
      setAdminReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    }
  };

  // Broadcast
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;

    try {
      await api.broadcastNotification(broadcastTitle.trim(), broadcastMsg.trim());
      setBroadcastSuccess(true);
      setBroadcastTitle('');
      setBroadcastMsg('');
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Broadcast failed');
    }
  };

  // Settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (settings.merchantUpiId && settings.merchantUpiId.trim().length > 0) {
      const val = validateUpiId(settings.merchantUpiId);
      if (!val.valid) {
        alert(val.error || 'Invalid UPI ID format');
        return;
      }
    }

    try {
      const res = await api.updateAdminSettings(settings);
      setSettings(res.settings);
      alert('Platform & UPI Settings updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-5xl mx-auto px-3.5 pt-2">
      {/* Admin Title & Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider">
              Control Panel
            </span>
            <h1 className="text-xl font-bold text-white font-heading">
              Tournament Administration
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Operational dashboard for tournaments, payouts, ledger, and support
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={async () => {
              if (confirm('Are you sure you want to log out of the Administrator Panel? You will need to re-authenticate with your administrator credentials.')) {
                await logout();
              }
            }}
            className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title="Log out of Administrator Panel"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-800 scrollbar-none text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'tournaments', label: 'Tournaments', icon: Trophy },
          { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
          { id: 'deposit-settings', label: 'Deposit QR & UPI', icon: QrCode },
          { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
          { id: 'users', label: 'Players', icon: Users },
          { id: 'support', label: 'Helpdesk', icon: LifeBuoy },
          { id: 'broadcast', label: 'Broadcast', icon: Bell },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW METRICS */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                Total Players
              </span>
              <span className="text-2xl font-bold text-white font-heading">
                {overview?.totalUsers ?? '...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                Active Tournaments
              </span>
              <span className="text-2xl font-bold text-amber-400 font-heading">
                {overview?.activeTournaments ?? '...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                Pending Deposits
              </span>
              <span className="text-2xl font-bold text-emerald-400 font-heading">
                {overview?.pendingDepositsCount ?? '...'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                Pending Withdrawals
              </span>
              <span className="text-2xl font-bold text-rose-400 font-heading">
                {overview?.pendingWithdrawalsCount ?? '...'}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 font-medium">Quick Shortcuts:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewTourModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Create Tournament
              </button>
              <button
                onClick={() => setActiveSection('deposits')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
              >
                Review Deposits ({overview?.pendingDepositsCount || 0})
              </button>
              <button
                onClick={() => setShowApkGuide(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold flex items-center gap-1"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> APK Build
              </button>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                  Administrative Audit Trail
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500">Immutable ledger events</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {overview?.recentAuditLogs?.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-500">No audit logs yet</div>
              ) : (
                overview?.recentAuditLogs?.map((log: AuditLog) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 text-[11px] font-mono">
                          {log.action}
                        </span>
                        <span className="text-zinc-300">{log.details}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        By {log.adminName} • {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TOURNAMENTS MANAGEMENT */}
      {activeSection === 'tournaments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Manage Custom Rooms, Publish Winners & Auto-Refunds
            </span>
            <button
              onClick={() => setShowNewTourModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Tournament
            </button>
          </div>

          <div className="space-y-3">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.banner}
                      alt={t.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-400 font-bold text-[9px]">
                          {t.game}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {t.mode} • {t.map}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            t.status === 'LIVE'
                              ? 'bg-red-600 text-white'
                              : t.status === 'COMPLETED'
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-heading mt-0.5">{t.title}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatDateTime(t.matchTime)} • {t.registeredParticipants.length}/{t.totalSlots} Slots
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs shrink-0">
                    <span className="font-bold text-emerald-400 block font-mono">
                      {formatPaise(t.prizePoolPaise)}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Fee: {formatPaise(t.entryFeePaise)}
                    </span>
                  </div>
                </div>

                {/* Operations toolbar for this tournament */}
                <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
                  {/* Release Room Credentials */}
                  <button
                    onClick={() => {
                      setSelectedTour(t);
                      setRoomIdInput(t.roomDetails.roomId || '');
                      setRoomPassInput(t.roomDetails.roomPassword || '');
                      setShowRoomModal(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                      t.roomDetails.released
                        ? 'bg-emerald-950/40 border border-emerald-600/40 text-emerald-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    {t.roomDetails.released ? 'Room Released (Edit)' : 'Release Room ID'}
                  </button>

                  {/* Send 15m Match Start Push Alert */}
                  {t.status === 'UPCOMING' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Send match countdown push alert to ${t.registeredParticipants.length} registered participant(s) for "${t.title}"?`)) {
                          try {
                            const res = await api.sendTournamentStartAlert(t.id);
                            alert(res.message);
                            await loadAll();
                          } catch (err: any) {
                            alert(err.message || 'Failed to send match start alert');
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-950/60 border border-blue-600/40 text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Alert registered players that the match is starting soon"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Send 15m Start Alert</span>
                    </button>
                  )}

                  {/* Declare Results & Credit Prizes */}
                  {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                    <button
                      onClick={() => {
                        setSelectedTour(t);
                        setRank1User(t.registeredParticipants[0]?.username || 'Champion');
                        setRank1Ign(t.registeredParticipants[0]?.gameIgn || 'PRO_KILLER');
                        setShowResultsModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Declare Winners & Distribute Prizes
                    </button>
                  )}

                  {/* Cancel & Refund */}
                  {t.status === 'UPCOMING' && (
                    <button
                      onClick={() => {
                        setSelectedTour(t);
                        setShowCancelModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-700/40 text-red-400 font-bold flex items-center gap-1 ml-auto"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel & Auto-Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DEPOSIT MANAGEMENT (5 Tabs: Pending, Successful, Rejected, Expired, All) */}
      {activeSection === 'deposits' && (
        <div className="space-y-4">
          {/* Quick link banner to Deposit Amount & UPI Settings */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Merchant UPI & Deposit Amount Settings</p>
                <p className="text-[11px] text-zinc-400">
                  Current Merchant UPI: <span className="font-mono text-amber-300 font-semibold">{settings?.merchantUpiId || 'merchant@upi'}</span> (₹{((settings?.minDepositPaise || 1000)/100)} - ₹{((settings?.maxDepositPaise || 200000)/100)})
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSection('deposit-settings')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure UPI & Presets</span>
            </button>
          </div>

          {/* 5 Strict Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-bold">
            {(['PENDING', 'SUCCESSFUL', 'REJECTED', 'EXPIRED', 'ALL'] as const).map((st) => {
              const count = st === 'ALL' ? deposits.length : deposits.filter((d) => d.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setDepositFilter(st)}
                  className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    depositFilter === st
                      ? st === 'PENDING'
                        ? 'bg-amber-500 text-black shadow'
                        : st === 'SUCCESSFUL'
                        ? 'bg-emerald-600 text-white shadow'
                        : st === 'REJECTED'
                        ? 'bg-red-600 text-white shadow'
                        : st === 'EXPIRED'
                        ? 'bg-zinc-700 text-white shadow'
                        : 'bg-white text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${depositFilter === st ? 'bg-black/25 text-inherit' : 'bg-zinc-800 text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List for active tab */}
          <div className="space-y-3">
            {deposits.filter((d) => depositFilter === 'ALL' ? true : d.status === depositFilter).length === 0 ? (
              <div className="p-10 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
                No deposit requests in {depositFilter === 'ALL' ? 'the system' : `${depositFilter.toLowerCase()} state`}.
              </div>
            ) : (
              deposits
                .filter((d) => depositFilter === 'ALL' ? true : d.status === depositFilter)
                .map((dep) => {
                  const isExpired = dep.expiresAt ? new Date(dep.expiresAt) < new Date() : false;
                  return (
                    <div
                      key={dep.id}
                      className={`p-4 rounded-xl bg-zinc-900/90 border transition-all ${
                        dep.status === 'PENDING'
                          ? dep.utr
                            ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'border-zinc-800'
                          : dep.status === 'SUCCESSFUL'
                          ? 'border-emerald-900/40'
                          : dep.status === 'REJECTED'
                          ? 'border-red-950/40'
                          : 'border-zinc-800/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                        {/* User & Request info */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">{dep.username}</span>
                            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-400">
                              UID: {dep.userId}
                            </span>
                            <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono text-zinc-400 border border-zinc-800">
                              Req: {dep.id}
                            </span>
                            {/* Status Pill */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                dep.status === 'SUCCESSFUL'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : dep.status === 'REJECTED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : dep.status === 'EXPIRED'
                                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                  : dep.utr
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : isExpired
                                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {dep.status === 'PENDING'
                                ? dep.utr
                                  ? 'Verification Needed (UTR)'
                                  : isExpired
                                  ? 'Awaiting UTR / Expired'
                                  : 'Awaiting Payment'
                                : dep.status}
                            </span>
                          </div>

                          {/* Merchant VPA & UTR */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs">
                            <span className="text-zinc-400 flex items-center gap-1">
                              Merchant UPI: <span className="font-mono text-white">{dep.merchantUpiId || settings?.merchantUpiId || 'merchant@upi'}</span>
                            </span>
                            {dep.utr ? (
                              <span className="text-amber-300 font-mono font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                                UTR: {dep.utr}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px] italic">
                                UTR not submitted yet
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount & Time */}
                        <div className="sm:text-right shrink-0">
                          <span className="text-lg font-extrabold text-emerald-400 font-mono">
                            {formatPaise(dep.amountPaise)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {formatDateTime(dep.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Notes & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 text-xs">
                        <div className="text-[11px] text-zinc-400">
                          {dep.verificationNotes && (
                            <span className="italic text-zinc-400">Note: {dep.verificationNotes}</span>
                          )}
                          {dep.expiresAt && dep.status === 'PENDING' && (
                            <span className={`block text-[10px] ${isExpired ? 'text-amber-400/80' : 'text-zinc-500'}`}>
                              {isExpired ? 'Payment window expired' : `Timer active until: ${new Date(dep.expiresAt).toLocaleTimeString()}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => setSelectedDepositDetails(dep)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          {dep.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => setDepositConfirmAction({
                                  id: dep.id,
                                  action: 'SUCCESSFUL',
                                  amount: dep.amountPaise,
                                  username: dep.username
                                })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => setDepositConfirmAction({
                                  id: dep.id,
                                  action: 'REJECTED',
                                  amount: dep.amountPaise,
                                  username: dep.username
                                })}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* DEPOSIT SETTINGS & CUSTOM UPI QR SCANNER */}
      {activeSection === 'deposit-settings' && settings && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white font-heading">Merchant UPI & Scanner QR Configuration</h2>
              <p className="text-xs text-zinc-400">Save your official merchant UPI ID and scanner image. These exact details appear to gamers in Add Cash.</p>
            </div>
            <button
              onClick={() => setActiveSection('deposits')}
              className="text-xs text-amber-400 hover:underline"
            >
              ← Back to Deposits List
            </button>
          </div>

          {depositSettingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{depositSettingsSuccess}</span>
            </div>
          )}

          {depositSettingsError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-700 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{depositSettingsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveDepositSettings} className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold block">
                      Official Merchant UPI ID (VPA) <span className="text-rose-500">*</span>
                    </label>
                    {settings.merchantUpiId ? (
                      validateUpiId(settings.merchantUpiId).valid ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          <Check className="w-3 h-3" /> Valid VPA
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          <AlertTriangle className="w-3 h-3" /> Invalid Format
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-zinc-500">Not configured</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.merchantUpiId || ''}
                    onChange={(e) => setSettings({ ...settings, merchantUpiId: e.target.value })}
                    placeholder="e.g. merchant@icici or 9876543210@paytm"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-750 focus:border-amber-500 rounded-xl text-white font-mono text-xs focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    Gamers will send payments to this UPI address. Standard format: username@bank (e.g. yourname@icici or 9876543210@paytm).
                  </span>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">
                    Merchant Business / Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={settings.merchantName || ''}
                    onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                    placeholder="e.g. BATTLE ESPORTS TOURNAMENTS LTD"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-750 focus:border-amber-500 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">
                      Min Deposit (₹) <span className="text-[10px] text-zinc-500">(Hard Limit: ₹10)</span>
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={Math.round((settings.minDepositPaise || 1000) / 100)}
                      onChange={(e) => {
                        const val = Math.max(10, Math.min(2000, Number(e.target.value) || 10));
                        setSettings({ ...settings, minDepositPaise: val * 100 });
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">
                      Max Deposit (₹) <span className="text-[10px] text-zinc-500">(Hard Limit: ₹2,000)</span>
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={Math.round((settings.maxDepositPaise || 200000) / 100)}
                      onChange={(e) => {
                        const val = Math.max(10, Math.min(2000, Number(e.target.value) || 2000));
                        setSettings({ ...settings, maxDepositPaise: val * 100 });
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Allowable user deposits are strictly bounded between ₹10 and ₹2,000 across frontend and backend.
                </div>

                <div className="pt-2">
                  <label className="text-zinc-300 font-semibold block mb-1">
                    Custom UPI QR / Scanner Image (File Upload or Image URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 cursor-pointer flex items-center justify-center gap-2 font-medium">
                      <Image className="w-4 h-4 text-amber-400" />
                      <span>Upload Scanner Image (.png, .jpg)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        className="hidden"
                      />
                    </label>
                    {settings.merchantQrImageUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, merchantQrImageUrl: '' })}
                        className="px-2.5 py-2 rounded-xl bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-950/60"
                        title="Remove custom image"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={settings.merchantQrImageUrl || ''}
                      onChange={(e) => setSettings({ ...settings, merchantQrImageUrl: e.target.value })}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-amber-500 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code Live Preview */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold mb-2">
                  Auto-Generated Scannable UPI QR Preview
                </span>
                
                {liveQrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-500/40">
                    <img
                      src={liveQrDataUrl}
                      alt="Merchant Auto-Generated UPI QR"
                      className="w-48 h-48 object-contain rounded-lg"
                    />
                  </div>
                ) : settings.merchantUpiId && validateUpiId(settings.merchantUpiId).valid ? (
                  <div className="w-48 h-48 rounded-xl border border-dashed border-zinc-750 flex flex-col items-center justify-center text-zinc-400 text-xs p-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                    <span>Encoding UPI QR...</span>
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-xs p-4 bg-zinc-900/40">
                    <QrCode className="w-10 h-10 opacity-30 mb-2" />
                    <span className="font-semibold text-zinc-400">Merchant UPI ID is not configured yet</span>
                    <span className="text-[10px] text-zinc-500 mt-1">Enter a valid UPI ID to auto-generate scannable QR.</span>
                  </div>
                )}

                <div className="mt-3 text-center w-full max-w-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400">Active Merchant VPA:</span>
                    <span className="font-mono font-bold text-amber-400 select-all">
                      {settings.merchantUpiId || 'Not Configured'}
                    </span>
                  </div>
                  {settings.merchantUpiId && validateUpiId(settings.merchantUpiId).valid && (
                    <div className="text-[9px] text-zinc-500 font-mono break-all text-left bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      Standard URI: {buildUpiUri({ upiId: settings.merchantUpiId, merchantName: settings.merchantName || 'BATTLE ESPORTS' })}
                    </div>
                  )}
                </div>

                {settings.merchantUpiId && validateUpiId(settings.merchantUpiId).valid && (
                  <button
                    type="button"
                    onClick={handleRegenerateQr}
                    disabled={isRegeneratingQr}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegeneratingQr ? 'animate-spin text-amber-400' : ''}`} />
                    {isRegeneratingQr ? 'Regenerating QR...' : 'Regenerate QR Code'}
                  </button>
                )}
              </div>
            </div>

            {/* PRESET DEPOSIT AMOUNT BUTTONS MANAGER (₹10 – ₹2,000) */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white font-heading">
                      Preset Deposit Amount Buttons (₹10 – ₹2,000)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {(settings.depositPresets || []).filter((p) => p.enabled).length} Enabled / {(settings.depositPresets || []).length} Total
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Manage the quick-tap amount buttons shown to users in the Add Cash modal. Add, edit, delete, reorder, or toggle individual buttons.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToStandardPresets}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  Load Standard 10 Presets (₹10–₹2k)
                </button>
              </div>

              {/* Add New Preset Row */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-300 block">
                  Add New Preset Deposit Amount (₹10 to ₹2,000)
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={newPresetAmount}
                      onChange={(e) => {
                        setNewPresetAmount(e.target.value);
                        setPresetManagerError(null);
                      }}
                      placeholder="Amount between 10 and 2000"
                      className="w-full pl-7 pr-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-lg text-white text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newPresetLabel}
                      onChange={(e) => setNewPresetLabel(e.target.value)}
                      placeholder="Optional label (e.g. Starter, Popular, Best Deal)"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-lg text-white text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shrink-0 shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Button
                  </button>
                </div>

                {presetManagerError && (
                  <div className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{presetManagerError}</span>
                  </div>
                )}
              </div>

              {/* Presets List */}
              <div className="space-y-1.5">
                {(settings.depositPresets || []).length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-dashed border-zinc-800 text-center text-zinc-500 text-xs">
                    No presets configured. Click "Load Standard 10 Presets" above to initialize standard buttons.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(settings.depositPresets || []).map((preset, index, arr) => (
                      <div
                        key={preset.id || index}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          preset.enabled
                            ? 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                            : 'bg-zinc-950/40 border-zinc-850 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMovePreset(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:bg-zinc-900"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePreset(index, 'down')}
                              disabled={index === arr.length - 1}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:bg-zinc-900"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            #{index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-white">
                                ₹{preset.amountRupees.toLocaleString('en-IN')}
                              </span>
                              {preset.label && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-medium truncate max-w-[120px]">
                                  {preset.label}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-zinc-500 block truncate">
                              ID: {preset.id}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePreset(preset.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              preset.enabled
                                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                            }`}
                          >
                            {preset.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(preset.id)}
                            className="p-1.5 rounded-lg bg-red-950/30 text-red-400 hover:bg-red-950/60 hover:text-red-300 border border-red-900/40"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Preview of Preset Buttons */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Live Gamer Add Cash Preview (Only enabled presets appear to users)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {(settings.depositPresets || []).filter((p) => p.enabled).length} buttons visible
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(settings.depositPresets || []).filter((p) => p.enabled).map((preset) => (
                    <div
                      key={preset.id}
                      className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-750 text-center text-zinc-200"
                    >
                      <span className="text-xs font-bold block text-white">
                        ₹{preset.amountRupees.toLocaleString('en-IN')}
                      </span>
                      {preset.label && (
                        <span className="text-[9px] text-zinc-400 block truncate">
                          {preset.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-zinc-400">
                Changes persist in database and sync immediately to gamer deposit screen.
              </span>
              <div className="flex items-center gap-2">
                {settings.merchantUpiId && validateUpiId(settings.merchantUpiId).valid && (
                  <button
                    type="button"
                    onClick={handleRegenerateQr}
                    disabled={isRegeneratingQr || depositSettingsSaving}
                    className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingQr ? 'animate-spin' : ''}`} />
                    Regenerate QR
                  </button>
                )}
                <button
                  type="submit"
                  disabled={depositSettingsSaving}
                  className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {depositSettingsSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving All Settings...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Deposit & UPI Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 4. WITHDRAWAL MANAGEMENT */}
      {activeSection === 'withdrawals' && (
        <div className="space-y-3">
          {/* Tabs: PENDING, PROCESSING, SUCCESSFUL, REJECTED, ALL */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-bold overflow-x-auto scrollbar-none">
            {(['PENDING', 'PROCESSING', 'SUCCESSFUL', 'REJECTED', 'ALL'] as const).map((st) => {
              const count = st === 'ALL' ? withdrawals.length : withdrawals.filter((w) => w.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setWithdrawalFilter(st)}
                  className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    withdrawalFilter === st
                      ? st === 'PENDING'
                        ? 'bg-amber-500 text-black font-bold shadow'
                        : st === 'PROCESSING'
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : st === 'SUCCESSFUL'
                        ? 'bg-emerald-600 text-white font-bold shadow'
                        : st === 'REJECTED'
                        ? 'bg-red-600 text-white font-bold shadow'
                        : 'bg-zinc-800 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{st.charAt(0) + st.slice(1).toLowerCase()}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {withdrawals.filter((w) => withdrawalFilter === 'ALL' || w.status === withdrawalFilter).length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
                No withdrawal requests found for {withdrawalFilter.toLowerCase()}.
              </div>
            ) : (
              withdrawals
                .filter((w) => withdrawalFilter === 'ALL' || w.status === withdrawalFilter)
                .map((wth) => (
                  <div
                    key={wth.id}
                    className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{wth.username}</span>
                        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          UID: {wth.userId}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          REQ: {wth.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            wth.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : wth.status === 'PROCESSING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                              : wth.status === 'SUCCESSFUL'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {wth.status}
                        </span>
                        <span className="text-base font-extrabold text-rose-400 font-mono">
                          {formatPaise(wth.amountPaise)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Payout UPI ID</span>
                          <span className="font-mono text-emerald-400 font-bold select-all">{wth.payoutUpiId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(wth.payoutUpiId);
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }}
                          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] flex items-center gap-1"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                        <span className="text-[10px] text-zinc-400 block uppercase font-medium">Request Date</span>
                        <span className="text-zinc-200">{formatDateTime(wth.createdAt)}</span>
                      </div>
                    </div>

                    {/* Metadata & Status info */}
                    {wth.status === 'SUCCESSFUL' && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-600/30 text-xs text-emerald-300 flex items-center justify-between">
                        <span>✅ Payout Reference: <strong className="font-mono">{wth.referenceNo || 'IMPS_CONFIRMED'}</strong></span>
                        <span className="text-[10px] text-zinc-400">{wth.processedAt ? formatDateTime(wth.processedAt) : ''}</span>
                      </div>
                    )}

                    {wth.status === 'REJECTED' && (
                      <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-700/30 text-xs text-red-300">
                        ❌ Declined & Refunded to Wallet. Reason: <strong className="font-normal">{wth.adminNotes || 'Declined by Admin'}</strong>
                      </div>
                    )}

                    {wth.status === 'PROCESSING' && wth.adminNotes && (
                      <div className="p-2 rounded-lg bg-blue-950/20 border border-blue-600/30 text-xs text-blue-300">
                        ℹ️ Processing Note: {wth.adminNotes}
                      </div>
                    )}

                    {/* Action buttons with confirmation modals */}
                    {(wth.status === 'PENDING' || wth.status === 'PROCESSING') && (
                      <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-2 text-xs">
                        {wth.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => openWithdrawalModal(wth, 'PROCESSING')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1 transition-all"
                          >
                            <Clock className="w-3.5 h-3.5" /> Move to Processing
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openWithdrawalModal(wth, 'SUCCESSFUL')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Payout (Successful)
                        </button>

                        <button
                          type="button"
                          onClick={() => openWithdrawalModal(wth, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold flex items-center gap-1 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject & Refund
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 5. USER MANAGEMENT (Comprehensive Ban/Unban System) */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-white font-heading">Player & User Management</h2>
              <p className="text-xs text-zinc-400">Search users, review registration dates, enforce temporary or permanent suspensions, and adjust balances.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Total Users: <strong className="text-white">{usersList.length}</strong></span>
              <span className="text-xs text-rose-400">Banned: <strong>{usersList.filter((u) => u.isBanned).length}</strong></span>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-bold">
            {(['ALL', 'ACTIVE', 'TEMPORARILY_BANNED', 'PERMANENTLY_BANNED'] as const).map((st) => {
              const count =
                st === 'ALL'
                  ? usersList.length
                  : st === 'ACTIVE'
                  ? usersList.filter((u) => !u.isBanned).length
                  : st === 'TEMPORARILY_BANNED'
                  ? usersList.filter((u) => u.isBanned && (u.banType === 'TEMPORARY' || u.accountStatus === 'TEMPORARILY_BANNED')).length
                  : usersList.filter((u) => u.isBanned && (u.banType === 'PERMANENT' || u.accountStatus === 'PERMANENTLY_BANNED' || (!u.banType && !u.accountStatus))).length;

              const label =
                st === 'ALL'
                  ? 'All Players'
                  : st === 'ACTIVE'
                  ? 'Active'
                  : st === 'TEMPORARILY_BANNED'
                  ? 'Temp Banned'
                  : 'Perm Banned';

              return (
                <button
                  key={st}
                  onClick={() => setUserStatusFilter(st)}
                  className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    userStatusFilter === st
                      ? st === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow'
                        : st === 'TEMPORARILY_BANNED'
                        ? 'bg-amber-500 text-black shadow'
                        : st === 'PERMANENTLY_BANNED'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-white text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${userStatusFilter === st ? 'bg-black/25 text-inherit' : 'bg-zinc-800 text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar supporting User ID, username, email, phone */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by User ID (e.g. usr_player_001), username, email, or phone..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl text-white text-xs outline-none transition"
            />
          </div>

          {/* User Cards List */}
          <div className="space-y-3">
            {usersList
              .filter((u) => {
                // Status Filter
                if (userStatusFilter === 'ACTIVE' && u.isBanned) return false;
                if (userStatusFilter === 'TEMPORARILY_BANNED' && (!u.isBanned || (u.banType !== 'TEMPORARY' && u.accountStatus !== 'TEMPORARILY_BANNED'))) return false;
                if (userStatusFilter === 'PERMANENTLY_BANNED') {
                  const isTemp = u.banType === 'TEMPORARY' || u.accountStatus === 'TEMPORARILY_BANNED';
                  if (!u.isBanned || isTemp) return false;
                }

                // Search Filter
                if (!userSearch.trim()) return true;
                const q = userSearch.toLowerCase().trim();
                return (
                  u.username.toLowerCase().includes(q) ||
                  u.id.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  (u.phone && u.phone.toLowerCase().includes(q))
                );
              })
              .map((usr) => {
                const isTemp = usr.isBanned && (usr.banType === 'TEMPORARY' || usr.accountStatus === 'TEMPORARILY_BANNED');
                const isPerm = usr.isBanned && !isTemp;

                return (
                  <div
                    key={usr.id}
                    className={`p-4 rounded-xl border transition-all ${
                      usr.isBanned
                        ? isTemp
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : 'bg-rose-950/20 border-rose-800/40'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Avatar & Identity */}
                      <div className="flex items-start sm:items-center gap-3">
                        <img
                          src={usr.avatar}
                          alt={usr.username}
                          className="w-11 h-11 rounded-xl object-cover bg-zinc-800 border border-zinc-700 shrink-0"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">{usr.username}</span>
                            <span className="font-mono text-[10px] bg-black/50 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                              ID: {usr.id}
                            </span>
                            {usr.role === 'admin' && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[9px] uppercase tracking-wider">
                                Administrator
                              </span>
                            )}

                            {/* Current Account Status Pill */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                usr.isBanned
                                  ? isTemp
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {usr.isBanned ? (
                                isTemp ? (
                                  <>
                                    <Clock className="w-3 h-3" /> Temporarily Banned
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3 h-3" /> Permanently Banned
                                  </>
                                )
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 mt-1">
                            <span>{usr.email}</span>
                            {usr.phone && <span>• {usr.phone}</span>}
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Registered: {formatDateTime(usr.createdAt)}
                            </span>
                          </div>

                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            BGMI IGN: <span className="text-zinc-300">{usr.bgmiIgn || 'Not set'}</span> • UPI:{' '}
                            <span className="text-zinc-300">{usr.upiId || 'Not set'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Balance & Actions */}
                      <div className="sm:text-right shrink-0">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-0.5">Wallet Balance (Preserved)</span>
                        <span className="font-mono font-bold text-emerald-400 text-base block">
                          {formatPaise(usr.walletBalancePaise)}
                        </span>

                        <div className="flex items-center gap-1.5 mt-2 justify-start sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustTargetUser(usr);
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition"
                          >
                            Adjust Balance
                          </button>

                          {usr.role !== 'admin' && (
                            <>
                              {!usr.isBanned ? (
                                <button
                                  type="button"
                                  onClick={() => openBanModal(usr)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                                >
                                  <ShieldAlert className="w-3 h-3" /> Ban User
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openUnbanModal(usr)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Unban User
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ban Details Callout for Banned Users */}
                    {usr.isBanned && (
                      <div className="mt-3 p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs space-y-1">
                        <div className="flex items-start gap-1.5 text-rose-300 font-semibold">
                          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                          <span>Suspension Reason: <strong className="text-white font-normal">{usr.banReason || 'Violation of fair play and tournament guidelines'}</strong></span>
                        </div>

                        {isTemp && usr.banExpiresAt && (
                          <div className="text-[11px] text-amber-300 flex items-center gap-1.5 pl-5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Auto-Expiry: <strong className="text-white font-mono">{formatDateTime(usr.banExpiresAt)}</strong></span>
                          </div>
                        )}

                        <div className="text-[10px] text-zinc-500 pl-5">
                          Enforced by: {usr.bannedByName || usr.bannedBy || 'Administrator'} {usr.bannedAt ? `• ${formatDateTime(usr.bannedAt)}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 6. HELPDESK / SUPPORT */}
      {activeSection === 'support' && (
        <div className="space-y-3">
          {activeTicket ? (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <button
                onClick={() => setActiveTicket(null)}
                className="text-xs text-amber-400 hover:underline"
              >
                ← Back to tickets
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeTicket.subject}</h3>
                  <span className="text-[10px] text-zinc-400">
                    User: {activeTicket.username} ({activeTicket.userId}) • Category: {activeTicket.category}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await api.updateTicketStatus(activeTicket.id, 'RESOLVED');
                    activeTicket.status = 'RESOLVED';
                    await loadAll();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Mark Resolved
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-zinc-950 rounded-xl">
                {activeTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-lg text-xs ${
                      m.sender === 'admin'
                        ? 'bg-amber-950/40 border border-amber-600/30 text-amber-200 ml-auto max-w-[80%]'
                        : 'bg-zinc-900 text-zinc-300 mr-auto max-w-[80%]'
                    }`}
                  >
                    <span className="font-bold text-[10px] block text-white">{m.senderName}:</span>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAdminReplyTicket} className="flex gap-2">
                <input
                  type="text"
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Type official reply to player..."
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                >
                  Send Reply
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTicket(t)}
                  className="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{t.username}:</span>
                      <span className="text-zinc-300">{t.subject}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                      {t.category} • {formatDateTime(t.updatedAt)}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. BROADCAST ANNOUNCEMENT */}
      {activeSection === 'broadcast' && (
        <form onSubmit={handleBroadcast} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white font-heading">
            Broadcast In-App Alert to All Gamers
          </h3>

          {broadcastSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-600 text-emerald-300 text-xs">
              Broadcast notification dispatched to all registered gamers!
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notice Headline</label>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="e.g. Weekend BGMI Custom Rooms Scheduled"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white text-xs focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notification Body</label>
            <textarea
              rows={3}
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="Detail match timing, prize pool updates, or maintenance notes..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white text-xs focus:outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider"
          >
            Send Real-Time Push Notification
          </button>
        </form>
      )}

      {/* 8. SETTINGS */}
      {activeSection === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-white font-heading">Platform & Merchant Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">Official Merchant UPI ID</label>
              <input
                type="text"
                value={settings.merchantUpiId}
                onChange={(e) => setSettings({ ...settings, merchantUpiId: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Merchant Business Display Name</label>
              <input
                type="text"
                value={settings.merchantName}
                onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Min Deposit (Paise)</label>
              <input
                type="number"
                value={settings.minDepositPaise}
                onChange={(e) => setSettings({ ...settings, minDepositPaise: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Min Withdrawal (Paise)</label>
              <input
                type="number"
                value={settings.minWithdrawalPaise}
                onChange={(e) => setSettings({ ...settings, minWithdrawalPaise: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Live Header Announcement Ticker</label>
            <input
              type="text"
              value={settings.announcementNotice}
              onChange={(e) => setSettings({ ...settings, announcementNotice: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            Save Settings
          </button>
        </form>
      )}

      {/* TOURNAMENT ROOM ID & PASSWORD MODAL */}
      {showRoomModal && selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-xs animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">
                    Tournament Room Credentials
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                    {selectedTour.title} ({selectedTour.game})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRoomModal(false);
                  setRoomModalFeedback(null);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Publication Status Indicator */}
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-semibold">Publication Status:</span>
                {selectedTour.roomDetails?.released ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ PUBLISHED & LIVE
                  </span>
                ) : selectedTour.roomDetails?.roomId ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    ⏳ UNPUBLISHED DRAFT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                    NOT CONFIGURED
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                {selectedTour.roomDetails?.released
                  ? `Credentials are currently visible in "My Matches" to all ${selectedTour.registeredParticipants.length} registered participant(s).`
                  : `Credentials are currently hidden from participants. Click "Publish Room Details" when you are ready to reveal them.`}
              </p>
            </div>

            {/* Feedback Alert */}
            {roomModalFeedback && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-in fade-in ${
                  roomModalFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-600/60 text-rose-300'
                }`}
              >
                {roomModalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{roomModalFeedback.text}</span>
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-zinc-300 block mb-1 font-semibold text-[11px]">
                  Custom Room ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="e.g. 8492014"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-white font-mono text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1 font-semibold text-[11px]">
                  Custom Room Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={roomPassInput}
                  onChange={(e) => setRoomPassInput(e.target.value)}
                  placeholder="e.g. battle_squad_99"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-amber-500 rounded-xl text-white font-mono text-xs outline-none"
                  required
                />
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
                <span>Registered Players to Notify:</span>
                <span className="font-bold text-white font-mono">
                  {selectedTour.registeredParticipants.length} players
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
              <button
                type="button"
                disabled={roomModalSaving}
                onClick={() => handleSaveRoomDetails(true)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition cursor-pointer disabled:opacity-50"
              >
                {roomModalSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving & Notifying...
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Publish Room Details & Send Notifications</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={roomModalSaving}
                onClick={() => handleSaveRoomDetails(false)}
                className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <span>Save as Draft (Do Not Publish to Players Yet)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH RESULTS & CREDIT PRIZES MODAL */}
      {showResultsModal && selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handlePublishResults}
            className="w-full max-w-sm bg-[#0e1017] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-heading">
                Publish Results & Credit Winners
              </h3>
              <button type="button" onClick={() => setShowResultsModal(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-200">
              Submitting results marks tournament as COMPLETED and automatically credits the prize money to the winner's wallet ledger atomically.
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Champion Username</label>
              <input
                type="text"
                value={rank1User}
                onChange={(e) => setRank1User(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Champion In-Game IGN</label>
              <input
                type="text"
                value={rank1Ign}
                onChange={(e) => setRank1Ign(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 block mb-1">Total Kills</label>
                <input
                  type="number"
                  value={rank1Kills}
                  onChange={(e) => setRank1Kills(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Prize (₹)</label>
                <input
                  type="number"
                  value={rank1Prize}
                  onChange={(e) => setRank1Prize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider"
            >
              Confirm & Credit ₹{rank1Prize} to Winner
            </button>
          </form>
        </div>
      )}

      {/* CANCEL TOURNAMENT & AUTO REFUND MODAL */}
      {showCancelModal && selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleCancelTournament}
            className="w-full max-w-sm bg-[#0e1017] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-heading">
                Cancel Tournament & Auto-Refund
              </h3>
              <button type="button" onClick={() => setShowCancelModal(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-700/40 text-red-300">
              Warning: This will immediately cancel {selectedTour.title} and automatically refund 100% of entry fees back into the wallets of all {selectedTour.registeredParticipants.length} registered participants.
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Game server maintenance / Room glitch"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Confirm Cancellation & Issue Refunds
            </button>
          </form>
        </div>
      )}

      {/* CREATE NEW TOURNAMENT MODAL */}
      {showNewTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleCreateTournament}
            className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-heading">Create New Tournament</h3>
              <button type="button" onClick={() => setShowNewTourModal(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Tournament Title</label>
              <input
                type="text"
                value={newTourTitle}
                onChange={(e) => setNewTourTitle(e.target.value)}
                placeholder="e.g. BGMI Erangel Pro Cup #325"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 block mb-1">Game</label>
                <select
                  value={newTourGame}
                  onChange={(e) => setNewTourGame(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                >
                  <option value="BGMI">BGMI</option>
                  <option value="FREE FIRE MAX">Free Fire MAX</option>
                  <option value="BGMI TDM">BGMI TDM</option>
                  <option value="CALL OF DUTY">Call of Duty</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Mode</label>
                <select
                  value={newTourMode}
                  onChange={(e) => setNewTourMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                >
                  <option value="Squad">Squad</option>
                  <option value="Solo">Solo</option>
                  <option value="Duo">Duo</option>
                  <option value="1v1 TDM">1v1 TDM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-zinc-400 block mb-1">Entry Fee (₹)</label>
                <input
                  type="number"
                  value={newTourEntryRupees}
                  onChange={(e) => setNewTourEntryRupees(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Prize Pool (₹)</label>
                <input
                  type="number"
                  value={newTourPrizeRupees}
                  onChange={(e) => setNewTourPrizeRupees(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Slots</label>
                <input
                  type="number"
                  value={newTourSlots}
                  onChange={(e) => setNewTourSlots(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Map</label>
              <input
                type="text"
                value={newTourMap}
                onChange={(e) => setNewTourMap(e.target.value)}
                placeholder="Erangel / Miramar / Bermuda"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider"
            >
              Publish Tournament
            </button>
          </form>
        </div>
      )}

      {/* ADJUST WALLET MODAL */}
      {showAdjustModal && adjustTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleAdjustWallet}
            className="w-full max-w-sm bg-[#0e1017] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-heading">
                Adjust Wallet: {adjustTargetUser.username}
              </h3>
              <button type="button" onClick={() => setShowAdjustModal(false)} className="text-zinc-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">
                Amount in ₹ (Positive for credit, negative for debit)
              </label>
              <input
                type="number"
                value={adjustAmountRupees}
                onChange={(e) => setAdjustAmountRupees(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Mandatory Audit Reason</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Promotional compensation / Manual correction"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              Confirm Ledger Adjustment
            </button>
          </form>
        </div>
      )}

      {/* WITHDRAWAL ACTION CONFIRMATION MODAL */}
      {withdrawalAction && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    withdrawalAction === 'SUCCESSFUL'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : withdrawalAction === 'PROCESSING'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {withdrawalAction === 'SUCCESSFUL' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : withdrawalAction === 'PROCESSING' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-white font-heading">
                  {withdrawalAction === 'SUCCESSFUL'
                    ? 'Confirm Payout & Mark Successful'
                    : withdrawalAction === 'PROCESSING'
                    ? 'Move Request to Processing'
                    : 'Reject Request & Refund User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWithdrawalAction(null);
                  setSelectedWithdrawal(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Withdrawal Amount:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {formatPaise(selectedWithdrawal.amountPaise)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">User:</span>
                <span className="text-zinc-200 font-semibold">
                  {selectedWithdrawal.username}{' '}
                  <span className="text-[10px] text-zinc-500 font-mono">({selectedWithdrawal.userId})</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Destination UPI ID:</span>
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                  <span className="text-emerald-400 font-mono font-bold text-[11px]">
                    {selectedWithdrawal.payoutUpiId || selectedWithdrawal.upiId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedWithdrawal.payoutUpiId || selectedWithdrawal.upiId || '');
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="text-zinc-400 hover:text-white p-0.5"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                <span>Request ID: <span className="font-mono">{selectedWithdrawal.id}</span></span>
                <span>{formatDateTime(selectedWithdrawal.createdAt)}</span>
              </div>
            </div>

            {/* Action-specific inputs */}
            {withdrawalAction === 'SUCCESSFUL' && (
              <div className="space-y-3">
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-[11px] text-emerald-300">
                  <p className="font-bold mb-1">Genuine Payout Requirement:</p>
                  <p className="text-emerald-400/90 leading-relaxed text-[10px]">
                    Only mark as Successful after completing the real payout to <strong className="text-white">{selectedWithdrawal.payoutUpiId || selectedWithdrawal.upiId}</strong> via your bank/UPI app. You must enter the real bank UTR / Reference ID below.
                  </p>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold text-[11px]">
                    Bank / UPI Transaction Reference (UTR / Payout ID) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={withdrawalRefInput}
                    onChange={(e) => setWithdrawalRefInput(e.target.value)}
                    placeholder="e.g. UPI/402918291024 or PAYOUT-REF-892"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono text-xs focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Admin Notes (Optional)</label>
                  <input
                    type="text"
                    value={withdrawalNotesInput}
                    onChange={(e) => setWithdrawalNotesInput(e.target.value)}
                    placeholder="e.g. Paid via ICICI UPI Business"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white text-xs outline-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withdrawalConfirmCheck}
                    onChange={(e) => setWithdrawalConfirmCheck(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-[11px] text-zinc-300 leading-tight">
                    I confirm that the payout of <strong>{formatPaise(selectedWithdrawal.amountPaise)}</strong> was successfully transferred to <strong>{selectedWithdrawal.payoutUpiId || selectedWithdrawal.upiId}</strong> and recorded with reference ID.
                  </span>
                </label>
              </div>
            )}

            {withdrawalAction === 'REJECTED' && (
              <div className="space-y-3">
                <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 text-[11px] text-rose-300">
                  <p className="font-bold mb-1">Atomic Balance Refund:</p>
                  <p className="text-rose-400/90 leading-relaxed text-[10px]">
                    Rejecting will immediately refund <strong className="text-white">{formatPaise(selectedWithdrawal.amountPaise)}</strong> back into user <strong className="text-white">{selectedWithdrawal.username}</strong>'s wallet with an immutable refund ledger transaction.
                  </p>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold text-[11px]">
                    Rejection Reason (Visible to user) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={withdrawalNotesInput}
                    onChange={(e) => setWithdrawalNotesInput(e.target.value)}
                    placeholder="e.g. Invalid UPI ID / Account suspended / Daily limit exceeded"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white text-xs focus:border-rose-500 outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {withdrawalAction === 'PROCESSING' && (
              <div className="space-y-3">
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-[11px] text-blue-300">
                  <p className="font-bold mb-1">Payout Queue:</p>
                  <p className="text-blue-400/90 leading-relaxed text-[10px]">
                    This marks the withdrawal as under processing with your banking/UPI partner. The funds remain reserved, and the user will see status "Processing".
                  </p>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px]">Internal / Partner Note (Optional)</label>
                  <input
                    type="text"
                    value={withdrawalNotesInput}
                    onChange={(e) => setWithdrawalNotesInput(e.target.value)}
                    placeholder="e.g. Queued in payout batch #12"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {withdrawalActionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px]">
                {withdrawalActionError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={withdrawalSubmitting}
                onClick={() => {
                  setWithdrawalAction(null);
                  setSelectedWithdrawal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  withdrawalSubmitting ||
                  (withdrawalAction === 'SUCCESSFUL' && (!withdrawalRefInput.trim() || !withdrawalConfirmCheck)) ||
                  (withdrawalAction === 'REJECTED' && !withdrawalNotesInput.trim())
                }
                onClick={submitWithdrawalAction}
                className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-white transition ${
                  withdrawalAction === 'SUCCESSFUL'
                    ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40'
                    : withdrawalAction === 'PROCESSING'
                    ? 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40'
                    : 'bg-rose-600 hover:bg-rose-500 disabled:opacity-40'
                }`}
              >
                {withdrawalSubmitting ? 'Updating...' : `Confirm ${withdrawalAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Action Confirmation Modal (Approve / Reject) */}
      {depositConfirmAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                depositConfirmAction.action === 'SUCCESSFUL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {depositConfirmAction.action === 'SUCCESSFUL' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  {depositConfirmAction.action === 'SUCCESSFUL' ? 'Confirm Approve Deposit' : 'Confirm Reject Deposit'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Request: <span className="font-mono text-white">{depositConfirmAction.id}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Player:</span>
                <span className="font-bold text-white">{depositConfirmAction.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Deposit Amount:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatPaise(depositConfirmAction.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Action:</span>
                <span className={`font-bold uppercase tracking-wider text-[11px] ${
                  depositConfirmAction.action === 'SUCCESSFUL' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {depositConfirmAction.action === 'SUCCESSFUL' ? 'Verify & Credit Wallet' : 'Reject Request'}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {depositConfirmAction.action === 'SUCCESSFUL'
                ? `Are you sure you have received ${formatPaise(depositConfirmAction.amount)} in your merchant UPI account? Approving will permanently credit the player's wallet.`
                : `Are you sure you want to decline this deposit request of ${formatPaise(depositConfirmAction.amount)}? The player's balance will not be credited.`
              }
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDepositConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDeposit(depositConfirmAction.id, depositConfirmAction.action)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition ${
                  depositConfirmAction.action === 'SUCCESSFUL'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50'
                }`}
              >
                Confirm {depositConfirmAction.action === 'SUCCESSFUL' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Details Modal */}
      {selectedDepositDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Deposit Request Details</h3>
                  <p className="text-[11px] font-mono text-zinc-400">Order #{selectedDepositDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepositDetails(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-0.5">Amount</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {formatPaise(selectedDepositDetails.amountPaise)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-0.5">Current Status</span>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    selectedDepositDetails.status === 'SUCCESSFUL'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : selectedDepositDetails.status === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-400'
                      : selectedDepositDetails.status === 'EXPIRED'
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {selectedDepositDetails.status}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Gamer Username:</span>
                  <span className="font-bold text-white">{selectedDepositDetails.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">User ID:</span>
                  <span className="font-mono text-zinc-300">{selectedDepositDetails.userId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Merchant UPI ID:</span>
                  <span className="font-mono text-amber-300 font-semibold">{selectedDepositDetails.merchantUpiId || settings?.merchantUpiId || 'merchant@upi'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">UTR / Transaction Ref:</span>
                  <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                    {selectedDepositDetails.utr || 'Not submitted by user'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Gateway Order Ref:</span>
                  <span className="font-mono text-zinc-400">{selectedDepositDetails.providerRef || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Requested At:</span>
                  <span className="font-mono text-zinc-300">{formatDateTime(selectedDepositDetails.createdAt)}</span>
                </div>
                {selectedDepositDetails.expiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Payment Window Expiration:</span>
                    <span className="font-mono text-zinc-300">{formatDateTime(selectedDepositDetails.expiresAt)}</span>
                  </div>
                )}
                {selectedDepositDetails.verificationNotes && (
                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                    <span className="text-zinc-500 font-bold block mb-0.5">Audit Note:</span>
                    {selectedDepositDetails.verificationNotes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDepositDetails(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Close
              </button>

              {selectedDepositDetails.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const dep = selectedDepositDetails;
                      setSelectedDepositDetails(null);
                      setDepositConfirmAction({
                        id: dep.id,
                        action: 'SUCCESSFUL',
                        amount: dep.amountPaise,
                        username: dep.username
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dep = selectedDepositDetails;
                      setSelectedDepositDetails(null);
                      setDepositConfirmAction({
                        id: dep.id,
                        action: 'REJECTED',
                        amount: dep.amountPaise,
                        username: dep.username
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ban User Confirmation Modal */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleExecuteBan}
            className="bg-[#0e1017] border border-rose-600/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl shadow-rose-950/50 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Suspend Gamer Account</h3>
                <p className="text-xs text-zinc-400">
                  Target: <strong className="text-white">{banTargetUser.username}</strong> ({banTargetUser.id})
                </p>
              </div>
            </div>

            {banError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{banError}</span>
              </div>
            )}

            {/* Target Summary Card */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-zinc-500 text-[10px] block uppercase font-bold">Registration Date</span>
                <span className="text-zinc-300 font-mono text-[11px]">{formatDateTime(banTargetUser.createdAt)}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block uppercase font-bold">Preserved Balance</span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">{formatPaise(banTargetUser.walletBalancePaise)}</span>
              </div>
            </div>

            {/* Ban Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">Suspension Duration Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBanTypeInput('TEMPORARY')}
                  className={`p-3 rounded-xl border text-left transition ${
                    banTypeInput === 'TEMPORARY'
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Temporary Ban</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Auto-restores access after the specified time expires.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBanTypeInput('PERMANENT')}
                  className={`p-3 rounded-xl border text-left transition ${
                    banTypeInput === 'PERMANENT'
                      ? 'bg-rose-500/10 border-rose-500/60 text-white shadow-sm ring-1 ring-rose-500/30'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Permanent Ban</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Indefinite suspension until manual administrator unban.
                  </p>
                </button>
              </div>
            </div>

            {/* If Temporary: Duration Selection */}
            {banTypeInput === 'TEMPORARY' && (
              <div className="space-y-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">Select Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { hours: 1, label: '1 Hour' },
                    { hours: 24, label: '24 Hours (1 Day)' },
                    { hours: 168, label: '7 Days' },
                    { hours: 720, label: '30 Days' },
                    { hours: 0, label: 'Custom' },
                  ].map((preset) => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => setBanDurationPreset(preset.hours)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        banDurationPreset === preset.hours
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {banDurationPreset === 0 && (
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={8760}
                      value={banCustomDurationHours}
                      onChange={(e) => setBanCustomDurationHours(Math.max(1, Number(e.target.value) || 1))}
                      className="w-28 px-3 py-1.5 bg-zinc-950 border border-zinc-750 rounded-lg text-white text-xs font-mono"
                    />
                    <span className="text-xs text-zinc-400">hours from now</span>
                  </div>
                )}

                <p className="text-[11px] text-amber-300/80 pt-1">
                  Will auto-expire on: <strong className="text-white font-mono">{new Date(Date.now() + (banDurationPreset === 0 ? banCustomDurationHours : banDurationPreset) * 3600000).toLocaleString()}</strong>
                </p>
              </div>
            )}

            {/* Mandatory Ban Reason */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Suspension Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="e.g. Teaming in Solo BGMI match #302 / Use of emulator / Abusive behavior in support desk"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none resize-none"
                required
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                This reason will be visible to the user in their suspension screen and saved in the immutable audit log.
              </p>
            </div>

            {/* Preservation Notice */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850 text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-zinc-300 font-semibold block mb-0.5">Data Preservation Guarantee:</strong>
              Enforcing this ban will immediately block login and active session actions. The user's account, profile, match history, and wallet balance of {formatPaise(banTargetUser.walletBalancePaise)} remain preserved in the database.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={banSubmitting}
                onClick={() => setBanTargetUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={banSubmitting || !banReasonInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{banSubmitting ? 'Enforcing...' : 'Confirm Ban'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unban User Confirmation Modal */}
      {unbanTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteUnban}
            className="bg-[#0e1017] border border-emerald-600/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl shadow-emerald-950/50 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Lift Account Suspension</h3>
                <p className="text-xs text-zinc-400">
                  Target: <strong className="text-white">{unbanTargetUser.username}</strong> ({unbanTargetUser.id})
                </p>
              </div>
            </div>

            {unbanError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-300 text-xs">
                {unbanError}
              </div>
            )}

            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Status:</span>
                <span className="font-bold text-rose-400">BANNED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Preserved Balance:</span>
                <span className="font-mono font-bold text-emerald-400">{formatPaise(unbanTargetUser.walletBalancePaise)}</span>
              </div>
              {unbanTargetUser.banReason && (
                <div className="pt-2 border-t border-zinc-850 text-[11px]">
                  <span className="text-zinc-500 block">Original Ban Reason:</span>
                  <span className="text-zinc-300 italic">{unbanTargetUser.banReason}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Unban Note / Audit Reason (Optional)
              </label>
              <input
                type="text"
                value={unbanReasonInput}
                onChange={(e) => setUnbanReasonInput(e.target.value)}
                placeholder="e.g. Appeal reviewed and approved / first warning served"
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-emerald-500 rounded-xl text-white text-xs outline-none"
              />
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Unbanning will immediately restore ACTIVE status. The user will be able to log in with their existing credentials, and their preserved balance of {formatPaise(unbanTargetUser.walletBalancePaise)} and history will be fully accessible.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={unbanSubmitting}
                onClick={() => setUnbanTargetUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={unbanSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{unbanSubmitting ? 'Restoring...' : 'Confirm Unban'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APK Guide Modal */}
      <ApkGuideModal isOpen={showApkGuide} onClose={() => setShowApkGuide(false)} />
    </div>
  );
};
