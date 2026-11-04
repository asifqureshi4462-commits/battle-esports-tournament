/**
 * Browser Web Push & Notification API helper for desktop and mobile devices.
 * Integrates native Service Worker push dispatch, synthetic Web Audio chimes, and haptic vibration.
 */

let swRegistration: ServiceWorkerRegistration | null = null;

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function isPushManagerSupported(): boolean {
  return typeof window !== 'undefined' && 'PushManager' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register Service Worker for mobile Web Push and offline notifications
 */
export async function registerServiceWorker(onNavigate?: (tab: string) => void): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;

    // Listen for navigation requests triggered from notification clicks
    if (onNavigate) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE_TAB' && event.data.tab) {
          onNavigate(event.data.tab);
        }
      });
    }

    return reg;
  } catch (err) {
    console.warn('[BATTLE ESPORTS] Service worker registration error:', err);
    return null;
  }
}

/**
 * Request notification permission from user
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Play a clear, high-fidelity synthetic notification chime using Web Audio API.
 * Operates without external audio assets, works instantly on mobile & desktop.
 */
export function playAlertChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Play dual-tone harmonic chime
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12); // E6
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Tone 2 (Sparkle overtone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now + 0.08); // A6
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.5);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch {
    // AudioContext blocked by policy or unavailable
  }
}

/**
 * Mobile haptic vibration alert
 */
export function triggerHapticFeedback(pattern: number[] = [150, 75, 150]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

/**
 * Dispatches a native browser notification (preferring ServiceWorker showNotification on mobile).
 */
export async function triggerBrowserNotification(
  title: string,
  body?: string,
  onClick?: () => void,
  options?: {
    linkTab?: string;
    tag?: string;
    sound?: boolean;
    vibrate?: boolean;
  }
): Promise<void> {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  // Play audio & haptic if enabled
  if (options?.sound !== false) {
    playAlertChime();
  }
  if (options?.vibrate !== false) {
    triggerHapticFeedback([180, 80, 180]);
  }

  const notificationOptions: NotificationOptions = {
    body: body || 'You have a new update in BATTLE ESPORTS',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: options?.tag || `battle-alert-${Date.now()}`,
    data: {
      linkTab: options?.linkTab || 'home',
    },
    requireInteraction: options?.linkTab === 'matches',
  };

  // Try service worker notification first (ideal for mobile PWA)
  if (swRegistration && 'showNotification' in swRegistration) {
    try {
      await swRegistration.showNotification(title, notificationOptions);
      return;
    } catch (err) {
      console.warn('Service worker notification failed, falling back to window Notification:', err);
    }
  }

  // Fallback to Window Notification API
  try {
    const notif = new Notification(title, notificationOptions);
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Failed to trigger window Notification:', err);
  }
}
