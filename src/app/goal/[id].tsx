import { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { getAvailableSavings } from '../../lib/savings';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import BudgetCharacter from '../../components/BudgetCharacter';
import ReactionText from '../../components/ReactionText';

export default function GoalDetail() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [goal, setGoal] = useState(null);
  const [availableSavings, setAvailableSavings] = useState(0);
  const [contributionAmount, setContributionAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  const [reactionText, setReactionText] = useState(null);
  const [pulse, setPulse] = useState(false);
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
        setActiveReaction('goalCompleted');
        setReactionText('GOAL REACHED');
        setPulse(true);
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
      setErrorMessage(`Not enough available balance. You have $${available.toFixed(2)} available.`);
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

      const newCurrentAmount = Number(goal.current_amount) + amount;
      const { error: updateError } = await supabase
        .from('goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', id);

      if (updateError) throw updateError;

      setContributionAmount('');
      if (newCurrentAmount >= Number(goal.target_amount)) {
        setActiveReaction('goalCompleted');
        setReactionText('GOAL REACHED');
        setPulse(true);
      } else {
        setActiveReaction('saving');
        setReactionText('SAVINGS ADDED');
        setPulse(true);
      }
      await loadGoal();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to contribute amount.');
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
    if (amount > Number(goal.current_amount)) {
      setErrorMessage(`This goal only has $${Number(goal.current_amount).toFixed(2)} saved.`);
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

      const newCurrentAmount = Number(goal.current_amount) - amount;
      const { error: updateError } = await supabase
        .from('goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', id);

      if (updateError) throw updateError;

      setWithdrawAmount('');
      setActiveReaction('expenseAdded');
      setReactionText('WITHDRAWN');
      await loadGoal();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to withdraw.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDestroy(action) {
    setDeleting(true);
    setErrorMessage('');
    try {
      const currentSaved = Number(goal.current_amount || 0);

      if (action === 'discard' && currentSaved > 0) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from('expenses').insert({
          user_id: session.user.id,
          amount: currentSaved,
          note: `Discarded goal savings: ${goal.name}`,
          date: today,
        });
      }

      await supabase.from('goal_contributions').delete().eq('goal_id', id);
      const { error: deleteError } = await supabase.from('goals').delete().eq('id', id);
      if (deleteError) throw deleteError;

      setShowDestroyModal(false);
      router.back();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete goal.');
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

  const progress = Math.min(goal.current_amount / goal.target_amount, 1);
  const percent = Math.round(progress * 100);
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
  const isComplete = Number(goal.current_amount) >= Number(goal.target_amount);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{goal.name}</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter
          reaction={activeReaction}
          character={activeReaction ? undefined : 'master'}
          size="medium"
          animated
          pulse={pulse}
        />
        <ReactionText
          text={reactionText}
          visible={!!reactionText}
          onDone={() => setReactionText(null)}
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
            <Text style={styles.statValue}>${Number(goal.target_amount).toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>SAVED</Text>
            <Text style={styles.statValue}>${Number(goal.current_amount).toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>LEFT</Text>
            <Text style={styles.statValue}>${remaining.toFixed(2)}</Text>
          </View>
        </View>
        {goal.deadline && <Text style={styles.deadlineText}>Deadline: {goal.deadline}</Text>}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percent}%` }, isComplete && styles.progressComplete]} />
        </View>
        <Text style={styles.percentText}>{percent}% complete</Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>CONTRIBUTE</Text>
        <Text style={styles.availableBadge}>Available: ${availableSavings.toFixed(2)}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Amount to add"
        placeholderTextColor={colors.textSecondary}
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
        placeholderTextColor={colors.textSecondary}
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
      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => router.back()}>
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
              {goal.name} — ${Number(goal.current_amount).toFixed(2)} saved
            </Text>

            {Number(goal.current_amount) > 0 ? (
              <>
                <Text style={styles.modalPrompt}>
                  What should happen to the ${Number(goal.current_amount).toFixed(2)} saved?
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
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.text, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 180 },
  errorBox: {
    backgroundColor: 'rgba(176, 0, 32, 0.15)',
    borderWidth: 1,
    borderColor: colors.expense,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.body, color: colors.expense, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardComplete: {
    borderColor: colors.goals,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12 },
  statCol: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  deadlineText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  progressBarBg: { height: 10, backgroundColor: colors.progressBg, borderRadius: 5, overflow: 'hidden', marginTop: 12 },
  progressBarFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  progressComplete: { backgroundColor: colors.goals },
  percentText: { fontFamily: fonts.body, textAlign: 'right', marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted, letterSpacing: 2 },
  availableBadge: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  secondaryButton: { backgroundColor: colors.card, borderColor: colors.border },
  destroyButton: { backgroundColor: 'transparent', borderColor: colors.expense },
  destroyButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.expense, letterSpacing: 1 },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, letterSpacing: 1.5 },
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalActionBtn: {
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  returnBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.textSecondary,
  },
  discardBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
  },
  modalActionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
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