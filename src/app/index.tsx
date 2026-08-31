import { useState, useCallback, useRef, useMemo } from 'react';
import { Redirect, Link, useFocusEffect } from 'expo-router';
import {
  View, ActivityIndicator, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { recalculateCurrentMonthLedger, getTotalReservedForGoals } from '../lib/savings';
import { ensureRecurringEntriesForThisMonth } from '../lib/recurring';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { resolveCharacterState } from '../lib/characterEngine';
import { getRacksOnly } from '../lib/slang';
import { showAlert } from '../lib/dialog';
import { getDailyBudget, getDailyLockEnabled, getTodaySpending, getDailyStatus } from '../lib/dailyBudget';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import BudgetCard from '../components/BudgetCard';
import GlobalCornerFigure from '../components/GlobalCornerFigure';
import DailyMeter from '../components/DailyMeter';

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  return {
    start: `${year}-${monthStr}-01`,
    end:   `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

function getCurrentMonthName() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

export default function Home() {
  const auth = useAuth() as any;
  const session = auth?.session;
  const loading = auth?.loading;

  // ── Financial state ──────────────────────────────────────────────
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [accumulatedSavings, setAccumulatedSavings] = useState(0);
  const [reservedForGoals, setReservedForGoals] = useState(0);

  // ── Daily budget state ───────────────────────────────────────────
  const [dailySpent, setDailySpent] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [dailyLockEnabled, setDailyLockEnabled] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(true);

  // ── Logout animation ─────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showFarewell, setShowFarewell] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    try {
      await ensureRecurringEntriesForThisMonth(session.user.id);

      const { start, end } = getMonthRange();
      const [incomeRes, expenseRes] = await Promise.all([
        supabase.from('income_entries').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
        supabase.from('expenses').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
      ]);

      const incomeTotal  = (incomeRes.data  || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      const expenseTotal = (expenseRes.data || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0);

      const accumulated = await recalculateCurrentMonthLedger(session.user.id, incomeTotal, expenseTotal);
      const reserved    = await getTotalReservedForGoals(session.user.id);

      setIncome(incomeTotal);
      setExpenses(expenseTotal);
      setAccumulatedSavings(accumulated);
      setReservedForGoals(reserved);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      showAlert('Error loading data', err?.message || 'Something went wrong.');
    } finally {
      setFetching(false);
    }
  }, [session]);

  const loadDailyData = useCallback(async () => {
    if (!session) return;
    setDailyLoading(true);
    try {
      const [budget, lock, spent] = await Promise.all([
        getDailyBudget(),
        getDailyLockEnabled(),
        getTodaySpending(session.user.id),
      ]);
      setDailyBudget(budget);
      setDailyLockEnabled(lock);
      setDailySpent(spent);
    } catch (_) {
      // Non-critical: daily meter degrades gracefully
    } finally {
      setDailyLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadDailyData();
    }, [loadData, loadDailyData])
  );

  async function handleLogout() {
    setShowFarewell(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(async () => {
      await supabase.auth.signOut();
    });
  }

  const remaining = income - expenses;
  const available = accumulatedSavings - reservedForGoals;

  // ── Daily budget metrics ─────────────────────────────────────────
  const dailyBudgetRatio     = dailyBudget ? dailySpent / dailyBudget : 0;
  const isDailyBudgetExceeded = dailyBudget ? dailySpent >= dailyBudget : false;
  const dailyStatus          = getDailyStatus(dailySpent, dailyBudget);

  // ── Character State Resolution (P0–P7 Priority Resolver) ────────
  const characterState: any = useMemo(() => {
    return resolveCharacterState({
      incomeTotal:     income,
      expenseTotal:    expenses,
      remaining,
      availableSavings: available,
      // Daily budget context
      dailySpent,
      dailyBudget:     dailyBudget ?? undefined,
      dailyBudgetRatio,
      isDailyBudgetExceeded,
    });
  }, [income, expenses, remaining, available, dailySpent, dailyBudget, dailyBudgetRatio, isDailyBudgetExceeded]);

  const totalRacks = useMemo(() => getRacksOnly(accumulatedSavings), [accumulatedSavings]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      {/* Decorative corner figure */}
      <GlobalCornerFigure assetId="robert_guidance" size={65} opacity={0.2} position="top-right" />

      {/* Robert Freeman Logout Farewell Overlay */}
      {showFarewell && (
        <View style={styles.farewellOverlay}>
          <BudgetCharacter assetId="robert_reassure" size="large" animated={false} />
          <Text style={styles.farewellText}>STAY DISCIPLINED.</Text>
        </View>
      )}

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>BUDGET BUDDY</Text>
          <Text style={styles.monthLabel}>{getCurrentMonthName()}</Text>
        </View>

        {/* ── Character & Reaction Section ────────────────────── */}
        <View style={styles.characterSection}>
          <BudgetCharacter
            assetId={characterState.assetId}
            animationType={characterState.animationType}
            size="large"
            animated
            shake={characterState.shake}
            pulse={characterState.pulse}
            isOverBudget={remaining < 0}
          />
          {/* ReactionText container with fixed height = ZERO layout shift */}
          <ReactionText
            text={characterState.reactionText}
            visible={true}
            holdMs={999999}
          />
        </View>

        {/* ── Total Savings Hero Card ──────────────────────────── */}
        <BudgetCard accent={remaining >= 0} danger={remaining < 0} style={styles.savingsCard}>
          <Text style={styles.cardSectionLabel}>TOTAL SAVINGS</Text>
          {fetching ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.heroNumber}>{accumulatedSavings.toFixed(2)} DT</Text>
              {totalRacks && <Text style={styles.racksTag}>{totalRacks}</Text>}
              <Text style={styles.heroSub}>
                {remaining >= 0 ? '+' : ''}{remaining.toFixed(2)} DT THIS MONTH
              </Text>
            </>
          )}
        </BudgetCard>

        {/* ── Daily Spending Meter ─────────────────────────────── */}
        <DailyMeter
          dailySpent={dailySpent}
          dailyBudget={dailyBudget}
          lockEnabled={dailyLockEnabled}
          loading={dailyLoading}
        />

        {/* ── Income / Spent row ───────────────────────────────── */}
        {!fetching && (
          <View style={styles.statRow}>
            <View style={[styles.statCard, { marginRight: 6 }]}>
              <Text style={styles.statCardLabel}>INCOME</Text>
              <Text style={[styles.statCardValue, { color: colors.income }]}>
                +{income.toFixed(2)} DT
              </Text>
            </View>
            <View style={[styles.statCard, { marginLeft: 6 }]}>
              <Text style={styles.statCardLabel}>EXPENSES</Text>
              <Text style={[styles.statCardValue, expenses > income && styles.dangerText]}>
                -{expenses.toFixed(2)} DT
              </Text>
            </View>
          </View>
        )}

        {/* ── Available / Reserved row ──────────────────────────── */}
        {!fetching && (
          <View style={styles.statRow}>
            <View style={[styles.statCard, { marginRight: 6 }]}>
              <Text style={styles.statCardLabel}>AVAILABLE BALANCE</Text>
              <Text style={[styles.statCardValue, available < 0 && styles.dangerText]}>
                {available.toFixed(2)} DT
              </Text>
            </View>
            <View style={[styles.statCard, { marginLeft: 6 }]}>
              <Text style={styles.statCardLabel}>LOCKED FOR GOALS</Text>
              <Text style={[styles.statCardValue, { color: colors.goals }]}>
                {reservedForGoals.toFixed(2)} DT
              </Text>
            </View>
          </View>
        )}

        {/* ── Primary Action Grid (2-Column) ───────────────────── */}
        <View style={styles.actionGrid}>
          <Link href="/add-income" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.gridBtn, styles.incomeGridBtn])}>
              <Text style={styles.gridBtnText}>+ ADD INCOME</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/add-expense" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.gridBtn, styles.expenseGridBtn])}>
              <Text style={styles.gridBtnText}>- ADD EXPENSE</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.actionGrid}>
          <Link href="/goals" asChild>
            <TouchableOpacity style={styles.gridBtn}>
              <Text style={styles.gridBtnText}>SAVINGS GOALS</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/budgets" asChild>
            <TouchableOpacity style={styles.gridBtn}>
              <Text style={styles.gridBtnText}>BUDGETS</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── Dedicated Analytics & Settings Navigation ────────── */}
        <View style={styles.navSection}>
          <Link href={'/statistics' as any} asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn, styles.statsBtn])}>
              <Text style={styles.statsBtnText}>📊 ANALYTICS & TRENDS</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.navGap} />
          <View style={styles.navRow}>
            <Link href="/categories" asChild>
              <TouchableOpacity style={StyleSheet.flatten([styles.navBtn, styles.navHalf])}>
                <Text style={styles.navBtnText}>CATEGORIES</Text>
              </TouchableOpacity>
            </Link>
            <View style={{ width: 8 }} />
            <Link href="/settings" asChild>
              <TouchableOpacity style={StyleSheet.flatten([styles.navBtn, styles.navHalf, styles.settingsBtn])}>
                <Text style={styles.settingsBtnText}>⚙ SETTINGS</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* ── Logout Button ────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  wrapper: { flex: 1, backgroundColor: colors.background, position: 'relative' },
  screen:  { flex: 1 },
  scrollContent: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40, maxWidth: 580, alignSelf: 'center', width: '100%' },

  // Header
  header:     { alignItems: 'center', marginBottom: spacing.md },
  appTitle:   { fontFamily: fonts.display, fontSize: 42, color: colors.textPrimary, letterSpacing: 4 },
  monthLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primary, letterSpacing: 3, marginTop: 2 },

  // Character section with fixed minimum height
  characterSection: { alignItems: 'center', marginBottom: spacing.md, minHeight: 250, justifyContent: 'center' },

  // Savings hero card
  savingsCard:      { alignItems: 'center', paddingVertical: spacing.lg, position: 'relative', overflow: 'hidden' },
  cardSectionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 8 },
  heroNumber:       { fontFamily: fonts.bodyBold, fontSize: 42, color: colors.textPrimary },
  racksTag:         { fontFamily: fonts.display, fontSize: 18, color: colors.primary, letterSpacing: 2, marginTop: 2 },
  heroSub:          { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4, letterSpacing: 1 },

  // Stat row cards
  statRow:          { flexDirection: 'row', marginBottom: spacing.md },
  statCard:         {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statCardLabel:    { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
  statCardValue:    { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  dangerText:       { color: colors.danger },

  // Action Grid
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gridBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  incomeGridBtn:  { borderColor: colors.income },
  expenseGridBtn: { borderColor: colors.expense },
  gridBtnText:    { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textPrimary, letterSpacing: 1 },

  // Navigation buttons
  navSection: { marginTop: spacing.sm },
  navBtn: {
    backgroundColor: colors.card,
    borderRadius:    radii.sm,
    borderWidth:     1.5,
    borderColor:     colors.border,
    paddingVertical: 14,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       48,
  },
  navRow:        { flexDirection: 'row' },
  navHalf:       { flex: 1 },
  statsBtn:      { borderColor: colors.primary, backgroundColor: colors.cardElevated },
  statsBtnText:  { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryBright, letterSpacing: 1.2 },
  navBtnText:    { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary, letterSpacing: 1.2 },
  settingsBtn:   { borderColor: colors.primary },
  settingsBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary, letterSpacing: 1.2 },
  navGap:        { height: 8 },

  // Logout
  logoutBtn:  { marginTop: spacing.xl, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted, letterSpacing: 2 },

  // Farewell overlay
  farewellOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, zIndex: 100,
  },
  farewellText: { fontFamily: fonts.display, fontSize: 44, color: colors.textPrimary, letterSpacing: 4, marginTop: spacing.md },
});