import { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  getCategoryActualSpend,
  getEffectiveBudget,
  upsertBudget,
  getBudgetsForCurrentMonth,
  firstOfMonth,
} from '../lib/budgets';
import { colors, fonts, radii, spacing } from '../lib/theme';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';

const ROLLOVER_OPTIONS = [
  { value: 'reset', label: 'RESET' },
  { value: 'rollover', label: 'ROLLOVER' },
  { value: 'save_difference', label: 'SAVE DIFF' },
];

function getBudgetWarning(spent, effective) {
  if (!effective || effective <= 0) return null;
  const ratio = spent / effective;
  if (ratio > 1) return { msg: 'FWÄÄH?!', reaction: 'overBudget' };
  if (ratio >= 0.8) return { msg: '⚠ 80% OF BUDGET USED', reaction: 'warning' };
  return null;
}

export default function Budgets() {
  const { session } = useAuth();
  const [categories, setCategories] = useState([]);
  const [budgetRows, setBudgetRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeReaction, setActiveReaction] = useState(null);
  const [reactionText, setReactionText] = useState(null);
  const [shake, setShake] = useState(false);
  const reactionFired = useRef(false);

  const loadAll = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    reactionFired.current = false;
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'expense')
        .order('name');

      const existingBudgets = await getBudgetsForCurrentMonth(session.user.id);
      const budgetsByCategory = {};
      existingBudgets.forEach((b) => {
        budgetsByCategory[b.category_id] = b;
      });

      const rows = {};
      let worstWarning = null;
      for (const cat of cats || []) {
        const existing = budgetsByCategory[cat.id];
        const planned = existing ? Number(existing.planned_amount) : 0;
        const mode = existing ? existing.rollover_mode : 'reset';
        const spent = await getCategoryActualSpend(session.user.id, cat.id, firstOfMonth());
        const effective = existing ? await getEffectiveBudget(session.user.id, cat.id, planned) : 0;

        const warning = existing ? getBudgetWarning(spent, effective) : null;
        if (warning && (!worstWarning || warning.reaction === 'overBudget')) {
          worstWarning = warning;
        }

        rows[cat.id] = {
          plannedInput: planned ? String(planned) : '',
          mode,
          spent,
          effective,
          hasBudget: !!existing,
          warning,
        };
      }

      setCategories(cats || []);
      setBudgetRows(rows);

      if (!reactionFired.current && worstWarning) {
        setActiveReaction(worstWarning.reaction);
        setReactionText(worstWarning.msg);
        if (worstWarning.reaction === 'overBudget') {
          setShake(true);
        }
        reactionFired.current = true;
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  function updatePlannedInput(categoryId, value) {
    setBudgetRows((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], plannedInput: value },
    }));
  }

  function updateMode(categoryId, mode) {
    setBudgetRows((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], mode },
    }));
  }

  async function saveBudget(categoryId) {
    const row = budgetRows[categoryId];
    const planned = parseFloat(row.plannedInput);
    if (!planned || planned <= 0) {
      Alert.alert('Invalid amount', 'Enter a budget greater than 0.');
      return;
    }
    try {
      await upsertBudget(session.user.id, categoryId, planned, row.mode);
      loadAll();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>BUDGETS</Text>
        <Text style={styles.empty}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.container}
      data={categories}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>BUDGETS</Text>
          <View style={styles.characterRow}>
            <BudgetCharacter
              reaction={activeReaction}
              character={activeReaction ? undefined : 'master'}
              size="medium"
              animated
              shake={shake}
            />
            <ReactionText
              text={reactionText}
              visible={!!reactionText}
              onDone={() => {
                setReactionText(null);
                setActiveReaction(null);
              }}
            />
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No categories found. Create a category first.</Text>
        </View>
      }
      renderItem={({ item: cat }) => {
        const row = budgetRows[cat.id] || { plannedInput: '', mode: 'reset', spent: 0, effective: 0 };
        const overBudget = row.hasBudget && row.spent > row.effective;
        const pct = row.hasBudget && row.effective > 0 ? Math.round((row.spent / row.effective) * 100) : 0;

        return (
          <View style={[styles.card, overBudget && styles.cardDanger]}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              {row.warning && <Text style={styles.warningBadge}>{row.warning.msg}</Text>}
            </View>

            {row.hasBudget && (
              <>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%` }, overBudget && styles.progressDanger]} />
                </View>
                <View style={styles.budgetStats}>
                  <Text style={styles.budgetStat}>Spent: {row.spent.toFixed(2)}</Text>
                  <Text style={[styles.budgetStat, overBudget && styles.dangerText]}>
                    {overBudget ? 'Over' : 'Left'}: {Math.abs(row.effective - row.spent).toFixed(2)}
                  </Text>
                </View>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Monthly budget amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={row.plannedInput}
              onChangeText={(v) => updatePlannedInput(cat.id, v)}
            />

            <View style={styles.chipRow}>
              {ROLLOVER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, row.mode === opt.value && styles.chipSelected]}
                  onPress={() => updateMode(cat.id, opt.value)}
                >
                  <Text style={[styles.chipText, row.mode === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, { borderColor: colors.primary }]}
              onPress={() => saveBudget(cat.id)}
            >
              <Text style={styles.buttonText}>{row.hasBudget ? 'UPDATE' : 'SET BUDGET'}</Text>
            </TouchableOpacity>
          </View>
        );
      }}
      ListFooterComponent={
        <>
          <View style={{ height: 10 }} />
          <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => router.back()}>
            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>BACK</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: colors.background, maxWidth: 580, alignSelf: 'center', width: '100%' },
  container: { padding: 24, paddingTop: 60, maxWidth: 580, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.text, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 180 },
  empty: { fontFamily: fonts.body, textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDanger: { borderColor: colors.primaryBright },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  warningBadge: { fontFamily: fonts.display, fontSize: 14, color: colors.expense, letterSpacing: 1 },
  progressBarBg: { height: 6, backgroundColor: colors.progressBg, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: colors.income, borderRadius: 3 },
  progressDanger: { backgroundColor: colors.expense },
  budgetStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  budgetStat: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  dangerText: { color: colors.expense },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.cardSecondary,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, letterSpacing: 1 },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.text },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, letterSpacing: 1 },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
});