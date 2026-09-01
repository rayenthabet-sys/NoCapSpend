import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, spacing } from '../lib/theme';
import BudgetCharacter from './BudgetCharacter';

interface WeeklyReviewModalProps {
  visible: boolean;
  onClose: () => void;
  weeklySummary: {
    grindScorePercent: number;
    goalsMetCount: number;
    totalGoals: number;
    totalCheckinsCount: number;
    tier: {
      key: string;
      label: string;
      headline: string;
      description: string;
    };
    bestGoal: any;
    worstGoal: any;
    allGoalsCleared: boolean;
  };
  currentStreak: number;
  reaction: {
    characterKey: string;
    assetId: string;
    animationType: string;
    speaker: string;
    quote: string;
    badge: string;
  };
  weekLabel?: string;
  newAchievement?: any;
  hasCourtPattern?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WeeklyReviewModal({
  visible,
  onClose,
  weeklySummary,
  currentStreak,
  reaction,
  weekLabel = 'THIS WEEK',
  newAchievement,
  hasCourtPattern = false,
}: WeeklyReviewModalProps) {
  if (!visible) return null;

  const score = weeklySummary.grindScorePercent || 0;
  const tier = weeklySummary.tier || { key: 'DISASTER', label: 'DISASTER', description: '' };

  const getTierColor = () => {
    if (tier.key === 'ELITE') return colors.primaryBright;
    if (tier.key === 'SOLID') return colors.income;
    if (tier.key === 'SHAKY') return colors.warning;
    return colors.danger;
  };

  const tierColor = getTierColor();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── MODAL HEADER ── */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>WEEKLY REVIEW</Text>
                <Text style={styles.headerSubtitle}>{weekLabel.toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── CHARACTER REACTION BOX ── */}
            <View style={styles.characterSection}>
              <BudgetCharacter
                assetId={reaction.assetId}
                animationType={reaction.animationType as any}
                size="medium"
                animated={true}
              />
              <View style={styles.speechBubble}>
                <View style={styles.speakerRow}>
                  <Text style={styles.speakerText}>{reaction.speaker}</Text>
                  <Text style={[styles.speakerBadge, { color: tierColor }]}>
                    {reaction.badge}
                  </Text>
                </View>
                <Text style={styles.quoteText}>“{reaction.quote}”</Text>
              </View>
            </View>

            {/* ── SCORE BANNER ── */}
            <View style={[styles.scoreBanner, { borderColor: tierColor }]}>
              <Text style={styles.scoreBannerSub}>OVERALL GRIND SCORE</Text>
              <Text style={[styles.scoreBannerNumber, { color: tierColor }]}>
                {score}%
              </Text>
              <Text style={styles.scoreBannerTier}>{tier.label}</Text>
              <Text style={styles.scoreBannerDesc}>{tier.description}</Text>
            </View>

            {/* ── 3-METRIC STATS GRID ── */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>GOALS MET</Text>
                <Text style={styles.statBoxValue}>
                  {weeklySummary.goalsMetCount} / {weeklySummary.totalGoals}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>TOTAL CHECK-INS</Text>
                <Text style={styles.statBoxValue}>
                  {weeklySummary.totalCheckinsCount || 0}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>STREAK</Text>
                <Text style={[styles.statBoxValue, { color: colors.warning }]}>
                  🔥 {currentStreak}D
                </Text>
              </View>
            </View>

            {/* ── BEST / NEEDS WORK ── */}
            <View style={styles.breakdownBox}>
              {weeklySummary.allGoalsCleared ? (
                <View style={styles.perfectBox}>
                  <Text style={styles.perfectTitle}>★ 100% PERFECT WEEK ★</Text>
                  <Text style={styles.perfectSub}>Every scheduled commitment was fully completed.</Text>
                </View>
              ) : (
                <View style={styles.goalPairRow}>
                  {weeklySummary.bestGoal && (
                    <View style={styles.goalPairItem}>
                      <Text style={styles.goalPairTagBest}>BEST PERFORMANCE</Text>
                      <Text style={styles.goalPairTitle} numberOfLines={1}>
                        {weeklySummary.bestGoal.goal.title}
                      </Text>
                      <Text style={[styles.goalPairScore, { color: colors.income }]}>
                        {weeklySummary.bestGoal.progress.percent}%
                      </Text>
                    </View>
                  )}

                  {weeklySummary.worstGoal && (
                    <View style={styles.goalPairItem}>
                      <Text style={styles.goalPairTagWorst}>NEEDS WORK</Text>
                      <Text style={styles.goalPairTitle} numberOfLines={1}>
                        {weeklySummary.worstGoal.goal.title}
                      </Text>
                      <Text style={[styles.goalPairScore, { color: colors.danger }]}>
                        {weeklySummary.worstGoal.progress.percent}%
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ── NEW ACHIEVEMENT BANNER (IF EARNED) ── */}
            {newAchievement && (
              <View style={styles.newAchievementBox}>
                <Text style={styles.newAchievementTag}>🏆 NEW ACHIEVEMENT UNLOCKED</Text>
                <Text style={styles.newAchievementTitle}>{newAchievement.title}</Text>
                <Text style={styles.newAchievementDesc}>{newAchievement.description}</Text>
              </View>
            )}

            {/* ── HABIT PATTERN COURT NOTICE (IF FLAGGED) ── */}
            {hasCourtPattern && (
              <TouchableOpacity
                style={styles.courtNoticeBox}
                onPress={() => {
                  onClose();
                  router.push('/grind/court' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.courtNoticeTag}>⚠ HABIT PATTERN FLAGGED</Text>
                <Text style={styles.courtNoticeText}>
                  A repeated failure or renegotiation pattern has opened a Character Court case.
                </Text>
                <Text style={styles.courtNoticeLink}>ENTER CHARACTER COURT →</Text>
              </TouchableOpacity>
            )}

            {/* ── REFLECTION SHORTCUT ── */}
            <TouchableOpacity
              style={styles.reflectionActionBtn}
              onPress={() => {
                onClose();
                router.push('/grind/reflection' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.reflectionActionBtnText}>📝 WRITE WEEKLY REFLECTION →</Text>
            </TouchableOpacity>

            {/* ── DISMISS BUTTON ── */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionBtnText}>KEEP GRINDING</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
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
  characterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  speechBubble: {
    flex: 1,
  },
  speakerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  speakerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  speakerBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.primaryBright,
    letterSpacing: 1,
    lineHeight: 20,
  },
  scoreBanner: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreBannerSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  scoreBannerNumber: {
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: 1,
  },
  scoreBannerTier: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreBannerDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  statBoxValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  breakdownBox: {
    marginBottom: 18,
  },
  perfectBox: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    alignItems: 'center',
  },
  perfectTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.income,
    letterSpacing: 1,
    marginBottom: 2,
  },
  perfectSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  goalPairRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goalPairItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  goalPairTagBest: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.income,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  goalPairTagWorst: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.danger,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  goalPairTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  goalPairScore: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  newAchievementBox: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newAchievementTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 4,
  },
  newAchievementTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  newAchievementDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  courtNoticeBox: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  courtNoticeTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 3,
  },
  courtNoticeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  courtNoticeLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  reflectionActionBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reflectionActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primaryBright,
    letterSpacing: 2,
  },
});
