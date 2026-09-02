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
import {
  getTimelineData,
  TIMELINE_WINDOWS,
  TRAJECTORY_STATES,
} from '../../lib/grindTimeline';
import { resolveTimelineReaction } from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';

export default function GrindTimelineScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [loading, setLoading] = useState(true);
  const [selectedWindow, setSelectedWindow] = useState<string>(TIMELINE_WINDOWS.DAYS_30);
  const [timelineData, setTimelineData] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getTimelineData(session.user.id, selectedWindow);
      setTimelineData(data);
    } catch (err) {
      console.warn('[GrindTimelineScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session, selectedWindow]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const reaction = useMemo(() => {
    if (!timelineData?.trajectory) return null;
    return resolveTimelineReaction(timelineData.trajectory.state);
  }, [timelineData]);

  if (loading && !timelineData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const {
    heatmap,
    trajectory,
    bestRun,
    weakRun,
    milestones,
    weekSummaries,
    currentStreak,
    records,
    totalCompletedWeeks,
  } = timelineData || {};

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
          <Text style={styles.headerTagText}>JOURNEY ARCHIVE</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>YOUR JOURNEY</Text>
      <Text style={styles.screenSubtitle}>LONG-TERM PROGRESS & MILESTONES</Text>

      {/* ── TIME WINDOW SELECTOR ── */}
      <View style={styles.windowTabRow}>
        <TouchableOpacity
          style={[styles.windowTab, selectedWindow === TIMELINE_WINDOWS.DAYS_30 && styles.windowTabActive]}
          onPress={() => setSelectedWindow(TIMELINE_WINDOWS.DAYS_30)}
        >
          <Text style={[styles.windowTabText, selectedWindow === TIMELINE_WINDOWS.DAYS_30 && styles.windowTabTextActive]}>
            30 DAYS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.windowTab, selectedWindow === TIMELINE_WINDOWS.DAYS_90 && styles.windowTabActive]}
          onPress={() => setSelectedWindow(TIMELINE_WINDOWS.DAYS_90)}
        >
          <Text style={[styles.windowTabText, selectedWindow === TIMELINE_WINDOWS.DAYS_90 && styles.windowTabTextActive]}>
            90 DAYS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.windowTab, selectedWindow === TIMELINE_WINDOWS.ALL_TIME && styles.windowTabActive]}
          onPress={() => setSelectedWindow(TIMELINE_WINDOWS.ALL_TIME)}
        >
          <Text style={[styles.windowTabText, selectedWindow === TIMELINE_WINDOWS.ALL_TIME && styles.windowTabTextActive]}>
            ALL TIME
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── STREAK & CONSISTENCY HERO ── */}
      <View style={styles.heroStatsCard}>
        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>CURRENT STREAK</Text>
          <Text style={[styles.heroStatVal, { color: colors.warning }]}>🔥 {currentStreak || 0}D</Text>
          <Text style={styles.heroStatSub}>Best: {records?.bestStreak || currentStreak || 0}D</Text>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>DAYS ACTIVE</Text>
          <Text style={[styles.heroStatVal, { color: colors.income }]}>
            {heatmap?.activeDaysCount || 0} / {heatmap?.totalDaysCount || 30}
          </Text>
          <Text style={styles.heroStatSub}>{heatmap?.consistencyRate || 0}% Execution</Text>
        </View>
      </View>

      {/* ── 30-DAY / 90-DAY ACTIVITY HEATMAP ── */}
      {selectedWindow !== TIMELINE_WINDOWS.ALL_TIME && (
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapHeader}>
            <Text style={styles.heatmapTitle}>
              ACTIVITY HEATMAP ({selectedWindow === TIMELINE_WINDOWS.DAYS_90 ? 'LAST 90 DAYS' : 'LAST 30 DAYS'})
            </Text>
            <Text style={styles.heatmapLegendText}>INTENSITY</Text>
          </View>

          <View style={styles.heatmapGrid}>
            {heatmap?.days?.map((day: any, idx: number) => {
              let bg = colors.surface;
              if (day.level === 1) bg = 'rgba(76, 175, 80, 0.35)';
              if (day.level === 2) bg = 'rgba(76, 175, 80, 0.65)';
              if (day.level === 3) bg = colors.income;

              return (
                <View
                  key={idx}
                  style={[
                    styles.heatmapBlock,
                    { backgroundColor: bg },
                    day.level > 0 && styles.heatmapBlockActive,
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ── PERFORMANCE TRAJECTORY ── */}
      {trajectory && (
        <View style={styles.trajectoryCard}>
          <View style={styles.trajectoryHeader}>
            <Text style={styles.trajectoryTag}>TRAJECTORY</Text>
            <View
              style={[
                styles.trajectoryPill,
                trajectory.state === TRAJECTORY_STATES.IMPROVING && styles.trajectoryPillUp,
                trajectory.state === TRAJECTORY_STATES.DECLINING && styles.trajectoryPillDown,
              ]}
            >
              <Text style={styles.trajectoryPillText}>{trajectory.state}</Text>
            </View>
          </View>

          <Text style={styles.trajectoryHeadline}>{trajectory.headline}</Text>
          <Text style={styles.trajectorySubtext}>{trajectory.subtext}</Text>

          {/* Character Commentary */}
          {reaction && (
            <View style={styles.characterBubble}>
              <BudgetCharacter
                assetId={reaction.assetId}
                animationType={reaction.animationType as any}
                size="small"
                animated={true}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.speakerLabel}>{reaction.speaker}:</Text>
                <Text style={styles.quoteText}>“{reaction.quote}”</Text>
                <Text style={styles.subtextText}>{reaction.subtext}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── BEST RUN / WEAKEST RUN ── */}
      {(bestRun || weakRun) && (
        <View style={styles.runsCard}>
          <Text style={styles.runsSectionTitle}>PERFORMANCE RUNS</Text>
          {bestRun && (
            <View style={styles.runRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.runTitle}>★ BEST RUN</Text>
                <Text style={styles.runDetail}>{bestRun.length} consecutive weeks @ {bestRun.averageScore}% avg</Text>
              </View>
              <Text style={[styles.runScore, { color: colors.income }]}>{bestRun.averageScore}%</Text>
            </View>
          )}
          {weakRun && (
            <View style={[styles.runRow, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.runTitle, { color: colors.warning }]}>⚠ LOWEST RUN</Text>
                <Text style={styles.runDetail}>{weakRun.length} consecutive weeks @ {weakRun.averageScore}% avg</Text>
              </View>
              <Text style={[styles.runScore, { color: colors.warning }]}>{weakRun.averageScore}%</Text>
            </View>
          )}
        </View>
      )}

      {/* ── WEEKLY EXECUTION TREND ── */}
      {weekSummaries && weekSummaries.length > 0 && (
        <View style={styles.trendSection}>
          <Text style={styles.sectionHeading}>WEEKLY PERFORMANCE TREND</Text>
          <View style={styles.trendCard}>
            {weekSummaries.slice(-8).map((w: any, idx: number) => (
              <View key={w.weekStart} style={styles.trendItemRow}>
                <Text style={styles.trendWeekLabel}>W{idx + 1}</Text>
                <View style={styles.trendTrack}>
                  <View
                    style={[
                      styles.trendFill,
                      {
                        width: `${w.score}%`,
                        backgroundColor:
                          w.score >= 90
                            ? colors.primaryBright
                            : w.score >= 75
                            ? colors.income
                            : w.score >= 50
                            ? colors.warning
                            : colors.danger,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trendItemScore}>{w.score}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── MAJOR MILESTONES TIMELINE ── */}
      <View style={styles.milestonesSection}>
        <Text style={styles.sectionHeading}>MAJOR MILESTONES ({milestones?.length || 0})</Text>

        {milestones && milestones.length > 0 ? (
          <View style={styles.milestonesList}>
            {milestones.map((m: any) => (
              <TouchableOpacity
                key={m.id}
                style={styles.milestoneCard}
                onPress={() => m.route && router.push(m.route as any)}
                activeOpacity={m.route ? 0.7 : 1}
              >
                <Text style={styles.milestoneIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneDate}>{m.date}</Text>
                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  <Text style={styles.milestoneSubtitle}>{m.subtitle}</Text>
                </View>
                {m.route && <Text style={styles.milestoneArrow}>→</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyMilestonesBox}>
            <Text style={styles.emptyMilestonesText}>
              Keep checking in and locking in your commitments. Major milestones will appear as you grind.
            </Text>
          </View>
        )}
      </View>

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
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 36,
  },
  screenSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  windowTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  windowTab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    paddingVertical: 10,
    alignItems: 'center',
  },
  windowTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
  },
  windowTabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  windowTabTextActive: {
    color: colors.primaryBright,
  },
  heroStatsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  heroStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroStatVal: {
    fontFamily: fonts.display,
    fontSize: 22,
    marginBottom: 2,
  },
  heroStatSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
  heroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  heatmapLegendText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapBlock: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  heatmapBlockActive: {
    borderColor: 'transparent',
  },
  trajectoryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  trajectoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trajectoryTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
  },
  trajectoryPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  trajectoryPillUp: {
    borderColor: colors.income,
  },
  trajectoryPillDown: {
    borderColor: colors.warning,
  },
  trajectoryPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
  },
  trajectoryHeadline: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trajectorySubtext: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  characterBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.xs,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    gap: 10,
  },
  speakerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.primaryBright,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 2,
  },
  subtextText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  runsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  runsSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  runRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.income,
    letterSpacing: 0.8,
  },
  runDetail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  runScore: {
    fontFamily: fonts.display,
    fontSize: 16,
  },
  trendSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 2,
    textTransform: 'uppercase',
  },
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  trendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendWeekLabel: {
    width: 28,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
  },
  trendTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendFill: {
    height: '100%',
  },
  trendItemScore: {
    width: 32,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  milestonesSection: {
    marginBottom: 16,
  },
  milestonesList: {
    gap: 8,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  milestoneIcon: {
    fontSize: 20,
  },
  milestoneDate: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  milestoneTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  milestoneSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  milestoneArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  emptyMilestonesBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyMilestonesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
