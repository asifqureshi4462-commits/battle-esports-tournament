import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, UserNotificationSettings, InAppPushAlert } from '../types/index.ts';
import { api, setStoredToken } from '../services/api.ts';
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

// ---------------------------------------------------------------------------
// TEMPORARY FRONTEND-ONLY LOGIN (testing mode)
// No backend, no Firebase, no internet needed. Any non-empty username/email and
// password is accepted. The session is kept in localStorage.
// To go back to real authentication later, restore the api.login()/api.getMe()
// calls in this file.
// ---------------------------------------------------------------------------
const LOCAL_SESSION_KEY = 'battle_esports_local_session';

function readLocalSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.username === 'string' ? (parsed as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveLocalSession(user: UserProfile) {
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable - session simply will not persist
  }
}

function clearLocalSession() {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    // ignore
  }
}

function buildLocalUser(identifier: string, role: 'user' | 'admin' = 'user'): UserProfile {
  const id = identifier.trim();
  const isEmail = id.includes('@');
  const username = isEmail ? id.split('@')[0] || id : id;
  return {
    id: 'local_' + username.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    username,
    email: isEmail ? id : `${username}@local.test`,
    phone: '',
    role,
    avatar: '',
    walletBalancePaise: 0,
    coins: 0,
    accountStatus: 'ACTIVE' as any,
    createdAt: new Date().toISOString(),
  };
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  bannedInfo: BannedAccountInfo | null;
  setBannedInfo: (info: BannedAccountInfo | null) => void;
  login: (email: string, pass: string, expectedRole?: 'admin' | 'user') => Promise<void>;
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
  // Token stays null in local testing mode (no backend session).
  const [token, setToken] = useState<string | null>(null);
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
    const saved = readLocalSession();
    if (saved) {
      setUser(saved);
      setNotificationSettings(saved.notificationSettings || null);
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
    // Restore the temporary login session after refresh (no network call).
    const saved = readLocalSession();
    if (saved) {
      setUser(saved);
      setNotificationSettings(saved.notificationSettings || null);
      setActiveTab(saved.role === 'admin' ? 'admin' : 'home');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user && token) {
      fetchUnreadNotifs();
      const interval = setInterval(fetchUnreadNotifs, 10000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchUnreadNotifs]);

  const startLocalSession = (identifier: string, role: 'user' | 'admin') => {
    const localUser = buildLocalUser(identifier, role);
    saveLocalSession(localUser);
    setUser(localUser);
    setNotificationSettings(null);
    setBannedInfo(null);
    setActiveTab(role === 'admin' ? 'admin' : 'home');
  };

  const login = async (identifier: string, pass: string, _expectedRole?: 'admin' | 'user') => {
    if (!identifier.trim()) throw new Error('Please enter your username or email');
    if (!pass) throw new Error('Please enter your password');
    startLocalSession(identifier, 'user');
  };

  const logout = async () => {
    clearLocalSession();
    setStoredToken(null);
    setUser(null);
    setToken(null);
    setBannedInfo(null);
    setNotificationSettings(null);
    setActivePushAlert(null);
    setActiveTab('home');
  };

  // Used by the Profile screen "quick switch" test buttons.
  const quickSwitchUser = async (email: string, _pass: string) => {
    startLocalSession(email, email.toLowerCase().startsWith('admin') ? 'admin' : 'user');
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
