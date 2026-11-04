import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { NotificationItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDateTime } from '../../utils/formatters.ts';
import { X, Bell, Check, ShieldAlert, Sparkles, Key, Wallet, Trophy, CheckCircle2, Settings } from 'lucide-react';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../../utils/browserNotifications.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { setActiveTab, setUnreadNotificationsCount, setOpenNotificationSettingsModal } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      const unread = res.notifications.filter((n) => !n.read).length;
      setUnreadNotificationsCount(unread);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
      setPushStatus(getBrowserNotificationPermission());
    }
  }, [isOpen]);

  const handleEnablePush = async () => {
    const granted = await requestBrowserNotificationPermission();
    setPushStatus(granted ? 'granted' : getBrowserNotificationPermission());
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleItemClick = (notif: NotificationItem) => {
    handleMarkRead(notif.id);
    if (notif.linkTab) {
      setActiveTab(notif.linkTab as any);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm h-full bg-[#0d0f17] border-l border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-500 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Notifications</h2>
              <p className="text-xs text-zinc-400">Match alerts & room credentials</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                setOpenNotificationSettingsModal(true);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
              title="Notification Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Push Notification Permission & Settings Quick Bar */}
        {isBrowserNotificationSupported() && (
          <div className="px-3 py-2 bg-zinc-950/80 border-b border-zinc-850 flex items-center justify-between text-[11px]">
            {pushStatus === 'granted' ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Push Alerts Active
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setOpenNotificationSettingsModal(true);
                  }}
                  className="text-zinc-400 hover:text-rose-400 underline cursor-pointer"
                >
                  Configure Channels
                </button>
              </div>
            ) : pushStatus === 'denied' ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-zinc-500">Push blocked in browser</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setOpenNotificationSettingsModal(true);
                  }}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Settings Guide
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="flex-1 py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Bell className="w-3 h-3" />
                  <span>Enable Push Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setOpenNotificationSettingsModal(true);
                  }}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  title="Configure alert channels"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRoom = notif.type === 'ROOM';
              const isWallet = notif.type === 'WALLET';
              const isMatch = notif.type === 'MATCH';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    notif.read
                      ? 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/80'
                      : isRoom
                      ? 'bg-rose-950/25 border-rose-600/40 hover:bg-rose-950/40 shadow-sm'
                      : 'bg-zinc-900/90 border-zinc-750 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isRoom
                          ? 'bg-rose-600 text-white'
                          : isWallet
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : isMatch
                          ? 'bg-amber-600/20 text-amber-400'
                          : 'bg-blue-600/20 text-blue-400'
                      }`}
                    >
                      {isRoom ? (
                        <Key className="w-3.5 h-3.5" />
                      ) : isWallet ? (
                        <Wallet className="w-3.5 h-3.5" />
                      ) : isMatch ? (
                        <Trophy className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-bold text-white truncate">{notif.title}</h3>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed line-clamp-3">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/50 text-[10px] text-zinc-500">
                        <span>{formatDateTime(notif.createdAt)}</span>
                        {notif.linkTab && (
                          <span className="text-rose-400 font-medium">Tap to view →</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
