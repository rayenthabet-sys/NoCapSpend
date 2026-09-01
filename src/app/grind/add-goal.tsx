import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { showAlert } from '../../lib/dialog';
import {
  saveGrindGoal,
  getGrindGoalById,
  updateGrindGoal,
} from '../../lib/grindStore';
import { markNoteConverted } from '../../lib/grindNotes';
import { resolveNoteConversionReaction } from '../../lib/grindReactions';

const CATEGORIES = ['Fitness', 'Study', 'Discipline', 'Personal', 'Finance', 'Health'];

const GOAL_TYPES = [
  { id: 'repetition', label: 'REPEAT', desc: 'X times a week' },
  { id: 'daily', label: 'DAILY', desc: 'Every day' },
  { id: 'quantity', label: 'QUANTITY', desc: 'Numeric volume' },
  { id: 'once', label: 'ONE-TIME', desc: 'Once this week' },
];

export default function AddGrindGoal() {
  const { editId, fromNoteId, prefillTitle, prefillDesc } = useLocalSearchParams<{
    editId?: string;
    fromNoteId?: string;
    prefillTitle?: string;
    prefillDesc?: string;
  }>();
  const auth: any = useAuth();
  const session = auth?.session;

  const isEditing = Boolean(editId);
  const isFromNote = Boolean(fromNoteId);

  const [title, setTitle] = useState(prefillTitle || '');
  const [description, setDescription] = useState(prefillDesc || '');
  const [goalType, setGoalType] = useState<'repetition' | 'daily' | 'quantity' | 'once'>('repetition');
  const [targetCount, setTargetCount] = useState('3');
  const [targetUnit, setTargetUnit] = useState('times');
  const [category, setCategory] = useState('Fitness');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && session && editId) {
      (async () => {
        const existing: any = await getGrindGoalById(session.user.id, editId);
        if (existing) {
          setTitle(existing.title || '');
          setDescription(existing.description || '');
          setGoalType(existing.goalType || 'repetition');
          setTargetCount(String(existing.targetCount || 3));
          setTargetUnit(existing.targetUnit || 'times');
          setCategory(existing.category || 'Fitness');
        }
      })();
    }
  }, [isEditing, session, editId]);

  const handleTypeSelect = (typeId: 'repetition' | 'daily' | 'quantity' | 'once') => {
    setGoalType(typeId);
    if (typeId === 'daily') {
      setTargetCount('7');
      setTargetUnit('days');
    } else if (typeId === 'once') {
      setTargetCount('1');
      setTargetUnit('time');
    } else if (typeId === 'repetition') {
      setTargetCount('3');
      setTargetUnit('times');
    } else if (typeId === 'quantity') {
      setTargetCount('50');
      setTargetUnit('pages');
    }
  };

  const handleSave = async () => {
    if (!session) {
      showAlert('Not logged in', 'Please sign in to save your Grind goals.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showAlert('Missing Title', 'Please give your Grind goal a name.');
      return;
    }

    const countNum = parseInt(targetCount, 10);
    if (isNaN(countNum) || countNum < 1) {
      showAlert('Invalid Target', 'Target count must be at least 1.');
      return;
    }

    if (goalType === 'quantity' && !targetUnit.trim()) {
      showAlert('Missing Unit', 'Please specify a unit (e.g. pages, minutes, sets).');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editId) {
        await updateGrindGoal(session.user.id, editId, {
          title: trimmedTitle,
          description: description.trim(),
          goalType,
          targetCount: countNum,
          targetUnit: targetUnit.trim(),
          category,
        });
        safeBack('/grind');
      } else {
        const newGoal: any = await saveGrindGoal(session.user.id, {
          title: trimmedTitle,
          description: description.trim(),
          goalType,
          targetCount: countNum,
          targetUnit: targetUnit.trim(),
          frequencyPeriod: 'weekly',
          category,
        });

        if (isFromNote && fromNoteId && newGoal?.id) {
          await markNoteConverted(session.user.id, fromNoteId, newGoal.id);
          const reaction = resolveNoteConversionReaction();
          showAlert(
            reaction.quote,
            `Goal "${trimmedTitle}" has been locked in from your note.\n\n${reaction.subtext}`,
            [{ text: 'LET’S GRIND', onPress: () => router.replace('/grind' as any) }]
          );
          return;
        }

        safeBack('/grind');
      }
    } catch (err: any) {
      showAlert('Save Failed', err.message || 'Could not save Grind goal.');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>{isEditing ? 'EDIT GRIND GOAL' : 'NEW GRIND GOAL'}</Text>
        <Text style={styles.subtitle}>WEEKLY ACCOUNTABILITY</Text>

        {/* ── TITLE ── */}
        <Text style={styles.fieldLabel}>WHAT ARE YOU GRINDING FOR? *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Study Mathematics, Hit the Gym, Read"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        {/* ── DESCRIPTION ── */}
        <Text style={styles.fieldLabel}>WHY THIS MATTERS (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="e.g. Preparing for exam, staying consistent..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        {/* ── GOAL TYPE ── */}
        <Text style={styles.fieldLabel}>GOAL STRUCTURE</Text>
        <View style={styles.typeGrid}>
          {GOAL_TYPES.map((t) => {
            const isSelected = goalType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeCard, isSelected && styles.typeCardActive]}
                onPress={() => handleTypeSelect(t.id as any)}
              >
                <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                  {t.label}
                </Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TARGET SPECIFICATION ── */}
        <Text style={styles.fieldLabel}>WEEKLY TARGET</Text>
        {goalType === 'repetition' && (
          <View style={styles.targetRow}>
            <TextInput
              style={[styles.input, styles.targetCountInput]}
              value={targetCount}
              onChangeText={setTargetCount}
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.targetUnitBox}>
              <Text style={styles.targetUnitStatic}>TIMES / WEEK</Text>
            </View>
          </View>
        )}

        {goalType === 'daily' && (
          <View style={styles.staticTargetCard}>
            <Text style={styles.staticTargetTitle}>🔥 7 DAYS / WEEK</Text>
            <Text style={styles.staticTargetSub}>Daily habit commitment — check in every day.</Text>
          </View>
        )}

        {goalType === 'quantity' && (
          <View style={styles.targetRow}>
            <TextInput
              style={[styles.input, styles.targetCountInput]}
              value={targetCount}
              onChangeText={setTargetCount}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TextInput
              style={[styles.input, styles.targetUnitInput]}
              placeholder="Unit (pages, mins, reps)"
              placeholderTextColor={colors.textMuted}
              value={targetUnit}
              onChangeText={setTargetUnit}
              maxLength={20}
            />
          </View>
        )}

        {goalType === 'once' && (
          <View style={styles.staticTargetCard}>
            <Text style={styles.staticTargetTitle}>🎯 1x THIS WEEK</Text>
            <Text style={styles.staticTargetSub}>One-time milestone or assignment due this week.</Text>
          </View>
        )}

        {/* ── CATEGORY ── */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>CATEGORY</Text>
        <View style={styles.categoryChips}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />

        {/* ── ACTION BUTTONS ── */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'SAVING...' : isEditing ? 'UPDATE GRIND GOAL' : '+ CREATE GRIND GOAL'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 10 }} />

        <TouchableOpacity
          style={[styles.button, styles.ghostButton]}
          onPress={() => safeBack('/grind')}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>CANCEL</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 48,
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 13,
    marginBottom: 14,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
  },
  typeLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  typeLabelActive: {
    color: colors.primaryBright,
  },
  typeDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  targetCountInput: {
    width: 80,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.primaryBright,
  },
  targetUnitInput: {
    flex: 1,
  },
  targetUnitBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  targetUnitStatic: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  staticTargetCard: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 14,
    marginBottom: 14,
  },
  staticTargetTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.primaryBright,
    letterSpacing: 1,
    marginBottom: 4,
  },
  staticTargetSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  chipActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  chipTextActive: {
    color: colors.primaryBright,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
});
