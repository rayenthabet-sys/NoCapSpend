import { useState, useCallback, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { safeBack } from '../lib/nav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { getCategoryActualSpend, getEffectiveBudget, firstOfMonth } from '../lib/budgets';
import { resolveCharacterState } from '../lib/characterEngine';
import { getDailyBudget, getDailyLockEnabled, getTodaySpending, getDailyStatus } from '../lib/dailyBudget';
import { showAlert } from '../lib/dialog';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function AddExpense() {
  const auth: any = useAuth();
  const session = auth?.session;
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeReactionState, setActiveReactionState] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [blockMsg, setBlockMsg] = useState('');

  // Daily budget state for lock check and context
  const [dailySpent, setDailySpent] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [lockEnabled, setLockEnabled] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('type', 'expense')
      .order('name');
    if (!error && data) setCategories(data);
  }, [session]);

  const loadDailyContext = useCallback(async () => {
    if (!session) return;
    const [budget, lock, spent] = await Promise.all([
      getDailyBudget(),
      getDailyLockEnabled(),
      getTodaySpending(session.user.id),
    ]);
    setDailyBudget(budget);
    setLockEnabled(lock);
    setDailySpent(spent);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadDailyContext();
    }, [loadCategories, loadDailyContext])
  );

  async function saveExpense() {
    setBlockMsg('');
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      showAlert('Invalid amount', 'Enter a number greater than 0.');
      return;
    }

    // ── Daily expense lock check ────────────────────────────────
    if (lockEnabled && dailyBudget && dailyBudget > 0) {
      if (dailySpent >= dailyBudget) {
        setBlockMsg('DAILY LIMIT REACHED. EXPENSES ARE LOCKED.');
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.from('expenses').insert({
      user_id: session.user.id,
      amount: numericAmount,
      note: note.trim() || null,
      category_id: selectedCategoryId,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? 'monthly' : null,
    });

    if (error) {
      setLoading(false);
      showAlert('Error', error.message);
      return;
    }

    // ── Refresh today's spending after saving ───────────────────
    const newDailySpent = dailySpent + numericAmount;
    setDailySpent(newDailySpent);

    // ── Budget status for character context ─────────────────────
    let isOverBudget = false;
    let budgetSpent = 0;
    let budgetEffective = 0;

    if (selectedCategoryId) {
      try {
        budgetSpent     = await getCategoryActualSpend(session.user.id, selectedCategoryId, firstOfMonth());
        budgetEffective = await getEffectiveBudget(session.user.id, selectedCategoryId, 0);
        if (budgetEffective > 0 && budgetSpent > budgetEffective) {
          isOverBudget = true;
        }
      } catch (_) {}
    }

    // ── Daily budget context for character resolver ─────────────
    const dailyBudgetRatio     = dailyBudget ? newDailySpent / dailyBudget : 0;
    const isDailyBudgetExceeded = dailyBudget ? newDailySpent >= dailyBudget : false;

    const reaction: any = resolveCharacterState({
      lastExpenseAmount: numericAmount,
      budgetStatus: {
        spent:       budgetSpent,
        effective:   budgetEffective,
        ratio:       budgetEffective > 0 ? budgetSpent / budgetEffective : 0,
        isOverBudget,
      },
      eventTrigger: 'expenseAdded',
      dailySpent:   newDailySpent,
      dailyBudget:  dailyBudget ?? undefined,
      dailyBudgetRatio,
      isDailyBudgetExceeded,
    });

    setActiveReactionState(reaction);
    setSuccessMsg(`-${numericAmount.toFixed(2)} DT recorded.`);
    setLoading(false);

    // Reset form — stay on screen
    setAmount('');
    setNote('');
    setSelectedCategoryId(null);
    setIsRecurring(false);

    setTimeout(() => {
      setSuccessMsg('');
      setActiveReactionState(null);
    }, (reaction?.durationMs || 2000) + 500);

    // ── No automatic navigation. User presses BACK to leave. ──
  }

  const dailyStatus = getDailyStatus(dailySpent, dailyBudget);
  const isLocked = lockEnabled && dailyBudget !== null && dailySpent >= dailyBudget;

  const currentAssetId = activeReactionState?.assetId || 'riley_light';
  const currentAnimType = activeReactionState?.animationType || 'native';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GlobalCornerFigure assetId="riley_spend" size={60} opacity={0.25} position="top-right" />

      <Text style={styles.title}>ADD EXPENSE</Text>

      {/* ── Daily meter inline indicator ──────────────────────── */}
      {dailyBudget !== null && (
        <View style={[
          styles.dailyBar,
          dailyStatus.state === 'exceeded' && styles.dailyBarDanger,
          dailyStatus.state === 'critical' && styles.dailyBarCritical,
        ]}>
          <Text style={styles.dailyBarLabel}>
            TODAY: {dailySpent.toFixed(2)} / {dailyBudget.toFixed(2)} DT
            {isLocked ? '  🔒 LOCKED' : `  (${dailyStatus.pct}%)`}
          </Text>
        </View>
      )}

      {/* ── Lock block message ────────────────────────────────── */}
      {blockMsg ? (
        <View style={styles.blockBanner}>
          <Text style={styles.blockText}>🔒  {blockMsg}</Text>
        </View>
      ) : null}

      {/* ── Success banner ────────────────────────────────────── */}
      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓  {successMsg}</Text>
        </View>
      ) : null}

      <View style={styles.characterRow}>
        <BudgetCharacter
          assetId={currentAssetId}
          animationType={currentAnimType}
          size="medium"
          animated
          shake={activeReactionState?.shake || false}
          pulse={activeReactionState?.pulse || false}
        />
        <ReactionText
          text={activeReactionState?.reactionText || null}
          visible={!!activeReactionState}
          onDone={() => setActiveReactionState(null)}
        />
      </View>

      <TextInput
        style={[styles.input, isLocked && styles.inputDisabled]}
        placeholder="Amount in DT (e.g. 15.00)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        editable={!isLocked}
      />

      <TextInput
        style={[styles.input, isLocked && styles.inputDisabled]}
        placeholder="Note (e.g. Food, Merch, Studio)"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
        editable={!isLocked}
      />

      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.chipRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCategoryId === cat.id && styles.chipSelected]}
            onPress={() => !isLocked && setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
          >
            <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextSelected]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
        {categories.length === 0 && (
          <Text style={styles.noCategories}>No categories yet — you can still save without one.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.recurringRow} onPress={() => !isLocked && setIsRecurring(!isRecurring)}>
        <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]} />
        <Text style={styles.recurringLabel}>Repeats monthly (Recurring Expense)</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, isLocked && styles.buttonDisabled]}
        onPress={saveExpense}
        disabled={loading || isLocked}
      >
        <Text style={styles.buttonText}>
          {isLocked ? '🔒 EXPENSES LOCKED' : loading ? 'LOGGING...' : 'LOG EXPENSE'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/')}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>← BACK</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, position: 'relative' },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40, maxWidth: 540, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.textPrimary, textAlign: 'center', letterSpacing: 2.5, marginBottom: 8 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 200, justifyContent: 'center' },

  dailyBar: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  dailyBarDanger:   { borderColor: colors.danger, backgroundColor: '#1A0E0E' },
  dailyBarCritical: { borderColor: '#E8793D', backgroundColor: '#1A1008' },
  dailyBarLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },

  blockBanner: {
    backgroundColor: '#1A0A0A',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  blockText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.danger, letterSpacing: 1 },

  successBanner: {
    backgroundColor: '#0D1F0D',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.income,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  successText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.income, letterSpacing: 1 },

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
  inputDisabled: { opacity: 0.45 },

  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted, marginBottom: 10, letterSpacing: 1.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.chip,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.cardSecondary,
    marginBottom: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.cardElevated, borderColor: colors.expense },
  chipText: { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: colors.textPrimary, fontFamily: fonts.bodySemiBold },
  noCategories: { fontFamily: fonts.body, color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, minHeight: 44 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, marginRight: 10 },
  checkboxChecked: { backgroundColor: colors.expense, borderColor: colors.danger },
  recurringLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton:  { backgroundColor: colors.cardElevated, borderColor: colors.expense },
  buttonDisabled: { opacity: 0.45, borderColor: colors.danger },
  ghostButton:    { backgroundColor: colors.card, borderColor: colors.border },
  buttonText:     { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5 },
});