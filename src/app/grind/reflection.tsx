import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { showAlert } from '../../lib/dialog';
import {
  getStartOfWeekDateString,
  getOffsetWeekStartDateString,
} from '../../lib/grindCheckins';
import {
  getReflection,
  getReflections,
  saveReflection,
} from '../../lib/grindReflections';
import { resolveReflectionSavedReaction } from '../../lib/grindReactions';

export default function GrindReflectionScreen() {
  const auth: any = useAuth();
  const session = auth?.session;
  const params = useLocalSearchParams();

  const currentWeekStartStr = useMemo(() => getStartOfWeekDateString(), []);
  const initialOffset = useMemo(() => {
    if (params.weekStart && typeof params.weekStart === 'string') {
      const diffMs = new Date(params.weekStart).getTime() - new Date(currentWeekStartStr).getTime();
      return Math.round(diffMs / (7 * 24 * 3600 * 1000));
    }
    return 0;
  }, [params.weekStart, currentWeekStartStr]);

  const [weekOffset, setWeekOffset] = useState<number>(Math.min(0, initialOffset));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [worked, setWorked] = useState('');
  const [struggled, setStruggled] = useState('');
  const [lesson, setLesson] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [savedRecord, setSavedRecord] = useState<any>(null);
  const [pastReflections, setPastReflections] = useState<any[]>([]);

  const selectedWeekStartStr = useMemo(
    () => getOffsetWeekStartDateString(currentWeekStartStr, weekOffset),
    [currentWeekStartStr, weekOffset]
  );

  const isCurrentWeek = weekOffset === 0;

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`.toUpperCase();
  };

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [ref, all]: [any, any[]] = await Promise.all([
        getReflection(session.user.id, selectedWeekStartStr),
        getReflections(session.user.id),
      ]);

      if (ref) {
        setWorked(ref.worked || '');
        setStruggled(ref.struggled || '');
        setLesson(ref.lesson || '');
        setNextWeek(ref.nextWeek || '');
        setSavedRecord(ref);
      } else {
        setWorked('');
        setStruggled('');
        setLesson('');
        setNextWeek('');
        setSavedRecord(null);
      }
      setPastReflections(all);
    } catch (err) {
      console.warn('[GrindReflectionScreen] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [session, selectedWeekStartStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!session) return;
    if (!worked.trim() && !struggled.trim() && !lesson.trim() && !nextWeek.trim()) {
      showAlert('Empty Reflection', 'Please fill in at least one reflection field before saving.');
      return;
    }

    setSaving(true);
    try {
      const updated = await saveReflection(session.user.id, selectedWeekStartStr, {
        worked,
        struggled,
        lesson,
        nextWeek,
      });
      setSavedRecord(updated);

      const reaction = resolveReflectionSavedReaction();
      showAlert(
        'REFLECTION SAVED ✓',
        `“${reaction.quote}”\n\n${reaction.subtext}`,
        [{ text: 'KEEP GRINDING', onPress: () => loadData() }]
      );
    } catch (err: any) {
      showAlert('Save Error', err.message || 'Could not save reflection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {savedRecord ? '✓ REFLECTION SAVED' : '📝 INCOMPLETE'}
            </Text>
          </View>
        </View>

        <Text style={styles.screenTitle}>WEEKLY REFLECTION</Text>
        <Text style={styles.screenSubtitle}>HONEST AUDIT OF YOUR EXECUTION</Text>

        {/* ── WEEK SWITCHER ── */}
        <View style={styles.weekSwitcherRow}>
          <TouchableOpacity
            style={styles.weekNavBtn}
            onPress={() => setWeekOffset((prev) => prev - 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.weekNavBtnText}>← PREV</Text>
          </TouchableOpacity>

          <View style={styles.weekLabelContainer}>
            <Text style={styles.weekSelectorTitle}>
              {isCurrentWeek ? 'THIS WEEK' : 'PAST WEEK'}
            </Text>
            <Text style={styles.weekSelectorRange}>
              {formatWeekRange(selectedWeekStartStr)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
            onPress={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
            disabled={isCurrentWeek}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.weekNavBtnText, isCurrentWeek && styles.weekNavBtnTextDisabled]}>
              NEXT →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── FORM PROMPTS ── */}
        <View style={styles.promptsContainer}>
          {/* Question 1 */}
          <View style={styles.promptCard}>
            <Text style={styles.promptNumber}>01</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptHeading}>WHAT WENT RIGHT?</Text>
              <Text style={styles.promptHelper}>What did you actually execute well this week?</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Hit every workout, stayed focused on math..."
                placeholderTextColor={colors.textMuted}
                value={worked}
                onChangeText={setWorked}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Question 2 */}
          <View style={styles.promptCard}>
            <Text style={styles.promptNumber}>02</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptHeading}>WHAT FUCKED YOU UP?</Text>
              <Text style={styles.promptHelper}>What distraction, excuse, or roadblock got in your way?</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Scrolled on phone late at night, poor schedule..."
                placeholderTextColor={colors.textMuted}
                value={struggled}
                onChangeText={setStruggled}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Question 3 */}
          <View style={styles.promptCard}>
            <Text style={styles.promptNumber}>03</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptHeading}>WHAT DID YOU LEARN?</Text>
              <Text style={styles.promptHelper}>What pattern or reality check did you notice?</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. If I don't study before 2 PM, it doesn't happen..."
                placeholderTextColor={colors.textMuted}
                value={lesson}
                onChangeText={setLesson}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Question 4 */}
          <View style={styles.promptCard}>
            <Text style={styles.promptNumber}>04</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptHeading}>WHAT CHANGES NEXT WEEK?</Text>
              <Text style={styles.promptHelper}>What concrete operational change will you make?</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Leave phone in other room during study blocks..."
                placeholderTextColor={colors.textMuted}
                value={nextWeek}
                onChangeText={setNextWeek}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* ── SAVE ACTION ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'SAVING...' : '💾 SAVE REFLECTION'}
          </Text>
        </TouchableOpacity>

        {/* ── PAST REFLECTIONS SECTION ── */}
        {pastReflections.length > 0 && (
          <View style={styles.pastSection}>
            <Text style={styles.sectionHeading}>PAST REFLECTIONS</Text>
            <View style={styles.pastList}>
              {pastReflections.map((ref) => {
                const isSelected = ref.weekStart === selectedWeekStartStr;
                return (
                  <TouchableOpacity
                    key={ref.id || ref.weekStart}
                    style={[styles.pastCard, isSelected && styles.pastCardActive]}
                    onPress={() => {
                      const diffMs = new Date(ref.weekStart).getTime() - new Date(currentWeekStartStr).getTime();
                      setWeekOffset(Math.round(diffMs / (7 * 24 * 3600 * 1000)));
                    }}
                  >
                    <View style={styles.pastCardHeader}>
                      <Text style={styles.pastWeekLabel}>
                        WEEK OF {formatWeekRange(ref.weekStart)}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>VIEWING</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pastExcerpt} numberOfLines={2}>
                      “{ref.lesson || ref.worked || ref.struggled || ref.nextWeek || 'Saved reflection'}”
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  statusBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.8,
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
  weekSwitcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  weekNavBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  weekNavBtnDisabled: {
    opacity: 0.3,
    borderColor: colors.border,
  },
  weekNavBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  weekNavBtnTextDisabled: {
    color: colors.textMuted,
  },
  weekLabelContainer: {
    alignItems: 'center',
  },
  weekSelectorTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  weekSelectorRange: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  promptsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  promptCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  promptNumber: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.primary,
    lineHeight: 22,
  },
  promptContent: {
    flex: 1,
  },
  promptHeading: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 2,
  },
  promptHelper: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  multilineInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xs,
    padding: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 65,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  pastSection: {
    marginTop: 8,
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pastList: {
    gap: 8,
  },
  pastCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  pastCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  pastCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pastWeekLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  selectedPill: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  selectedPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
  },
  pastExcerpt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
