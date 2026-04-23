import { Platform } from 'react-native';

// Cross-platform "powerful enough" notification helper.
// On web: uses Notification API (requires user permission on first request).
// On native: uses expo-notifications when available (silently degrades otherwise).

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // @ts-ignore
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    // @ts-ignore
    if (window.Notification.permission === 'granted') return true;
    // @ts-ignore
    if (window.Notification.permission === 'denied') return false;
    try {
      // @ts-ignore
      const p = await window.Notification.requestPermission();
      return p === 'granted';
    } catch {
      return false;
    }
  }
  try {
    const Notifs = require('expo-notifications');
    const { status: existing } = await Notifs.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifs.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function notify(title: string, body: string) {
  try {
    if (Platform.OS === 'web') {
      // @ts-ignore
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        // @ts-ignore
        new window.Notification(title, { body });
        try { (window as any).navigator?.vibrate?.([100, 50, 100]); } catch {}
        return true;
      }
      return false;
    }
    const Notifs = require('expo-notifications');
    await Notifs.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // immediate
    });
    return true;
  } catch {
    return false;
  }
}
