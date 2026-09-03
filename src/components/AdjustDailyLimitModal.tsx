import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { setDailyBudget } from '../lib/dailyBudget';

interface AdjustDailyLimitModalProps {
  visible: boolean;
  currentLimit: number | null;
  onClose: () => void;
  onSaved: (newLimit: number) => void;
}

export default function AdjustDailyLimitModal({
  visible,
  currentLimit,
  onClose,
  onSaved,
}: AdjustDailyLimitModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setInputValue(currentLimit !== null && currentLimit !== undefined && currentLimit > 0 ? String(currentLimit) : '');
      setErrorMessage('');
      setSaving(false);
    }
  }, [visible, currentLimit]);

  async function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a daily spending limit.');
      return;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Daily limit must be a positive number greater than 0.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      await setDailyBudget(num);
      onSaved(num);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save daily limit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kavWrapper}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.dialogCard}>
                {/* Header */}
                <View style={styles.headerRow}>
                  <Text style={styles.title}>YOUR DAILY LIMIT</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Close daily limit dialog"
                  >
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                  How much can you spend today without throwing tomorrow off?
                </Text>

                {/* Input with DT currency label */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={(val) => {
                      setInputValue(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="e.g. 24.50"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    autoFocus
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                  <Text style={styles.currencyBadge}>DT</Text>
                </View>

                {/* Error message */}
                {!!errorMessage && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={onClose}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.saveBtn]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#12120F" />
                    ) : (
                      <Text style={styles.saveBtnText}>SAVE LIMIT</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  kavWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    backgroundColor: colors.cardElevated,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.primary,
    letterSpacing: 2,
  },
  closeBtn: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: 'bold',
    padding: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  currencyBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: 1,
    marginLeft: 8,
  },
  errorContainer: {
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelBtn: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryBright,
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#12120F',
    letterSpacing: 1.5,
  },
});
