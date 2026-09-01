import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

interface DailyCheckInCardProps {
  goal: any;
  checkin?: any;
  weekProgress?: {
    completedCount: number;
    targetCount: number;
    isTargetMet: boolean;
    percent: number;
    remainingCount: number;
  };
  onCheckIn: (status: 'done' | 'not_done', valueCount?: number) => void;
  onPressDetail: () => void;
}

export default function DailyCheckInCard({
  goal,
  checkin,
  weekProgress,
  onCheckIn,
  onPressDetail,
}: DailyCheckInCardProps) {
  const currentStatus = checkin?.status;
  const isDone = currentStatus === 'done';
  const isNotDone = currentStatus === 'not_done';

  const [quantityInput, setQuantityInput] = useState(
    checkin?.value_count !== undefined ? String(checkin.value_count) : '1'
  );

  const completed = weekProgress?.completedCount || 0;
  const target = weekProgress?.targetCount || goal.targetCount || 1;
  const percent = weekProgress?.percent || 0;
  const isTargetMet = weekProgress?.isTargetMet || false;

  const handleQuantityDone = () => {
    const val = parseFloat(quantityInput);
    onCheckIn('done', isNaN(val) || val <= 0 ? 1 : val);
  };

  const formatWeeklySummary = () => {
    if (goal.goalType === 'quantity') {
      return `${completed} / ${target} ${goal.targetUnit?.toUpperCase() || 'UNITS'}`;
    }
    if (goal.goalType === 'daily') {
      return `${completed} / 7 DAYS`;
    }
    if (goal.goalType === 'once') {
      return `${completed} / 1 ONCE`;
    }
    return `${completed} / ${target} TIMES`;
  };

  return (
    <View
      style={[
        styles.card,
        isDone && styles.cardDone,
        isNotDone && styles.cardNotDone,
      ]}
    >
      {/* ── CARD HEADER (Clickable to view detail) ── */}
      <TouchableOpacity
        style={styles.headerPressable}
        onPress={onPressDetail}
        activeOpacity={0.7}
      >
        <View style={styles.headerRow}>
          <Text style={styles.goalTitle} numberOfLines={1}>
            {goal.title}
          </Text>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {goal.category?.toUpperCase() || 'GENERAL'}
            </Text>
          </View>
        </View>

        {/* ── WEEKLY PROGRESS BAR ── */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>WEEKLY PROGRESS</Text>
            <Text style={[styles.progressValues, isTargetMet && styles.targetMetText]}>
              {formatWeeklySummary()} {isTargetMet && '★'}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, percent)}%` },
                isTargetMet && styles.progressBarFillMet,
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── DAILY CHECK-IN CONTROLS ── */}
      <View style={styles.checkInRow}>
        {goal.goalType === 'quantity' ? (
          <View style={styles.quantityControlsRow}>
            <View style={styles.quantityInputWrap}>
              <TextInput
                style={styles.quantityInputField}
                value={quantityInput}
                onChangeText={setQuantityInput}
                keyboardType="numeric"
                placeholder="Qty"
                placeholderTextColor={colors.textMuted}
                maxLength={4}
              />
              <Text style={styles.quantityUnitLabel}>
                {goal.targetUnit?.slice(0, 5).toUpperCase() || 'QTY'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkBtn,
                styles.doneBtn,
                isDone && styles.doneBtnActive,
              ]}
              onPress={handleQuantityDone}
            >
              <Text
                style={[
                  styles.checkBtnText,
                  styles.doneBtnText,
                  isDone && styles.btnTextActive,
                ]}
              >
                {isDone ? '✓ LOGGED' : '+ LOG PROGRESS'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.checkBtn,
                styles.notDoneBtn,
                isNotDone && styles.notDoneBtnActive,
              ]}
              onPress={() => onCheckIn('not_done', 0)}
            >
              <Text
                style={[
                  styles.checkBtnText,
                  styles.notDoneBtnText,
                  isNotDone && styles.btnTextActive,
                ]}
              >
                {isNotDone ? '✗ SKIPPED' : '✗ SKIP'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.standardCheckInRow}>
            {/* DONE BUTTON */}
            <TouchableOpacity
              style={[
                styles.checkBtn,
                styles.doneBtn,
                isDone && styles.doneBtnActive,
              ]}
              onPress={() => onCheckIn('done', 1)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.checkBtnText,
                  styles.doneBtnText,
                  isDone && styles.btnTextActive,
                ]}
              >
                {isDone ? '✓ COMPLETED TODAY' : '✓ DONE'}
              </Text>
            </TouchableOpacity>

            {/* NOT DONE BUTTON */}
            <TouchableOpacity
              style={[
                styles.checkBtn,
                styles.notDoneBtn,
                isNotDone && styles.notDoneBtnActive,
              ]}
              onPress={() => onCheckIn('not_done', 0)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.checkBtnText,
                  styles.notDoneBtnText,
                  isNotDone && styles.btnTextActive,
                ]}
              >
                {isNotDone ? '✗ NOT DONE TODAY' : '✗ NOT DONE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 10,
  },
  cardDone: {
    borderLeftColor: colors.income,
    borderColor: colors.incomeBorder,
    backgroundColor: colors.incomeCard,
  },
  cardNotDone: {
    borderLeftColor: colors.expense,
    borderColor: colors.expenseBorder,
    backgroundColor: colors.expenseCard,
  },
  headerPressable: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  goalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  categoryPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  progressContainer: {
    marginTop: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  progressValues: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  targetMetText: {
    color: colors.income,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: colors.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressBarFillMet: {
    backgroundColor: colors.income,
  },
  checkInRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  standardCheckInRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    height: 38,
  },
  quantityInputField: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    width: 36,
    textAlign: 'center',
    padding: 0,
  },
  quantityUnitLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 2,
  },
  checkBtn: {
    flex: 1,
    borderRadius: radii.xs,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 38,
  },
  doneBtn: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
  },
  doneBtnActive: {
    backgroundColor: colors.income,
    borderColor: colors.income,
  },
  notDoneBtn: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
  },
  notDoneBtnActive: {
    backgroundColor: colors.expense,
    borderColor: colors.expense,
  },
  checkBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  doneBtnText: {
    color: colors.income,
  },
  notDoneBtnText: {
    color: colors.danger,
  },
  btnTextActive: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
});
