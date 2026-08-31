import { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { getAvailableSavings } from '../../lib/savings';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { resolveCharacterState } from '../../lib/characterEngine';
import BudgetCharacter from '../../components/BudgetCharacter';
import ReactionText from '../../components/ReactionText';

export default function GoalDetail() {
  const { id } = useLocalSearchParams();
  const auth: any = useAuth();
  const session = auth?.session;
  const [goal, setGoal] = useState<any>(null);
  const [availableSavings, setAvailableSavings] = useState(0);
  const [contributionAmount, setContributionAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeReactionState, setActiveReactionState] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDestroyModal, setShowDestroyModal] = useState(false);

  const loadGoal = useCallback(async () => {
    if (!session) return;
    const [goalRes, avail] = await Promise.all([
      supabase.from('goals').select('*').eq('id', id).single(),
      getAvailableSavings(session.user.id),
    ]);

    if (!goalRes.error && goalRes.data) {
      setGoal(goalRes.data);
      setAvailableSavings(avail);
      if (Number(goalRes.data.current_amount) >= Number(goalRes.data.target_amount)) {
        setActiveReactionState({
          characterKey: 'jazmine',
          assetId: 'jazmine_complete',
          animationType: 'webp',
          reactionText: 'WE REACHED THE TARGET! WE ACTUALLY SAVED IT!',
          shake: false,
          pulse: true,
        });
      }
    }
  }, [id, session]);

  useFocusEffect(
    useCallback(() => {
      loadGoal();
    }, [loadGoal])
  );

  async function addContribution() {
    setErrorMessage('');
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      setErrorMessage('Enter an amount greater than 0.');
      return;
    }

    const available = await getAvailableSavings(session.user.id);
    setAvailableSavings(available);

    if (amount > available) {
      setErrorMessage(`Not enough available balance. You have ${available.toFixed(2)} DT available.`);
      return;
    }

    setSaving(true);
    try {
      const { error: contribError } = await supabase.from('goal_contributions').insert({
        goal_id: id,
        user_id: session.user.id,
        amount,
      });

      if (contribError) throw contribError;

      const newCurrentAmount = Number(goal?.current_amount || 0) + amount;
      const { error: updateError } = await supabase
        .from('goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', id);

      if (updateError) throw updateError;

      setContributionAmount('');
      const targetVal = Number(goal?.target_amount || 0);
      const isNowComplete = targetVal > 0 && newCurrentAmount >= targetVal;
      const reaction = resolveCharacterState({
        goalStatus: {
          current: newCurrentAmount,
          target: targetVal,
          isComplete: isNowComplete,
        },
        eventTrigger: 'goalContributed',
      });
      setActiveReactionState(reaction);

      await loadGoal();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to contribute amount.');
    } finally {
      setSaving(false);
    }
  }

  async function withdrawFromGoal() {
    setErrorMessage('');
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setErrorMessage('Enter an amount greater than 0.');
      return;
    }
    const currentSaved = Number(goal?.current_amount || 0);
    if (amount > currentSaved) {
      setErrorMessage(`This goal only has ${currentSaved.toFixed(2)} DT saved.`);
      return;
    }

    setSaving(true);
    try {
      const { error: contribError } = await supabase.from('goal_contributions').insert({
        goal_id: id,
        user_id: session.user.id,
        amount: -amount,
      });

      if (contribError) throw contribError;

      const newCurrentAmount = currentSaved - amount;
      const { error: updateError } = await supabase
        .from('goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', id);

      if (updateError) throw updateError;

      setWithdrawAmount('');
      setActiveReactionState({
        characterKey: 'jazmine',
        assetId: 'jazmine_progress',
        animationType: 'native',
        reactionText: 'WITHDRAWN FROM GOAL.',
        shake: false,
        pulse: false,
      });
      await loadGoal();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to withdraw.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDestroy(action: string) {
    setDeleting(true);
    setErrorMessage('');
    try {
      const currentSaved = Number(goal?.current_amount || 0);

      if (action === 'discard' && currentSaved > 0) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from('expenses').insert({
          user_id: session.user.id,
          amount: currentSaved,
          note: `Discarded goal savings: ${goal?.name || 'Goal'}`,
          date: today,
        });
      }

      await supabase.from('goal_contributions').delete().eq('goal_id', id);
      const { error: deleteError } = await supabase.from('goals').delete().eq('id', id);
      if (deleteError) throw deleteError;

      setShowDestroyModal(false);
      safeBack('/goals');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete goal.');
      setDeleting(false);
      setShowDestroyModal(false);
    }
  }

  if (!goal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = Math.min(Number(goal.current_amount) / Number(goal.target_amount), 1);
  const percent = Math.round(progress * 100);
  const remaining = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);
  const isComplete = Number(goal.current_amount) >= Number(goal.target_amount);

  const currentAssetId = activeReactionState?.assetId || (isComplete ? 'jazmine_complete' : 'jazmine_progress');
  const currentAnimType = activeReactionState?.animationType || (isComplete ? 'webp' : 'native');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{goal.name}</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter
          assetId={currentAssetId}
          animationType={currentAnimType}
          size="medium"
          animated
          pulse={activeReactionState?.pulse || false}
        />
        <ReactionText
          text={activeReactionState?.reactionText || (isComplete ? 'GOAL ACCOMPLISHED!' : 'GREAT PROGRESS!')}
          visible={true}
          holdMs={999999}
        />
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={[styles.card, isComplete && styles.cardComplete]}>
        <View style={styles.statRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>TARGET</Text>
            <Text style={styles.statValue}>{Number(goal.target_amount).toFixed(2)} DT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>SAVED</Text>
            <Text style={styles.statValue}>{Number(goal.current_amount).toFixed(2)} DT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>LEFT</Text>
            <Text style={styles.statValue}>{remaining.toFixed(2)} DT</Text>
          </View>
        </View>
        {goal.deadline ? <Text style={styles.deadlineText}>Deadline: {goal.deadline}</Text> : null}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percent}%` }, isComplete && styles.progressComplete]} />
        </View>
        <Text style={styles.percentText}>{percent}% complete</Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>CONTRIBUTE</Text>
        <Text style={styles.availableBadge}>Available: {availableSavings.toFixed(2)} DT</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Amount to add"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={contributionAmount}
        onChangeText={(val) => {
          setContributionAmount(val);
          if (errorMessage) setErrorMessage('');
        }}
      />
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={addContribution}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'SAVING...' : 'ADD TO GOAL'}</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>WITHDRAW FROM GOAL</Text>
      <TextInput
        style={styles.input}
        placeholder="Amount to withdraw"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={withdrawAmount}
        onChangeText={(val) => {
          setWithdrawAmount(val);
          if (errorMessage) setErrorMessage('');
        }}
      />
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={withdrawFromGoal}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'SAVING...' : 'WITHDRAW'}</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />

      <TouchableOpacity
        style={[styles.button, styles.destroyButton]}
        onPress={() => setShowDestroyModal(true)}
      >
        <Text style={styles.destroyButtonText}>DELETE GOAL</Text>
      </TouchableOpacity>

      <View style={{ height: 12 }} />
      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/goals')}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>BACK</Text>
      </TouchableOpacity>

      {/* Delete Options Modal */}
      <Modal
        visible={showDestroyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDestroyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>DELETE GOAL</Text>
            <Text style={styles.modalSubtitle}>
              {goal.name} — {Number(goal.current_amount).toFixed(2)} DT saved
            </Text>

            {Number(goal.current_amount) > 0 ? (
              <>
                <Text style={styles.modalPrompt}>
                  What should happen to the {Number(goal.current_amount).toFixed(2)} DT saved?
                </Text>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.returnBtn]}
                  onPress={() => handleDestroy('keep_in_savings')}
                  disabled={deleting}
                >
                  <Text style={styles.modalActionTitle}>RETURN TO SAVINGS</Text>
                  <Text style={styles.modalActionDesc}>
                    Keep money in total savings & release to available balance.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.discardBtn]}
                  onPress={() => handleDestroy('discard')}
                  disabled={deleting}
                >
                  <Text style={styles.modalActionTitle}>DISCARD MONEY</Text>
                  <Text style={styles.modalActionDesc}>
                    Money was spent or lost. Deduct from total savings.
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.discardBtn]}
                onPress={() => handleDestroy('keep_in_savings')}
                disabled={deleting}
              >
                <Text style={styles.modalActionTitle}>CONFIRM DELETION</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDestroyModal(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40, maxWidth: 540, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 200, justifyContent: 'center' },
  errorBox: {
    backgroundColor: 'rgba(186, 45, 29, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardComplete: {
    borderColor: colors.goals,
    borderLeftWidth: 4,
    borderLeftColor: colors.goals,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12 },
  statCol: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  deadlineText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  progressBarBg: { height: 10, backgroundColor: colors.progressBg, borderRadius: 5, overflow: 'hidden', marginTop: 12 },
  progressBarFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  progressComplete: { backgroundColor: colors.goals },
  percentText: { fontFamily: fonts.body, textAlign: 'right', marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted, letterSpacing: 2 },
  availableBadge: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 15,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  secondaryButton: { backgroundColor: colors.card, borderColor: colors.border },
  destroyButton: { backgroundColor: 'transparent', borderColor: colors.danger },
  destroyButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.danger, letterSpacing: 1 },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5 },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPrompt: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalActionBtn: {
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  returnBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  discardBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.danger,
  },
  modalActionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalActionDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});