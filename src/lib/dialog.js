import { Alert, Platform } from 'react-native';

/**
 * showAlert
 *
 * Cross-platform alert / confirmation dialog.
 * Works natively via Alert.alert on iOS/Android, and via window.alert / window.confirm on Web.
 *
 * @param {string} title - Alert title
 * @param {string} message - Alert description / body
 * @param {Array<{text: string, onPress?: Function, style?: 'default'|'cancel'|'destructive'}>} [buttons]
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    const fullText = title ? `${title}\n\n${message || ''}`.trim() : (message || '');

    // Case 1: Simple message / OK alert (0 or 1 button)
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(fullText);
      }
      if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
        buttons[0].onPress();
      }
      return;
    }

    // Case 2: Multi-button confirmation (e.g. Cancel vs Delete/Confirm)
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style === 'destructive' || b.style === 'default') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(fullText);
      if (confirmed) {
        if (confirmBtn && typeof confirmBtn.onPress === 'function') {
          confirmBtn.onPress();
        }
      } else {
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        }
      }
    }
    return;
  }

  // Native iOS / Android
  Alert.alert(title, message, buttons);
}
