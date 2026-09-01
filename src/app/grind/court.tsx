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
import { showAlert } from '../../lib/dialog';
import {
  evaluateAndDetectCourtCases,
  getCourtCases,
  resolveCourtCase,
  COURT_DIAGNOSES,
} from '../../lib/grindCourt';
import { resolveCourtReaction } from '../../lib/grindReactions';
import BudgetCharacter from '../../components/BudgetCharacter';

export default function CharacterCourtScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [loading, setLoading] = useState(true);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);

  // Time preference selection for BAD_SCHEDULING
  const [schedulingStep, setSchedulingStep] = useState(false);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('MORNING');

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Evaluate new court cases from history
      await evaluateAndDetectCourtCases(session.user.id);
      const cases = await getCourtCases(session.user.id);
      setAllCases(cases);
    } catch (err) {
      console.warn('[CharacterCourtScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openCases = useMemo(() => allCases.filter((c) => c.status === 'open'), [allCases]);
  const resolvedCases = useMemo(() => allCases.filter((c) => c.status === 'resolved'), [allCases]);

  const currentCase = openCases.length > 0 ? openCases[Math.min(activeCaseIndex, openCases.length - 1)] : null;

  const reaction = useMemo(() => {
    if (!currentCase) return null;
    return resolveCourtReaction(currentCase.trigger, currentCase.character, { goalTitle: currentCase.goalTitle });
  }, [currentCase]);

  // ── Handle Diagnosis Submissions ────────────────────────────────
  const handleDiagnosis = async (diagnosis: string) => {
    if (!session || !currentCase) return;

    if (diagnosis === COURT_DIAGNOSES.BAD_SCHEDULING) {
      setSchedulingStep(true);
      return;
    }

    if (diagnosis === COURT_DIAGNOSES.DONT_WANT_ANYMORE) {
      showAlert(
        'ARCHIVE THIS GOAL?',
        `Are you sure you want to archive "${currentCase.goalTitle}"?\n\nYour historical check-ins, receipts, and records will remain completely intact.`,
        [
          { text: 'CANCEL', style: 'cancel' },
          {
            text: 'ARCHIVE GOAL',
            style: 'destructive',
            onPress: async () => {
              await resolveCourtCase(session.user.id, currentCase.id, diagnosis, 'ARCHIVE_GOAL');
              showAlert(
                'CASE CLOSED',
                `"${currentCase.goalTitle}" archived.\n\nCLEARED FROM THE DOCKET. Stop making promises you don't actually want.`,
                [{ text: 'CONTINUE', onPress: () => loadData() }]
              );
            },
          },
        ]
      );
      return;
    }

    if (diagnosis === COURT_DIAGNOSES.TOO_AMBITIOUS) {
      await resolveCourtCase(session.user.id, currentCase.id, diagnosis, 'ADJUST_TARGET');
      showAlert(
        'DIAGNOSIS RECORDED',
        `Recognized as TOO AMBITIOUS.\n\nNow head to "This Week" and set a realistic commitment you can actually execute.`,
        [
          {
            text: 'GO TO THIS WEEK',
            onPress: () => {
              loadData();
              router.push('/grind/week' as any);
            },
          },
          { text: 'STAY IN COURT', onPress: () => loadData() },
        ]
      );
      return;
    }

    if (diagnosis === COURT_DIAGNOSES.DIDNT_PRIORITIZE) {
      await resolveCourtCase(session.user.id, currentCase.id, diagnosis, 'RECOMMIT');
      showAlert(
        'HONEST ADMISSION',
        `You admitted you didn't prioritize it.\n\nNo excuses. Now lock it in and put the work first.`,
        [{ text: 'LET’S WORK', onPress: () => loadData() }]
      );
      return;
    }

    if (diagnosis === COURT_DIAGNOSES.SOMETHING_CAME_UP) {
      await resolveCourtCase(session.user.id, currentCase.id, diagnosis, 'DISMISSED_TEMPORARY');
      showAlert(
        'CASE DISMISSED',
        `External circumstances accepted.\n\nDeal with what's in front of you. Come back when you're ready.`,
        [{ text: 'OK', onPress: () => loadData() }]
      );
      return;
    }
  };

  const handleSaveScheduling = async () => {
    if (!session || !currentCase) return;
    await resolveCourtCase(session.user.id, currentCase.id, COURT_DIAGNOSES.BAD_SCHEDULING, 'SET_TIME_PREFERENCE', {
      timeOfDay: selectedTimeOfDay,
    });
    setSchedulingStep(false);
    showAlert(
      'SCHEDULE UPDATED',
      `Plan committed for ${selectedTimeOfDay}.\n\nNo more putting it off till late at night. Execute in the ${selectedTimeOfDay.toLowerCase()}.`,
      [{ text: 'UNDERSTOOD', onPress: () => loadData() }]
    );
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
          <Text style={styles.headerTagText}>
            {openCases.length > 0 ? `⚖ ${openCases.length} ACTIVE CASE` : '⚖ DOCKET CLEAR'}
          </Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>CHARACTER COURT</Text>
      <Text style={styles.screenSubtitle}>HABITS & PATTERNS ON TRIAL</Text>

      {/* ── ACTIVE CASE IN SESSION ── */}
      {currentCase && reaction ? (
        <View style={styles.caseWrapper}>
          <View style={styles.caseCard}>
            <View style={styles.caseHeader}>
              <Text style={styles.caseNumber}>{currentCase.caseNumber || 'CASE #001'}</Text>
              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>IN SESSION</Text>
              </View>
            </View>

            <Text style={styles.goalSubjectTitle}>{currentCase.goalTitle}</Text>
            <Text style={styles.triggerHeadline}>{reaction.headline}</Text>

            {/* Evidence Stats */}
            <View style={styles.evidenceBox}>
              <Text style={styles.evidenceLabel}>THE EVIDENCE:</Text>
              {currentCase.stats?.prevWeekScore !== undefined ? (
                <Text style={styles.evidenceText}>
                  • Previous Week: {currentCase.stats.prevWeekScore}% completed{'\n'}
                  • Last Week: {currentCase.stats.lastWeekScore}% completed ({currentCase.stats.completedCount} / {currentCase.stats.targetCount} targets met)
                </Text>
              ) : currentCase.stats?.renegotiatedWeeksCount ? (
                <Text style={styles.evidenceText}>
                  • Renegotiated {currentCase.stats.renegotiatedWeeksCount} weeks in a row{'\n'}
                  • Lowered promise from {currentCase.stats.originalTarget} → {currentCase.stats.adjustedTarget}
                </Text>
              ) : (
                <Text style={styles.evidenceText}>
                  • Zero activity logged across committed weekly cycles
                </Text>
              )}
            </View>

            {/* Character Confrontation */}
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

            {/* Diagnosis Options or Scheduling Step */}
            {schedulingStep ? (
              <View style={styles.schedulingSection}>
                <Text style={styles.schedulingHeading}>WHEN WILL YOU ACTUALLY DO THIS?</Text>
                <View style={styles.timeOfDayRow}>
                  {['MORNING', 'AFTERNOON', 'EVENING'].map((t) => {
                    const isSel = selectedTimeOfDay === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, isSel && styles.timeChipActive]}
                        onPress={() => setSelectedTimeOfDay(t)}
                      >
                        <Text style={[styles.timeChipText, isSel && styles.timeChipTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleSaveScheduling}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>LOCK IN TIME PREFERENCE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSchedulingStep(false)}
                >
                  <Text style={styles.cancelBtnText}>GO BACK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.diagnosisSection}>
                <Text style={styles.diagnosisHeading}>AIGHT. WHAT'S THE REAL PROBLEM?</Text>

                <TouchableOpacity
                  style={styles.diagnosisBtn}
                  onPress={() => handleDiagnosis(COURT_DIAGNOSES.TOO_AMBITIOUS)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.diagnosisTitle}>1. TOO AMBITIOUS</Text>
                  <Text style={styles.diagnosisSub}>The weekly target is unrealistic for my current capacity.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.diagnosisBtn}
                  onPress={() => handleDiagnosis(COURT_DIAGNOSES.BAD_SCHEDULING)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.diagnosisTitle}>2. BAD SCHEDULING</Text>
                  <Text style={styles.diagnosisSub}>I leave it for the wrong time and keep running out of daylight.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.diagnosisBtn}
                  onPress={() => handleDiagnosis(COURT_DIAGNOSES.DIDNT_PRIORITIZE)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.diagnosisTitle}>3. DIDN'T PRIORITIZE IT</Text>
                  <Text style={styles.diagnosisSub}>I wanted to do it, but chose other distractions instead.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.diagnosisBtn}
                  onPress={() => handleDiagnosis(COURT_DIAGNOSES.DONT_WANT_ANYMORE)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.diagnosisTitle}>4. I DON'T WANT THIS ANYMORE</Text>
                  <Text style={styles.diagnosisSub}>I have moved on. Archive this goal from my active plate.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.diagnosisBtn}
                  onPress={() => handleDiagnosis(COURT_DIAGNOSES.SOMETHING_CAME_UP)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.diagnosisTitle}>5. SOMETHING CAME UP</Text>
                  <Text style={styles.diagnosisSub}>Temporary external emergency or illness. I am keeping the goal.</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ── EMPTY DOCKET STATE ── */
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⚖</Text>
          <Text style={styles.emptyTitle}>NO ACTIVE CASES</Text>
          <Text style={styles.emptySub}>THE DOCKET IS CLEAR</Text>
          <Text style={styles.emptyBody}>
            You don't have any repeated failure patterns or abandoned commitments right now. Keep handling your business.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => safeBack('/grind')}
          >
            <Text style={styles.primaryActionBtnText}>← BACK TO THE GRIND</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CASE HISTORY ── */}
      {resolvedCases.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>COURT HISTORY ({resolvedCases.length})</Text>
          <View style={styles.historyList}>
            {resolvedCases.map((c) => (
              <View key={c.id} style={styles.historyCard}>
                <View style={styles.historyHeaderRow}>
                  <Text style={styles.historyCaseNum}>{c.caseNumber || 'CASE'}</Text>
                  <View style={styles.resolvedPill}>
                    <Text style={styles.resolvedPillText}>RESOLVED</Text>
                  </View>
                </View>
                <Text style={styles.historyGoalTitle}>{c.goalTitle}</Text>
                <Text style={styles.historyDiagnosis}>
                  Diagnosis: <Text style={{ color: colors.primaryBright }}>{c.diagnosis?.replace(/_/g, ' ') || 'Resolved'}</Text>
                </Text>
              </View>
            ))}
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
  caseWrapper: {
    marginBottom: 20,
  },
  caseCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.warning,
    padding: 16,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  caseNumber: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.warning,
    letterSpacing: 1.5,
  },
  openBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  openBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  goalSubjectTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  triggerHeadline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  evidenceBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 12,
  },
  evidenceLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 3,
  },
  evidenceText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  characterBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    gap: 10,
    marginBottom: 16,
  },
  speakerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.primaryBright,
    letterSpacing: 0.5,
    lineHeight: 19,
    marginBottom: 2,
  },
  subtextText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  diagnosisSection: {
    gap: 8,
  },
  diagnosisHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  diagnosisBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    padding: 10,
  },
  diagnosisTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  diagnosisSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  schedulingSection: {
    gap: 10,
  },
  schedulingHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primaryBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeOfDayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
  },
  timeChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  timeChipTextActive: {
    color: colors.primaryBright,
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
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
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
    color: colors.income,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  historySection: {
    marginTop: 10,
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyCaseNum: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  resolvedPill: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  resolvedPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.income,
  },
  historyGoalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  historyDiagnosis: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
