import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { formatPaise } from '../utils/formatters.ts';
import {
  User,
  Shield,
  KeyRound,
  LogOut,
  LifeBuoy,
  Edit2,
  Check,
  AlertTriangle,
  Smartphone,
  Lock,
  Gamepad2,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { ApkGuideModal } from '../components/modals/ApkGuideModal.tsx';

export const ProfileScreen: React.FC = () => {
  const { user, refreshUser, logout, setOpenSupportModal, quickSwitchUser, setOpenNotificationSettingsModal } = useAuth();

  // Profile edit
  const [isEditing, setIsEditing] = useState(false);
  const [bgmiIgn, setBgmiIgn] = useState(user?.bgmiIgn || '');
  const [bgmiUid, setBgmiUid] = useState(user?.bgmiUid || '');
  const [freeFireIgn, setFreeFireIgn] = useState(user?.freeFireIgn || '');
  const [freeFireUid, setFreeFireUid] = useState(user?.freeFireUid || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // APK Guide Modal
  const [showApkGuide, setShowApkGuide] = useState(false);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      await api.updateProfile({
        bgmiIgn,
        bgmiUid,
        freeFireIgn,
        freeFireUid,
        upiId,
        phone,
      });
      await refreshUser();
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ oldPassword, newPassword });
      setPasswordSuccess(res.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto px-3.5 pt-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-heading tracking-wide">
            Player Profile & Settings
          </h1>
          <p className="text-xs text-zinc-400">
            Game identifiers, payout UPI credentials, and security
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Game credentials updated successfully!</span>
        </div>
      )}

      {/* Gamer Profile Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Gamer'}
              alt={user?.username}
              className="w-14 h-14 rounded-2xl object-cover bg-zinc-800 border-2 border-rose-500/40 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                  {user?.username}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user?.role === 'admin'
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-rose-600 text-white shadow'
                  }`}
                >
                  {user?.role === 'admin' ? '🛡️ Super Admin' : '🎮 Verified Gamer'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
              <p className="text-[11px] text-zinc-500 font-mono">ID: {user?.id}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? 'Cancel' : 'Edit Credentials'}
          </button>
        </div>

        {/* Editable In-Game IDs */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="pt-3 border-t border-zinc-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">BGMI In-Game Name (IGN)</label>
                <input
                  type="text"
                  value={bgmiIgn}
                  onChange={(e) => setBgmiIgn(e.target.value)}
                  placeholder="e.g. TX・RAHUL⚡"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">BGMI Numeric UID</label>
                <input
                  type="text"
                  value={bgmiUid}
                  onChange={(e) => setBgmiUid(e.target.value)}
                  placeholder="e.g. 5129482103"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Free Fire Character IGN</label>
                <input
                  type="text"
                  value={freeFireIgn}
                  onChange={(e) => setFreeFireIgn(e.target.value)}
                  placeholder="e.g. RAHUL_FF_BOSS"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Free Fire Numeric UID</label>
                <input
                  type="text"
                  value={freeFireUid}
                  onChange={(e) => setFreeFireUid(e.target.value)}
                  placeholder="e.g. 884920192"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Saved Payout UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@oksbi"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">WhatsApp / Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Game Credentials
            </button>
          </form>
        ) : (
          <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                BGMI IGN & UID
              </span>
              <span className="font-bold text-white block mt-0.5 truncate">
                {user?.bgmiIgn || 'Not set'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {user?.bgmiUid || 'No UID'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                Free Fire IGN & UID
              </span>
              <span className="font-bold text-white block mt-0.5 truncate">
                {user?.freeFireIgn || 'Not set'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {user?.freeFireUid || 'No UID'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                Payout UPI ID
              </span>
              <span className="font-bold text-emerald-400 block mt-0.5 truncate font-mono">
                {user?.upiId || 'Not set'}
              </span>
              <span className="text-[10px] text-zinc-500">Verified for withdrawals</span>
            </div>
          </div>
        )}
      </div>

      {/* Account Settings & Quick Shortcuts */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Security & Actions
        </h3>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden text-xs">
          {/* Mobile Push Notification Settings */}
          <button
            onClick={() => setOpenNotificationSettingsModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white block">Mobile Push Notifications & Alerts</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                    Channels
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Room ID releases, 15m match start countdowns, payout status
                </span>
              </div>
            </div>
            <span className="text-rose-400 font-bold">Configure →</span>
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-bold text-white block">Change Password</span>
                <span className="text-[11px] text-zinc-400">Update your account login password</span>
              </div>
            </div>
            <span className="text-zinc-500">→</span>
          </button>

          <button
            onClick={() => setOpenSupportModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-bold text-white block">Customer Support & Helpdesk</span>
                <span className="text-[11px] text-zinc-400">Raise tickets for room credentials or withdrawals</span>
              </div>
            </div>
            <span className="text-zinc-500">→</span>
          </button>

          <button
            onClick={() => setShowApkGuide(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-850 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-white block">Android APK & Capacitor Build Info</span>
                <span className="text-[11px] text-zinc-400">Package com.battleesports.tournament details</span>
              </div>
            </div>
            <span className="text-emerald-400 font-bold">Guide →</span>
          </button>
        </div>
      </div>

      {/* Fast Demo Account Switcher */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
        <span className="text-xs font-bold text-white block">
          🧪 Quick Demo Account Switcher (For Evaluation)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => quickSwitchUser('rahul@gamer.com', 'gamer123')}
            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-rose-500 text-left transition-all"
          >
            <span className="font-bold text-rose-400 text-xs block">RahulPro (Player)</span>
            <span className="text-[10px] text-zinc-400">Balance: ₹350 • Joined Matches</span>
          </button>

          <button
            onClick={() => quickSwitchUser('vicky@gamer.com', 'gamer123')}
            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500 text-left transition-all"
          >
            <span className="font-bold text-amber-400 text-xs block">VickySniper (Player 2)</span>
            <span className="text-[10px] text-zinc-400">Balance: ₹120 • Pending Deposit</span>
          </button>

          <button
            onClick={() => quickSwitchUser('admin@battleesports.com', 'admin123')}
            className="p-2.5 rounded-xl bg-zinc-950 border border-amber-600/50 hover:border-amber-400 text-left transition-all"
          >
            <span className="font-bold text-amber-400 text-xs block">BattleAdmin (Super Admin)</span>
            <span className="text-[10px] text-zinc-400">Full tournament & ledger control</span>
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full py-3 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" /> Logout from Session
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0e1017] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Confirm Account Logout
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Are you sure you want to log out of <strong>{user?.username}</strong>?
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-left text-[11px] text-zinc-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Permanent Gamer ID:</span>
                <span className="font-mono text-zinc-300 font-semibold">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Wallet Balance:</span>
                <span className="font-mono text-emerald-400 font-bold">{formatPaise(user?.walletBalancePaise || 0)}</span>
              </div>
              <p className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800 mt-1">
                ✓ All balance, tournament history, and match records remain securely saved in the database.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-rose-950/40"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0e1017] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-heading">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-2 rounded bg-red-950/50 border border-red-700 text-red-300 text-xs">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2 rounded bg-emerald-950/50 border border-emerald-600 text-emerald-300 text-xs">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-2.5 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">New Password (min 6 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 rounded-lg text-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold mt-2 shadow"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APK Guide Modal */}
      <ApkGuideModal isOpen={showApkGuide} onClose={() => setShowApkGuide(false)} />
    </div>
  );
};
