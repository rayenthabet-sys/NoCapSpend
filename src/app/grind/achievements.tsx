import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { getGrindGoals } from '../../lib/grindStore';
import { getAllUserCheckins } from '../../lib/grindCheckins';
import { getWeekHistory } from '../../lib/grindWeek';
import {
  getAllAchievementDefinitions,
  getUserUnlockedAchievements,
  calculatePersonalRecords,
  evaluateAndSyncAchievements,
} from '../../lib/grindAchievements';
import { calculateDailyStreak } from '../../lib/grindStreaks';

export default function GrindAchievementsScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [loading, setLoading] = useState(true);
  const [unlockedRecords, setUnlockedRecords] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<any>({
    bestStreak: 0,
    bestWeeklyScore: 0,
    totalGoalsCompleted: 0,
    totalCheckins: 0,
    perfectWeeks: 0,
    weeksLockedIn: 0,
    comebacksCount: 0,
  });

  const allDefinitions = useMemo(() => getAllAchievementDefinitions(), []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Evaluate new achievements on screen visit
      await evaluateAndSyncAchievements(session.user.id);

      const [goals, checkins, weekHistory, unlocked] = await Promise.all([
        getGrindGoals(session.user.id),
        getAllUserCheckins(session.user.id),
        getWeekHistory(session.user.id),
        getUserUnlockedAchievements(session.user.id),
      ]);

      const currentStreak = calculateDailyStreak(checkins);
      const records = calculatePersonalRecords(goals, checkins, weekHistory, currentStreak);

      setUnlockedRecords(unlocked);
      setPersonalRecords(records);
    } catch (err) {
      console.warn('[GrindAchievementsScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const unlockedMap = useMemo(() => {
    const map = new Map();
    unlockedRecords.forEach((r) => map.set(r.achievementId, r.unlockedAt));
    return map;
  }, [unlockedRecords]);

  const unlockedList = useMemo(() => {
    return allDefinitions
      .filter((d) => unlockedMap.has(d.id))
      .map((d) => ({ ...d, unlockedAt: unlockedMap.get(d.id) }));
  }, [allDefinitions, unlockedMap]);

  const lockedList = useMemo(() => {
    return allDefinitions.filter((d) => !unlockedMap.has(d.id));
  }, [allDefinitions, unlockedMap]);

  const completionPercent = Math.round((unlockedList.length / allDefinitions.length) * 100);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getAchievementCurrentProgress = (achievement: any) => {
    if (achievement.id === 'FIRST_CHECK') return Math.min(1, personalRecords.totalCheckins);
    if (achievement.id === 'TEN_CHECKINS') return Math.min(10, personalRecords.totalCheckins);
    if (achievement.id === 'FIFTY_CHECKINS') return Math.min(50, personalRecords.totalCheckins);
    if (achievement.id === 'STREAK_3') return Math.min(3, personalRecords.bestStreak);
    if (achievement.id === 'STREAK_7') return Math.min(7, personalRecords.bestStreak);
    if (achievement.id === 'STREAK_14') return Math.min(14, personalRecords.bestStreak);
    if (achievement.id === 'STREAK_30') return Math.min(30, personalRecords.bestStreak);
    if (achievement.id === 'THREE_PERFECT') return Math.min(3, personalRecords.perfectWeeks);
    if (achievement.id === 'FIRST_LOCK_IN') return Math.min(1, personalRecords.weeksLockedIn);
    return 0;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => safeBack('/grind')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backLink}>← THE GRIND</Text>
        </TouchableOpacity>
        <View style={styles.headerTag}>
          <Text style={styles.headerTagText}>RECORD WALL</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>PERSONAL RECORD</Text>
      <Text style={styles.screenSubtitle}>PROOF OF WHAT YOU'VE ACCOMPLISHED</Text>

      {/* ── OVERVIEW STATS BANNER ── */}
      <View style={styles.overviewBanner}>
        <View style={styles.overviewStatBox}>
          <Text style={styles.overviewStatLabel}>ACHIEVEMENTS</Text>
          <Text style={[styles.overviewStatValue, { color: colors.primaryBright }]}>
            {unlockedList.length} / {allDefinitions.length}
          </Text>
          <Text style={styles.overviewStatSub}>{completionPercent}% COMPLETED</Text>
        </View>

        <View style={styles.overviewDivider} />

        <View style={styles.overviewStatBox}>
          <Text style={styles.overviewStatLabel}>BEST STREAK</Text>
          <Text style={[styles.overviewStatValue, { color: colors.warning }]}>
            🔥 {personalRecords.bestStreak}D
          </Text>
          <Text style={styles.overviewStatSub}>CONSECUTIVE</Text>
        </View>
      </View>

      {/* ── PERSONAL RECORDS GRID ── */}
      <Text style={styles.sectionHeading}>STATISTICAL RECORD</Text>
      <View style={styles.recordsGrid}>
        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>BEST WEEK SCORE</Text>
          <Text style={styles.recordValue}>{personalRecords.bestWeeklyScore}%</Text>
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>GOALS COMPLETED</Text>
          <Text style={styles.recordValue}>{personalRecords.totalGoalsCompleted}</Text>
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>TOTAL CHECK-INS</Text>
          <Text style={styles.recordValue}>{personalRecords.totalCheckins}</Text>
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>PERFECT WEEKS</Text>
          <Text style={styles.recordValue}>{personalRecords.perfectWeeks}</Text>
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>WEEKS LOCKED IN</Text>
          <Text style={styles.recordValue}>{personalRecords.weeksLockedIn}</Text>
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordLabel}>COMEBACKS</Text>
          <Text style={styles.recordValue}>{personalRecords.comebacksCount}</Text>
        </View>
      </View>

      {/* ── UNLOCKED ACHIEVEMENTS ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>EARNED ACHIEVEMENTS ({unlockedList.length})</Text>
      </View>

      {unlockedList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>THE WALL IS EMPTY</Text>
          <Text style={styles.emptySub}>GOOD. YOU'RE JUST GETTING STARTED.</Text>
          <Text style={styles.emptyBody}>
            Show up, lock in your weekly commitments, and execute. “FIRST BLOOD” is waiting for you.
          </Text>
        </View>
      ) : (
        <View style={styles.achievementsList}>
          {unlockedList.map((item) => (
            <View key={item.id} style={styles.unlockedCard}>
              <Text style={styles.unlockedIcon}>{item.icon}</Text>
              <View style={styles.achievementInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.unlockedTitle}>{item.title}</Text>
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                  </View>
                </View>
                <Text style={styles.achievementDesc}>{item.description}</Text>
                <Text style={styles.unlockedDate}>Earned {formatDate(item.unlockedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── LOCKED ACHIEVEMENTS ── */}
      {lockedList.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>LOCKED ({lockedList.length})</Text>
          </View>

          <View style={styles.achievementsList}>
            {lockedList.map((item) => {
              const currentVal = getAchievementCurrentProgress(item);
              const targetVal = item.targetValue || 1;
              const hasProgress = targetVal > 1;
              const progressPercent = Math.min(100, Math.round((currentVal / targetVal) * 100));

              return (
                <View key={item.id} style={styles.lockedCard}>
                  <Text style={styles.lockedIcon}>🔒</Text>
                  <View style={styles.achievementInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.lockedTitle}>{item.title}</Text>
                      <Text style={styles.categoryPillText}>{item.category}</Text>
                    </View>
                    <Text style={styles.lockedDesc}>{item.description}</Text>

                    {hasProgress && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${progressPercent}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {currentVal} / {targetVal}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  container: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 48,
    maxWidth: 580,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  headerTag: {
    backgroundColor: colors.card,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  headerTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 38,
  },
  screenSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  overviewBanner: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 16,
    marginBottom: 18,
  },
  overviewStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  overviewStatLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  overviewStatValue: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 1,
  },
  overviewStatSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  recordCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: 'center',
  },
  recordLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  recordValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  achievementsList: {
    gap: 10,
  },
  unlockedCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.income,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  unlockedIcon: {
    fontSize: 26,
  },
  lockedCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    opacity: 0.65,
  },
  lockedIcon: {
    fontSize: 22,
    color: colors.textMuted,
  },
  achievementInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  unlockedTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
  },
  lockedTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    flex: 1,
  },
  unlockedBadge: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  unlockedBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.income,
    letterSpacing: 0.5,
  },
  categoryPillText: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  lockedDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  unlockedDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressBarBg: {
    flex: 1,
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
  progressText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
  },
});
