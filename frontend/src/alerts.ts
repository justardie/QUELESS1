import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * - Web: uses window.confirm()
 * - Native iOS/Android: uses Alert.alert with interactive buttons
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  opts?: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
) {
  const confirmLabel = opts?.confirmLabel || 'Ya, lanjutkan';
  const cancelLabel = opts?.cancelLabel || 'Batal';

  if (Platform.OS === 'web') {
    // @ts-ignore
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      // @ts-ignore
      ? window.confirm(`${title}\n\n${message}`)
      : true;
    if (ok) Promise.resolve(onConfirm()).catch(() => {});
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: opts?.destructive ? 'destructive' : 'default', onPress: () => { Promise.resolve(onConfirm()).catch(() => {}); } },
  ]);
}

/**
 * Cross-platform simple notification (toast-like).
 * - Web: DOM toast (non-blocking, no browser dialog suppression)
 * - Native: uses Alert.alert with OK
 */
export function notify(message: string, title = 'Berhasil') {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const isError = title && title !== 'Berhasil';
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${isError ? '#7F1D1D' : '#1e293b'};color:#fff;padding:12px 20px;border-radius:14px;font-size:14px;font-weight:600;z-index:99999;opacity:1;transition:opacity 0.4s;max-width:88vw;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.18);pointer-events:none;`;
      el.textContent = message || title;
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400); }, 2500);
    }
    return;
  }
  Alert.alert(title, message, [{ text: 'OK' }]);
}

/**
 * Cross-platform prompt (for simple text input).
 */
export function promptInput(
  title: string,
  message: string,
  onSubmit: (val: string) => void | Promise<void>,
  opts?: { defaultValue?: string; placeholder?: string }
) {
  if (Platform.OS === 'web') {
    // @ts-ignore
    const val = typeof window !== 'undefined' && typeof window.prompt === 'function'
      // @ts-ignore
      ? window.prompt(`${title}\n${message}`, opts?.defaultValue || '')
      : null;
    if (val != null) Promise.resolve(onSubmit(val)).catch(() => {});
    return;
  }
  // @ts-ignore - Alert.prompt only exists on iOS
  if (typeof Alert.prompt === 'function') {
    // @ts-ignore
    Alert.prompt(title, message, (v: string) => { if (v != null) Promise.resolve(onSubmit(v)).catch(() => {}); }, 'plain-text', opts?.defaultValue);
  } else {
    Alert.alert(title, message + '\n(Gunakan field input di layar berikutnya)', [{ text: 'OK' }]);
  }
}
