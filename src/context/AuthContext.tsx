import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, UserNotificationSettings, InAppPushAlert } from '../types/index.ts';
import { api, getStoredToken, setStoredToken } from '../services/api.ts';
import {
  triggerBrowserNotification,
  registerServiceWorker,
  playAlertChime,
  triggerHapticFeedback,
} from '../utils/browserNotifications.ts';

export interface BannedAccountInfo {
  isBanned: boolean;
  status?: string;
  reason?: string;
  banType?: string;
  expiresAt?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  bannedInfo: BannedAccountInfo | null;
  setBannedInfo: (info: BannedAccountInfo | null) => void;
  login: (email: string, pass: string, expectedRole?: 'admin' | 'user') => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  quickSwitchUser: (email: string, pass: string) => Promise<void>;
  activeTab: 'home' | 'tournaments' | 'matches' | 'wallet' | 'profile' | 'admin';
  setActiveTab: (tab: 'home' | 'tournaments' | 'matches' | 'wallet' | 'profile' | 'admin') => void;
  openAddCashModal: boolean;
  setOpenAddCashModal: (open: boolean) => void;
  openWithdrawModal: boolean;
  setOpenWithdrawModal: (open: boolean) => void;
  openSupportModal: boolean;
  setOpenSupportModal: (open: boolean) => void;
  openNotificationSettingsModal: boolean;
  setOpenNotificationSettingsModal: (open: boolean) => void;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
  notificationSettings: UserNotificationSettings | null;
  updateNotificationSettings: (settings: Partial<UserNotificationSettings>) => Promise<void>;
  activePushAlert: InAppPushAlert | null;
  dismissPushAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [bannedInfo, setBannedInfo] = useState<BannedAccountInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'tournaments' | 'matches' | 'wallet' | 'profile' | 'admin'>('home');
  const [openAddCashModal, setOpenAddCashModal] = useState(false);
  const [openWithdrawModal, setOpenWithdrawModal] = useState(false);
  const [openSupportModal, setOpenSupportModal] = useState(false);
  const [openNotificationSettingsModal, setOpenNotificationSettingsModal] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<UserNotificationSettings | null>(null);
  const [activePushAlert, setActivePushAlert] = useState<InAppPushAlert | null>(null);

  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  // Register service worker for mobile Web Push and deep linking
  useEffect(() => {
    registerServiceWorker((targetTab) => {
      if (['home', 'tournaments', 'matches', 'wallet', 'profile', 'admin'].includes(targetTab)) {
        setActiveTab(targetTab as any);
      }
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setNotificationSettings(res.user.notificationSettings || null);
      setBannedInfo(null);
    } catch (err: any) {
      if (err.code === 'ACCOUNT_BANNED' || err.status === 403) {
        setBannedInfo({
          isBanned: true,
          status: err.banInfo?.status,
          reason: err.banInfo?.reason || err.message,
          banType: err.banInfo?.banType,
          expiresAt: err.banInfo?.expiresAt,
        });
      }
      setUser(null);
      setStoredToken(null);
      setToken(null);
    }
  }, []);

  const updateNotificationSettings = async (newSettings: Partial<UserNotificationSettings>) => {
    try {
      const res = await api.updateNotificationSettings(newSettings);
      setNotificationSettings(res.settings);
      if (user) {
        setUser({ ...user, notificationSettings: res.settings });
      }
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      throw err;
    }
  };

  const dismissPushAlert = () => {
    setActivePushAlert(null);
  };

  const fetchUnreadNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.getNotifications();
      const unread = res.notifications.filter((n) => !n.read);
      setUnreadNotificationsCount(unread.length);

      // Check current user notification preferences
      const prefs = user?.notificationSettings || notificationSettings || {
        pushEnabled: true,
        notifyRoomDetails: true,
        notifyWithdrawalUpdates: true,
        notifyTournamentStart: true,
        soundEnabled: true,
        vibrateEnabled: true,
      };

      // Trigger alerts for newly arrived notifications respecting channel preferences
      for (const notif of unread) {
        if (!seenNotifIdsRef.current.has(notif.id)) {
          seenNotifIdsRef.current.add(notif.id);

          // Verify channel preference
          let shouldAlert = prefs.pushEnabled !== false;
          if (notif.type === 'ROOM' && prefs.notifyRoomDetails === false) {
            shouldAlert = false;
          } else if (notif.type === 'WALLET' && prefs.notifyWithdrawalUpdates === false) {
            shouldAlert = false;
          } else if (notif.type === 'MATCH' && prefs.notifyTournamentStart === false) {
            shouldAlert = false;
          }

          if (shouldAlert) {
            // 1. Native Mobile / Web Push Notification
            triggerBrowserNotification(
              notif.title,
              notif.message,
              () => {
                if (notif.linkTab) setActiveTab(notif.linkTab as any);
              },
              {
                linkTab: notif.linkTab,
                tag: notif.id,
                sound: false, // Handled unified below
                vibrate: false, // Handled unified below
              }
            );

            // 2. Play acoustic chime if enabled
            if (prefs.soundEnabled !== false) {
              playAlertChime();
            }

            // 3. Trigger haptic vibration on mobile phones
            if (prefs.vibrateEnabled !== false) {
              triggerHapticFeedback([180, 80, 180]);
            }

            // 4. Pop High-Fidelity In-App Push Banner
            setActivePushAlert({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              linkTab: notif.linkTab,
              timestamp: notif.createdAt,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }, [token, user, notificationSettings]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const existingToken = getStoredToken();
      if (existingToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setNotificationSettings(res.user.notificationSettings || null);
          setToken(existingToken);
          setBannedInfo(null);
          if (res.user.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('home');
          }
        } catch (err: any) {
          if (err.code === 'ACCOUNT_BANNED' || err.status === 403) {
            setBannedInfo({
              isBanned: true,
              status: err.banInfo?.status,
              reason: err.banInfo?.reason || err.message,
              banType: err.banInfo?.banType,
              expiresAt: err.banInfo?.expiresAt,
            });
          }
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (user && token) {
      fetchUnreadNotifs();
      const interval = setInterval(fetchUnreadNotifs, 10000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchUnreadNotifs]);

  const login = async (identifier: string, pass: string, expectedRole?: 'admin' | 'user') => {
    setIsLoading(true);
    try {
      const res = await api.login({ email: identifier, password: pass, expectedRole });
      setUser(res.user);
      setNotificationSettings(res.user.notificationSettings || null);
      setToken(res.token);
      setBannedInfo(null);
      if (res.user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('home');
      }
      await fetchUnreadNotifs();
    } catch (err: any) {
      if (err.code === 'ACCOUNT_BANNED' || err.status === 403) {
        setBannedInfo({
          isBanned: true,
          status: err.banInfo?.status,
          reason: err.banInfo?.reason || err.message,
          banType: err.banInfo?.banType,
          expiresAt: err.banInfo?.expiresAt,
        });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      setNotificationSettings(res.user.notificationSettings || null);
      setToken(res.token);
      setActiveTab('home');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (email: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.googleLogin({ email, name });
      setUser(res.user);
      setNotificationSettings(res.user.notificationSettings || null);
      setToken(res.token);
      setActiveTab('home');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setStoredToken(null);
      setToken(null);
      setBannedInfo(null);
      setNotificationSettings(null);
      setActivePushAlert(null);
      setActiveTab('home');
      setIsLoading(false);
    }
  };

  const quickSwitchUser = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
      setNotificationSettings(res.user.notificationSettings || null);
      setToken(res.token);
      setBannedInfo(null);
      if (res.user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('home');
      }
      await fetchUnreadNotifs();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        bannedInfo,
        setBannedInfo,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
        quickSwitchUser,
        activeTab,
        setActiveTab,
        openAddCashModal,
        setOpenAddCashModal,
        openWithdrawModal,
        setOpenWithdrawModal,
        openSupportModal,
        setOpenSupportModal,
        openNotificationSettingsModal,
        setOpenNotificationSettingsModal,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
        selectedTournamentId,
        setSelectedTournamentId,
        notificationSettings,
        updateNotificationSettings,
        activePushAlert,
        dismissPushAlert,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
