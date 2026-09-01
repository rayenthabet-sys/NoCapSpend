import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { showAlert } from '../lib/dialog';

interface RenegotiateCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  goal: any;
  commitment: any;
  onSaveRenegotiation: (newTarget: number, reason: string) => Promise<void>;
}

const REASONS = [
  'TOO AMBITIOUS',
  'SCHEDULE CHANGED',
  'PRIORITY CHANGED',
  'ILLNESS / INJURY',
  'OTHER',
];

export default function RenegotiateCommitmentModal({
  visible,
  onClose,
  goal,
  commitment,
  onSaveRenegotiation,
}: RenegotiateCommitmentModalProps) {
  if (!visible || !goal || !commitment) return null;

  const currentTarget = Number(commitment.adjustedTarget ?? commitment.originalTarget) || 1;
  const [newTarget, setNewTarget] = useState(String(currentTarget));
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNewTarget(String(currentTarget));
    setSelectedReason(REASONS[0]);
  }, [commitment, currentTarget]);

  const handleSave = async () => {
    const num = parseInt(newTarget, 10);
    if (isNaN(num) || num < 1) {
      showAlert('Invalid Target', 'Please enter a target count of at least 1.');
      return;
    }

    if (goal.goalType === 'daily' && num > 7) {
      showAlert('Invalid Target', 'Daily goals cannot exceed 7 days in a week.');
      return;
    }

    setSaving(true);
    try {
      await onSaveRenegotiation(num, selectedReason);
      onClose();
    } catch (err: any) {
      showAlert('Renegotiation Error', err.message || 'Could not adjust commitment.');
    } finally {
      setSaving(false);
    }
  };

  const formatUnit = () => {
    if (goal.goalType === 'quantity') return goal.targetUnit?.toUpperCase() || 'UNITS';
    if (goal.goalType === 'daily') return 'DAYS';
    if (goal.goalType === 'once') return 'TIME';
    return 'TIMES';
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── HEADER ── */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>RENEGOTIATE TARGET</Text>
                <Text style={styles.headerSubtitle}>ADJUST UNREALISTIC COMMITMENT</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── GOAL INFO ── */}
            <View style={styles.goalInfoBox}>
              <Text style={styles.goalTitle} numberOfLines={1}>
                {goal.title}
              </Text>
              <Text style={styles.originalTargetText}>
                ORIGINAL PROMISE: {commitment.originalTarget} {formatUnit()} / WEEK
              </Text>
            </View>

            {/* ── CHARACTER GUIDANCE ── */}
            <View style={styles.characterGuidanceBox}>
              <Text style={styles.speakerLabel}>GRANDDAD ROBERT:</Text>
              <Text style={styles.characterQuote}>
                “THERE'S A DIFFERENCE BETWEEN QUITTING AND MAKING A REALISTIC PLAN.”
              </Text>
            </View>

            {/* ── NEW TARGET INPUT ── */}
            <Text style={styles.fieldLabel}>NEW REALISTIC TARGET ({formatUnit()})</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.targetInput}
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="numeric"
                maxLength={4}
              />
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>{formatUnit()} THIS WEEK</Text>
              </View>
            </View>

            {/* ── REASON SELECTION ── */}
            <Text style={styles.fieldLabel}>REASON FOR ADJUSTMENT</Text>
            <View style={styles.reasonsList}>
              {REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                    onPress={() => setSelectedReason(r)}
                  >
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.safeguardNotice}>
              ℹ Safeguard: You can only renegotiate each commitment once per week. The original promise remains recorded.
            </Text>

            {/* ── ACTIONS ── */}
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? 'LOCKING IN...' : '🔒 LOCK IN NEW TARGET'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1.5,
    borderRadius: radii.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primaryBright,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
  goalInfoBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  goalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  originalTargetText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  characterGuidanceBox: {
    backgroundColor: colors.cardSecondary,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  speakerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  characterQuote: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.primaryBright,
    letterSpacing: 1,
    lineHeight: 19,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  targetInput: {
    width: 70,
    height: 44,
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.primaryBright,
    textAlign: 'center',
  },
  unitBadge: {
    flex: 1,
    height: 44,
    backgroundColor: colors.card,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  unitBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  reasonsList: {
    gap: 6,
    marginBottom: 12,
  },
  reasonChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  reasonChipActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  reasonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  reasonTextActive: {
    color: colors.primaryBright,
    fontFamily: fonts.bodyBold,
  },
  safeguardNotice: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
