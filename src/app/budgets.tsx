import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { safeBack } from '../lib/nav';
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
import { resolveCharacterState } from '../lib/characterEngine';
import { showAlert } from '../lib/dialog';
import { useNetworkStatus } from '../lib/networkStatus';
import { cacheWrite, cacheRead, BUCKETS } from '../lib/offlineStore';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import NetworkBanner from '../components/NetworkBanner';

const ROLLOVER_OPTIONS = [
  { value: 'reset', label: 'RESET' },
  { value: 'rollover', label: 'ROLLOVER' },
  { value: 'save_difference', label: 'SAVE DIFF' },
];

export default function Budgets() {
  const auth: any = useAuth();
  const session = auth?.session;
  const { status, isOnline } = useNetworkStatus();
  const [categories, setCategories] = useState<any[]>([]);
  const [budgetRows, setBudgetRows] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [worstBudgetStatus, setWorstBudgetStatus] = useState<any>(null);

  const loadAll = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      if (isOnline) {
        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('type', 'expense')
          .order('name');

        const existingBudgets = await getBudgetsForCurrentMonth(session.user.id);
        const budgetsByCategory: Record<string, any> = {};
        existingBudgets.forEach((b: any) => {
          budgetsByCategory[b.category_id] = b;
        });

        const rows: Record<string, any> = {};
        let highestRatio = 0;
        let worstStatus: any = null;

        for (const cat of cats || []) {
          const existing = budgetsByCategory[cat.id];
          const planned = existing ? Number(existing.planned_amount) : 0;
          const mode = existing ? existing.rollover_mode : 'reset';
          const spent = await getCategoryActualSpend(session.user.id, cat.id, firstOfMonth());
          const effective = existing ? await getEffectiveBudget(session.user.id, cat.id, planned) : 0;

          const ratio = effective > 0 ? spent / effective : 0;
          const isOverBudget = effective > 0 && spent > effective;

          if (ratio > highestRatio && existing) {
            highestRatio = ratio;
            worstStatus = { spent, effective, ratio, isOverBudget };
          }

          rows[cat.id] = {
            plannedInput: planned ? String(planned) : '',
            mode,
            spent,
            effective,
            ratio,
            hasBudget: !!existing,
            isOverBudget,
          };
        }

        setCategories(cats || []);
        setBudgetRows(rows);
        setWorstBudgetStatus(worstStatus);

        // Cache for offline use
        await cacheWrite(session.user.id, BUCKETS.BUDGETS, {
          categories: cats || [],
          budgetRows: rows,
          worstBudgetStatus: worstStatus,
        });
      } else {
        // Offline: read from cache
        const cached = await cacheRead(session.user.id, BUCKETS.BUDGETS);
        if (cached) {
          setCategories(cached.categories || []);
          setBudgetRows(cached.budgetRows || {});
          setWorstBudgetStatus(cached.worstBudgetStatus || null);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load budgets:', err);
      // Try cached data
      const cached = await cacheRead(session.user.id, BUCKETS.BUDGETS);
      if (cached) {
        setCategories(cached.categories || []);
        setBudgetRows(cached.budgetRows || {});
        setWorstBudgetStatus(cached.worstBudgetStatus || null);
      }
    } finally {
      setLoading(false);
    }
  }, [session, isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const characterState: any = useMemo(() => {
    return resolveCharacterState({
      budgetStatus: worstBudgetStatus,
    });
  }, [worstBudgetStatus]);

  function updatePlannedInput(categoryId: string, value: string) {
    setBudgetRows((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], plannedInput: value },
    }));
  }

  function updateMode(categoryId: string, mode: string) {
    setBudgetRows((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], mode },
    }));
  }

  async function saveBudget(categoryId: string) {
    if (!isOnline) {
      showAlert('Offline', 'Connecting to the internet is required to update monthly budget limits.');
      return;
    }
    const row = budgetRows[categoryId];
    const planned = parseFloat(row.plannedInput);
    if (!planned || planned <= 0) {
      showAlert('Invalid amount', 'Enter a budget greater than 0.');
      return;
    }
    try {
      await upsertBudget(session.user.id, categoryId, planned, row.mode);
      loadAll();
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to save budget.');
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>BUDGET LIMITS</Text>
        <Text style={styles.empty}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.container}
      data={categories}
      keyExtractor={(item: any) => item.id}
      ListHeaderComponent={
        <>
          {/* Network banner */}
          <NetworkBanner status={status} />

          <Text style={styles.title}>BUDGET LIMITS</Text>
          <View style={styles.characterRow}>
            <BudgetCharacter
              assetId={characterState?.assetId}
              animationType={characterState?.animationType}
              size="medium"
              animated
              shake={characterState?.shake}
              isOverBudget={worstBudgetStatus?.isOverBudget || false}
            />
            <ReactionText
              text={characterState?.reactionText}
              visible={true}
              holdMs={999999}
            />
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No categories found. Create a category first.</Text>
        </View>
      }
      renderItem={({ item: cat }: any) => {
        const row = budgetRows[cat.id] || { plannedInput: '', mode: 'reset', spent: 0, effective: 0, ratio: 0, isOverBudget: false };
        const overBudget = row.hasBudget && row.isOverBudget;
        const warning = row.hasBudget && row.ratio >= 0.80 && row.ratio < 0.95;
        const critical = row.hasBudget && row.ratio >= 0.95 && row.ratio <= 1.0;
        const pct = row.hasBudget && row.effective > 0 ? Math.round(row.ratio * 100) : 0;

        return (
          <View style={[styles.card, overBudget && styles.cardDanger, critical && styles.cardDanger, warning && styles.cardWarning]}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryName} numberOfLines={1} adjustsFontSizeToFit>{cat.name}</Text>
              {overBudget ? (
                <Text style={styles.dangerBadge}>OVER BUDGET</Text>
              ) : critical ? (
                <Text style={styles.criticalBadge}>95% CRITICAL</Text>
              ) : warning ? (
                <Text style={styles.warningBadge}>80% CAUTION</Text>
              ) : null}
            </View>

            {row.hasBudget && (
              <>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(pct, 100)}%` },
                      warning && { backgroundColor: colors.warning },
                      (critical || overBudget) && styles.progressDanger,
                    ]}
                  />
                </View>
                <View style={styles.budgetStats}>
                  <Text style={styles.budgetStat} numberOfLines={1} adjustsFontSizeToFit>Spent: {row.spent.toFixed(2)} DT</Text>
                  <Text style={[styles.budgetStat, overBudget && styles.dangerText]} numberOfLines={1} adjustsFontSizeToFit>
                    {overBudget ? 'Over' : 'Left'}: {Math.abs(row.effective - row.spent).toFixed(2)} DT
                  </Text>
                </View>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Monthly budget amount (DT)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={row.plannedInput}
              onChangeText={(text) => updatePlannedInput(cat.id, text)}
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
          <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/')}>
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
  loadingContainer: { flex: 1, padding: 24, paddingTop: 52, backgroundColor: colors.background, maxWidth: 580, alignSelf: 'center', width: '100%' },
  container: { padding: 24, paddingTop: 52, maxWidth: 580, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 200, justifyContent: 'center' },
  empty: { fontFamily: fonts.body, textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardWarning: { borderColor: colors.warning, borderLeftWidth: 4, borderLeftColor: colors.warning },
  cardDanger:  { borderColor: colors.danger, borderLeftWidth: 4, borderLeftColor: colors.danger },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  categoryName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, flex: 1 },
  warningBadge:  { fontFamily: fonts.display, fontSize: 14, color: colors.warning, letterSpacing: 1, flexShrink: 1 },
  criticalBadge: { fontFamily: fonts.display, fontSize: 14, color: colors.danger, letterSpacing: 1, flexShrink: 1 },
  dangerBadge:   { fontFamily: fonts.display, fontSize: 14, color: colors.danger, letterSpacing: 1, flexShrink: 1 },
  progressBarBg: { height: 6, backgroundColor: colors.progressBg, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: colors.income, borderRadius: 3 },
  progressDanger: { backgroundColor: colors.danger },
  budgetStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  budgetStat: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
  dangerText: { color: colors.danger, fontFamily: fonts.bodyBold },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.cardSecondary,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, letterSpacing: 1 },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.textPrimary },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, letterSpacing: 1, textAlign: 'center' },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
});