import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { UserNotificationSettings } from '../../types/index.ts';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playAlertChime,
  triggerHapticFeedback,
} from '../../utils/browserNotifications.ts';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Smartphone,
  Key,
  Wallet,
  Trophy,
  ShieldCheck,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';

interface PushNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushNotificationSettingsModal: React.FC<PushNotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserNotificationSettings>({
    pushEnabled: true,
    notifyRoomDetails: true,
    notifyWithdrawalUpdates: true,
    notifyTournamentStart: true,
    soundEnabled: true,
    vibrateEnabled: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificationSettings();
      setSettings(res.settings);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setPermission(getBrowserNotificationPermission());
      setFeedback(null);
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    const updated = getBrowserNotificationPermission();
    setPermission(updated);
    if (granted) {
      setFeedback({ type: 'success', text: 'Browser push notifications successfully enabled!' });
    } else {
      setFeedback({
        type: 'error',
        text: 'Notification permission was not granted. Please allow notifications in your browser settings.',
      });
    }
  };

  const handleToggle = async (key: keyof UserNotificationSettings) => {
    const nextSettings = { ...settings, [key]: !settings[key] };
    setSettings(nextSettings);
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateNotificationSettings(nextSettings);
      setSettings(res.settings);
      setFeedback({ type: 'success', text: 'Notification preferences saved.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestSending(true);
    setFeedback(null);
    try {
      if (settings.soundEnabled) playAlertChime();
      if (settings.vibrateEnabled) triggerHapticFeedback([200, 100, 200]);

      const res = await api.sendTestPushNotification();
      setFeedback({
        type: 'success',
        text: res.message || 'Test push alert dispatched successfully!',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to dispatch test alert.' });
    } finally {
      setTestSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e1017] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-heading tracking-wide">
                  Mobile Push Notifications
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  Settings
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Manage alerts for room credentials, match start countdowns, and payouts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-600/60 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-600/60 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Permission Status Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  permission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : permission === 'denied'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {permission === 'granted' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Device Notification Status</span>
                <span
                  className={`font-bold block text-xs ${
                    permission === 'granted'
                      ? 'text-emerald-400'
                      : permission === 'denied'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                >
                  {permission === 'granted'
                    ? '✓ Push Permission Active'
                    : permission === 'denied'
                    ? '✕ Blocked in Browser Settings'
                    : 'Permission Not Requested Yet'}
                </span>
              </div>
            </div>

            {permission !== 'granted' && isBrowserNotificationSupported() && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                Allow Alerts
              </button>
            )}
          </div>

          {/* Master Push Toggle */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-white text-sm">Master Push Notifications</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Turn off to mute all background push alerts while preserving in-app notifications
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('pushEnabled')}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.pushEnabled ? 'bg-rose-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.pushEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Alert Channels Section */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Alert Channels (Customizable)
            </h3>

            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden">
              {/* Channel 1: Room Details Published */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Room ID & Password Releases</span>
                    <span className="text-[11px] text-zinc-400">
                      Alert immediately when room credentials for your joined tournament are published or updated
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('notifyRoomDetails')}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.notifyRoomDetails && settings.pushEnabled
                      ? 'bg-rose-600'
                      : 'bg-zinc-800 opacity-60'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.notifyRoomDetails && settings.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Channel 2: Withdrawal Status Updates */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Withdrawal Status Updates</span>
                    <span className="text-[11px] text-zinc-400">
                      Alert when your payout is marked Processing, Confirmed via UPI/IMPS, or Refunded
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('notifyWithdrawalUpdates')}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.notifyWithdrawalUpdates && settings.pushEnabled
                      ? 'bg-emerald-600'
                      : 'bg-zinc-800 opacity-60'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.notifyWithdrawalUpdates && settings.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Channel 3: Tournament 15m Match Start Alerts */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Tournament 15m Start Countdown</span>
                    <span className="text-[11px] text-zinc-400">
                      Alert 15 minutes before your scheduled tournament match begins so you never miss a match
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('notifyTournamentStart')}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.notifyTournamentStart && settings.pushEnabled
                      ? 'bg-amber-500'
                      : 'bg-zinc-800 opacity-60'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.notifyTournamentStart && settings.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sound & Haptics Preferences */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Audio & Haptic Feedback
            </h3>

            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden">
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-white block">Alert Sound Chime</span>
                    <span className="text-[11px] text-zinc-400">
                      Play acoustic tournament chime on incoming notification
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!settings.soundEnabled) playAlertChime();
                    handleToggle('soundEnabled');
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.soundEnabled ? 'bg-cyan-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Mobile Haptic Vibration</span>
                    <span className="text-[11px] text-zinc-400">
                      Vibrate phone when a critical tournament or payout notification arrives
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!settings.vibrateEnabled) triggerHapticFeedback([100, 50, 100]);
                    handleToggle('vibrateEnabled');
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    settings.vibrateEnabled ? 'bg-purple-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.vibrateEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Test Alert Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testSending}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {testSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Dispatching Test Push Alert...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-rose-400" />
                  <span>Send Live Test Push Alert to Device</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile OS PWA Information */}
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-850 text-zinc-400 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-zinc-300">
              <Info className="w-3.5 h-3.5 text-rose-400" />
              <span>Mobile User Push Notification Guide</span>
            </div>
            <p className="leading-relaxed">
              • <strong>Android Devices:</strong> Chrome natively supports background web push alerts once permission is granted above.
            </p>
            <p className="leading-relaxed">
              • <strong>iOS (iPhone/iPad):</strong> Tap the Safari Share button and choose <em>"Add to Home Screen"</em> to enable Web Push alerts.
            </p>
            <p className="leading-relaxed text-zinc-500">
              • <strong>Security Guarantee:</strong> Room credentials are encrypted and only sent to users with confirmed registrations for that match.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            {saving ? 'Saving changes...' : 'Settings saved to cloud'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
