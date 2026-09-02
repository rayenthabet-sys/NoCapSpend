import { useState, useCallback, useRef, useMemo } from 'react';
import { Redirect, Link, useFocusEffect } from 'expo-router';
import {
  View, ActivityIndicator, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { recalculateCurrentMonthLedger, getTotalReservedForGoals } from '../lib/savings';
import { ensureRecurringEntriesForThisMonth } from '../lib/recurring';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { resolveCharacterState } from '../lib/characterEngine';
import { getRacksOnly } from '../lib/slang';
import {
  getDailyBudget,
  getDailyLockEnabled,
  getTodaySpending,
  getDailyStatus,
  getTodayDateString,
  getMonthlyDailyCarryover,
} from '../lib/dailyBudget';
import { useNetworkStatus } from '../lib/networkStatus';
import {
  cacheWrite,
  cacheRead,
  BUCKETS,
  getPendingTransactions,
  getOfflineTodaySpending,
  getPendingTodaySpending,
} from '../lib/offlineStore';
import { syncPendingTransactions } from '../lib/syncManager';
import BudgetCharacter from '../components/BudgetCharacter';
import DailyMeter from '../components/DailyMeter';
import NetworkBanner from '../components/NetworkBanner';
import AdviceCard from '../components/AdviceCard';
import NavigationDrawer from '../components/NavigationDrawer';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

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

/** Format a YYYY-MM-DD date string for display in the recent tx list. */
function formatTxDate(dateStr: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
}

interface RecentTx {
  type:   'income' | 'expense';
  label:  string;
  date:   string;
  amount: number;
}

// ─────────────────────────────────────────────────────────────────
// Dashboard Screen
// ─────────────────────────────────────────────────────────────────

export default function Home() {
  const auth    = useAuth() as any;
  const session = auth?.session;
  const loading = auth?.loading;
  const { status, isOnline } = useNetworkStatus();

  // ── Financial state ──────────────────────────────────────────────
  const [income,             setIncome]             = useState(0);
  const [expenses,           setExpenses]           = useState(0);
  const [fetching,           setFetching]           = useState(true);
  const [accumulatedSavings, setAccumulatedSavings] = useState(0);
  const [reservedForGoals,   setReservedForGoals]   = useState(0);
  // Display-only — last 3 transactions for the recent transactions section
  const [recentTx,           setRecentTx]           = useState<RecentTx[]>([]);

  // ── Daily budget state ───────────────────────────────────────────
  const [dailySpent,       setDailySpent]       = useState(0);
  const [dailyBudget,      setDailyBudget]      = useState<number | null>(null);
  const [dailyLockEnabled, setDailyLockEnabled] = useState(false);
  const [dailyLoading,     setDailyLoading]     = useState(true);
  const [dailyCarryover,   setDailyCarryover]   = useState<{ balance: number; label: string; type: 'shortfall' | 'surplus' | 'target' } | null>(null);

  // ── Navigation Drawer state ──────────────────────────────────────
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ── Logout fade animation ────────────────────────────────────────
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const [showFarewell, setShowFarewell] = useState(false);

  // ── Auto-sync ────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (!session || !isOnline) return;
    try { await syncPendingTransactions(session.user.id); }
    catch (err) { console.warn('[Home] auto-sync error:', err); }
  }, [session, isOnline]);

  // ── Data loading ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    try {
      if (isOnline) {
        await triggerSync();
        await ensureRecurringEntriesForThisMonth(session.user.id);

        const { start, end } = getMonthRange();
        // 'source' and 'note' added for recent-tx labels only — amounts unchanged
        const [incomeRes, expenseRes] = await Promise.all([
          supabase.from('income_entries').select('amount, date, source').eq('user_id', session.user.id).gte('date', start).lte('date', end),
          supabase.from('expenses').select('amount, date, note').eq('user_id', session.user.id).gte('date', start).lte('date', end),
        ]);

        const serverIncomeTotal  = (incomeRes.data  || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0);
        const serverExpenseTotal = (expenseRes.data || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0);

        const accumulated = await recalculateCurrentMonthLedger(session.user.id, serverIncomeTotal, serverExpenseTotal);
        const reserved    = await getTotalReservedForGoals(session.user.id);

        const pending = await getPendingTransactions(session.user.id);
        const pendingIncome = pending
          .filter(tx => tx.type === 'income'  && tx.date >= start && tx.date <= end && tx.syncStatus !== 'failed')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const pendingExpenses = pending
          .filter(tx => tx.type === 'expense' && tx.date >= start && tx.date <= end && tx.syncStatus !== 'failed')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const totalInc = serverIncomeTotal + pendingIncome;
        const totalExp = serverExpenseTotal + pendingExpenses;

        setIncome(totalInc);
        setExpenses(totalExp);
        setAccumulatedSavings(accumulated + (pendingIncome - pendingExpenses));
        setReservedForGoals(reserved);

        await cacheWrite(session.user.id, BUCKETS.DASHBOARD, {
          income: serverIncomeTotal,
          expenses: serverExpenseTotal,
          accumulated,
          reserved,
        });

        const today = getTodayDateString();
        const todayExpenses = (expenseRes.data || []).filter((r: any) => r.date === today);
        await cacheWrite(session.user.id, BUCKETS.EXPENSES_TODAY, todayExpenses);

        // Derive recent transactions — display only, no financial impact
        const allTx: RecentTx[] = [
          ...(incomeRes.data  || []).map((r: any) => ({ type: 'income'  as const, label: r.source || 'Income',  date: r.date, amount: Number(r.amount) })),
          ...(expenseRes.data || []).map((r: any) => ({ type: 'expense' as const, label: r.note   || 'Expense', date: r.date, amount: Number(r.amount) })),
        ];
        allTx.sort((a, b) => b.date.localeCompare(a.date));
        setRecentTx(allTx.slice(0, 3));

      } else {
        // ── Offline: load from cache ─────────────────────────────
        const cached = await cacheRead(session.user.id, BUCKETS.DASHBOARD);
        const { start, end } = getMonthRange();
        const pending = await getPendingTransactions(session.user.id);

        const pendingIncome = pending
          .filter(tx => tx.type === 'income'  && tx.date >= start && tx.date <= end && tx.syncStatus !== 'failed')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const pendingExpenses = pending
          .filter(tx => tx.type === 'expense' && tx.date >= start && tx.date <= end && tx.syncStatus !== 'failed')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        if (cached) {
          setIncome((cached.income || 0) + pendingIncome);
          setExpenses((cached.expenses || 0) + pendingExpenses);
          setAccumulatedSavings((cached.accumulated || 0) + (pendingIncome - pendingExpenses));
          setReservedForGoals(cached.reserved || 0);
        } else {
          setIncome(pendingIncome);
          setExpenses(pendingExpenses);
          setAccumulatedSavings(pendingIncome - pendingExpenses);
          setReservedForGoals(0);
        }

        // Offline recent tx from pending queue (display only)
        const offlineTx: RecentTx[] = pending
          .filter(tx => tx.syncStatus !== 'failed')
          .slice(-3)
          .reverse()
          .map(tx => ({
            type:   tx.type as 'income' | 'expense',
            label:  (tx.type === 'income' ? (tx as any).source : (tx as any).note) || (tx.type === 'income' ? 'Income' : 'Expense'),
            date:   tx.date,
            amount: Number(tx.amount),
          }));
        setRecentTx(offlineTx);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      const cached = await cacheRead(session.user.id, BUCKETS.DASHBOARD);
      if (cached) {
        setIncome(cached.income || 0);
        setExpenses(cached.expenses || 0);
        setAccumulatedSavings(cached.accumulated || 0);
        setReservedForGoals(cached.reserved || 0);
      }
    } finally {
      setFetching(false);
    }
  }, [session, isOnline, triggerSync]);

  const loadDailyData = useCallback(async () => {
    if (!session) return;
    setDailyLoading(true);
    try {
      const [budget, lock] = await Promise.all([getDailyBudget(), getDailyLockEnabled()]);
      setDailyBudget(budget);
      setDailyLockEnabled(lock);

      let spent = 0;
      if (isOnline) {
        const [serverSpent, pendingSpent] = await Promise.all([
          getTodaySpending(session.user.id),
          getPendingTodaySpending(session.user.id),
        ]);
        spent = serverSpent + pendingSpent;
      } else {
        spent = await getOfflineTodaySpending(session.user.id);
      }
      setDailySpent(spent);

      // Load informational month balance carryover
      if (budget && budget > 0) {
        const carryover = await getMonthlyDailyCarryover(session.user.id, budget);
        setDailyCarryover(carryover);
      } else {
        setDailyCarryover(null);
      }
    } catch (_) { /* non-critical */ }
    finally { setDailyLoading(false); }
  }, [session, isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadDailyData();
    }, [loadData, loadDailyData])
  );

  async function handleLogout() {
    setShowFarewell(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 800, useNativeDriver: true })
      .start(async () => { await supabase.auth.signOut(); });
  }

  // ── Derived financial values ─────────────────────────────────────
  const remaining = income - expenses;
  const available = accumulatedSavings - reservedForGoals;

  // ── Daily budget metrics ─────────────────────────────────────────
  const dailyBudgetRatio      = dailyBudget ? dailySpent / dailyBudget : 0;
  const isDailyBudgetExceeded = dailyBudget ? dailySpent >= dailyBudget : false;
  // getDailyStatus used by DailyMeter internally — kept here for character resolution
  getDailyStatus(dailySpent, dailyBudget);

  // ── Character State Resolution (P0–P7 — UNCHANGED) ──────────────
  const characterState: any = useMemo(() => resolveCharacterState({
    incomeTotal:          income,
    expenseTotal:         expenses,
    remaining,
    availableSavings:     available,
    dailySpent,
    dailyBudget:          dailyBudget ?? undefined,
    dailyBudgetRatio,
    isDailyBudgetExceeded,
  }), [income, expenses, remaining, available, dailySpent, dailyBudget, dailyBudgetRatio, isDailyBudgetExceeded]);

  const totalRacks = useMemo(() => getRacksOnly(accumulatedSavings), [accumulatedSavings]);

  // ── Advice context (phrase-stable per state) ─────────────────────
  const adviceContext = useMemo(() => ({
    remaining,
    availableSavings:     available,
    incomeTotal:          income,
    isDailyBudgetExceeded,
    dailyBudgetRatio,
    goalStatus:   null,
    budgetStatus: null,
  }), [remaining, available, income, isDailyBudgetExceeded, dailyBudgetRatio]);

  // ── Character label for the DailyMeter avatar ────────────────────
  const characterLabel = useMemo((): string => {
    if (!dailyBudget) return (characterState.characterKey as string | undefined)?.toUpperCase?.() || 'STEADY';
    if (isDailyBudgetExceeded)      return 'EXCEEDED';
    if (dailyBudgetRatio >= 0.95)   return 'CRITICAL';
    if (dailyBudgetRatio >= 0.80)   return 'CAUTION';
    return 'ON TRACK';
  }, [dailyBudget, isDailyBudgetExceeded, dailyBudgetRatio, characterState.characterKey]);

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <Animated.View style={StyleSheet.flatten([styles.wrapper, { opacity: fadeAnim }])}>

      {/* ── Navigation Drawer ─────────────────────────────────── */}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/"
      />

      {/* ── Farewell overlay (logout animation) ──────────────── */}
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
        {/* Network status banner */}
        <NetworkBanner status={status} />

        {/* ── HEADER: NoCapSpend / BOONDOCKS MODE ──────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => setDrawerVisible(true)}
            accessibilityLabel="Open navigation menu"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.hamburger}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.appTitle}>
              No<Text style={styles.appTitleAccent}>Cap</Text>Spend
            </Text>
            <Text style={styles.modeLabel}>BOONDOCKS MODE</Text>
          </View>
          <TouchableOpacity
            style={styles.headerRight}
            onPress={handleLogout}
            accessibilityLabel="Log out"
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Image
              source={require('../../assets/images/logout_icon.png')}
              style={styles.logoutIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        {/* ── DAILY SPENDING METER ──────────────────────────── */}
        <DailyMeter
          dailySpent={dailySpent}
          dailyBudget={dailyBudget}
          lockEnabled={dailyLockEnabled}
          loading={dailyLoading}
          characterAssetId={characterState.assetId}
          characterLabel={characterLabel}
          carryoverInfo={dailyCarryover}
        />

        {/* ── INCOME / EXPENSES CARDS ───────────────────────── */}
        {!fetching && (
          <View style={styles.incExpRow}>
            {/* Income */}
            <View style={[styles.incExpCard, styles.incCard]}>
              <Text style={styles.incLabel}>INCOME</Text>
              <Text style={[styles.incExpValue, { color: colors.income }]} numberOfLines={1} adjustsFontSizeToFit>
                {income.toFixed(2)} DT
              </Text>
              <Text style={styles.cardEmoji}>💰</Text>
            </View>
            {/* Expenses */}
            <View style={[styles.incExpCard, styles.expCard]}>
              <Text style={[styles.incLabel, { color: colors.expense }]}>EXPENSES</Text>
              <Text style={[styles.incExpValue, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {expenses.toFixed(2)} DT
              </Text>
              <Text style={styles.cardEmoji}>💸</Text>
            </View>
          </View>
        )}

        {/* ── SAVINGS OVERVIEW ──────────────────────────────── */}
        {!fetching && (
          <View style={[
            styles.savingsCard,
            remaining < 0  && styles.savingsCardDanger,
            remaining >= 0 && styles.savingsCardGlow,
          ]}>
            <View style={styles.savingsRow}>
              <View style={styles.savingsHalf}>
                <Text style={styles.savingsLabel}>TOTAL SAVINGS</Text>
                <Text style={styles.savingsValue} numberOfLines={1} adjustsFontSizeToFit>
                  {accumulatedSavings.toFixed(2)} DT
                </Text>
                {totalRacks && <Text style={styles.racksTag}>{totalRacks}</Text>}
              </View>
              <View style={styles.savingsDivider} />
              <View style={styles.savingsHalf}>
                <Text style={styles.savingsLabel}>AVAILABLE</Text>
                <Text
                  style={[styles.savingsValue, available < 0 && { color: colors.danger }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {available.toFixed(2)} DT
                </Text>
                {reservedForGoals > 0 && (
                  <Text style={styles.goalNote}>🔒 {reservedForGoals.toFixed(2)} in goals</Text>
                )}
              </View>
            </View>
            <Text style={styles.savingsSub}>
              {remaining >= 0 ? '▲' : '▼'} {Math.abs(remaining).toFixed(2)} DT{' '}
              {remaining >= 0 ? 'surplus' : 'deficit'} this month
            </Text>
          </View>
        )}

        {/* ── RECENT TRANSACTIONS ───────────────────────────── */}
        {recentTx.length > 0 && (
          <View style={styles.txCard}>
            <View style={styles.txHeader}>
              <Text style={styles.txSectionTitle}>RECENT TRANSACTIONS</Text>
              <Link href={'/statistics' as any} asChild>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </Link>
            </View>
            {recentTx.map((tx, i) => (
              <View
                key={i}
                style={[styles.txRow, i < recentTx.length - 1 && styles.txRowBorder]}
              >
                <View style={[
                  styles.txDot,
                  { backgroundColor: tx.type === 'income' ? '#1A3B1E' : '#3B1A1A' },
                ]}>
                  <Text style={[
                    styles.txDotText,
                    { color: tx.type === 'income' ? colors.income : colors.danger },
                  ]}>
                    {tx.type === 'income' ? '↑' : '↓'}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
                  <Text style={styles.txDate}>{formatTxDate(tx.date)}</Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'income' ? colors.income : colors.danger },
                ]}>
                  {tx.type === 'income' ? '+' : '−'}{tx.amount.toFixed(2)} DT
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── BOONDOCKS ADVICE ──────────────────────────────── */}
        {!fetching && (
          <AdviceCard
            context={adviceContext}
            characterAssetId={characterState.assetId}
          />
        )}

        {/* ── PRIMARY ACTION BUTTONS ────────────────────────── */}
        <View style={styles.actionRow}>
          <Link href="/add-income" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.actionBtn, styles.incomeBtn])}>
              <Text style={styles.actionBtnPlus}>+</Text>
              <Text style={styles.actionBtnText}>ADD INCOME</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/add-expense" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.actionBtn, styles.expenseBtn])}>
              <Text style={styles.actionBtnMinus}>−</Text>
              <Text style={styles.actionBtnText}>ADD EXPENSE</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── SECONDARY NAVIGATION ──────────────────────────── */}
        <View style={styles.navGrid}>
          <Link href="/goals" asChild>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navBtnText}>🎯  SAVINGS GOALS</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/budgets" asChild>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navBtnText}>📋  BUDGETS</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Link href={'/statistics' as any} asChild>
          <TouchableOpacity style={styles.analyticsBtn}>
            <Text style={styles.analyticsBtnText}>📊  ANALYTICS &amp; TRENDS</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.navGrid}>
          <Link href="/categories" asChild>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navBtnText}>🏷  CATEGORIES</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/settings" asChild>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navBtnText}>⚙  SETTINGS</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  wrapper: { flex: 1, backgroundColor: colors.background },
  screen:  { flex: 1 },
  scrollContent: {
    paddingTop:        0,
    paddingHorizontal: 16,
    paddingBottom:     48,
    maxWidth:          580,
    alignSelf:         'center',
    width:             '100%',
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      52,
    paddingBottom:   16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    width:      36,
    alignItems: 'flex-start',
  },
  hamburger: {
    fontSize: 20,
    color:    colors.textMuted,
  },
  headerCenter: {
    flex:        1,
    alignItems:  'center',
  },
  appTitle: {
    fontFamily:    fonts.bodyBold,
    fontSize:      28,
    color:         colors.textPrimary,
    letterSpacing: 0.5,
    textAlign:     'center',
  },
  appTitleAccent: {
    color: colors.primary,
  },
  modeLabel: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 3.5,
    textAlign:     'center',
    marginTop:     3,
    textTransform: 'uppercase',
  },
  headerRight: {
    width:          36,
    alignItems:     'flex-end',
    justifyContent: 'center',
  },
  logoutIcon: {
    width:  37,
    height: 37,
  },

  // ── Income / Expense Cards ────────────────────────────────────
  incExpRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  12,
  },
  incExpCard: {
    flex:         1,
    borderRadius: radii.md,
    borderWidth:  1.5,
    padding:      14,
    minHeight:    88,
    overflow:     'hidden',
  },
  incCard: {
    backgroundColor: colors.incomeCard,
    borderColor:     colors.incomeBorder,
  },
  expCard: {
    backgroundColor: colors.expenseCard,
    borderColor:     colors.expenseBorder,
  },
  incLabel: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.income,
    letterSpacing: 2,
    marginBottom:  6,
    textTransform: 'uppercase',
  },
  incExpValue: {
    fontFamily: fonts.bodyBold,
    fontSize:   22,
    flexShrink: 1,
  },
  cardEmoji: {
    fontSize:  22,
    position:  'absolute',
    bottom:    10,
    right:     12,
    opacity:   0.65,
  },

  // ── Savings Overview Card ─────────────────────────────────────
  savingsCard: {
    backgroundColor: colors.card,
    borderRadius:    radii.md,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    padding:         16,
    marginBottom:    12,
  },
  savingsCardDanger: {
    borderLeftColor: colors.danger,
    borderColor:     colors.danger,
  },
  savingsCardGlow: {
    shadowColor:   colors.primary,
    shadowOpacity: 0.14,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     5,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginBottom:  10,
  },
  savingsHalf: {
    flex: 1,
  },
  savingsDivider: {
    width:           1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
    minHeight:       50,
  },
  savingsLabel: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom:  4,
  },
  savingsValue: {
    fontFamily: fonts.bodyBold,
    fontSize:   22,
    color:      colors.textPrimary,
    flexShrink: 1,
  },
  racksTag: {
    fontFamily:    fonts.display,
    fontSize:      14,
    color:         colors.primary,
    letterSpacing: 1.5,
    marginTop:     3,
  },
  goalNote: {
    fontFamily: fonts.body,
    fontSize:   10,
    color:      colors.goals,
    marginTop:  4,
    flexWrap:   'wrap',
  },
  savingsSub: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 0.8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop:    8,
    textAlign:     'center',
  },

  // ── Recent Transactions ────────────────────────────────────────
  txCard: {
    backgroundColor:   colors.card,
    borderRadius:      radii.md,
    borderWidth:       1.5,
    borderColor:       colors.border,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginBottom:      12,
  },
  txHeader: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginBottom:    10,
  },
  txSectionTitle: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      12,
    color:         colors.primary,
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 10,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txDot: {
    width:           36,
    height:          36,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    flexShrink:      0,
  },
  txDotText: {
    fontSize:   16,
    fontFamily: fonts.bodyBold,
  },
  txInfo: {
    flex:        1,
    marginRight: 8,
  },
  txLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize:   13,
    color:      colors.textPrimary,
    flexShrink: 1,
  },
  txDate: {
    fontFamily: fonts.body,
    fontSize:   11,
    color:      colors.textMuted,
    marginTop:  2,
  },
  txAmount: {
    fontFamily: fonts.bodyBold,
    fontSize:   14,
    flexShrink: 0,
  },

  // ── Action Buttons ────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  10,
  },
  actionBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 16,
    borderRadius:    radii.md,
    borderWidth:     1.5,
    minHeight:       56,
    gap:             6,
  },
  incomeBtn: {
    backgroundColor: colors.incomeCard,
    borderColor:     colors.income,
  },
  expenseBtn: {
    backgroundColor: colors.expenseCard,
    borderColor:     colors.expense,
  },
  actionBtnPlus: {
    fontFamily: fonts.bodyBold,
    fontSize:   20,
    color:      colors.income,
    lineHeight: 22,
  },
  actionBtnMinus: {
    fontFamily: fonts.bodyBold,
    fontSize:   22,
    color:      colors.danger,
    lineHeight: 22,
  },
  actionBtnText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      13,
    color:         colors.textPrimary,
    letterSpacing: 1,
  },

  // ── Secondary Navigation ──────────────────────────────────────
  navGrid: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  10,
  },
  navBtn: {
    flex:              1,
    backgroundColor:   colors.card,
    borderRadius:      radii.sm,
    borderWidth:       1.5,
    borderColor:       colors.border,
    paddingVertical:   14,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         48,
    paddingHorizontal: 8,
  },
  navBtnText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      12,
    color:         colors.textSecondary,
    letterSpacing: 0.8,
    textAlign:     'center',
  },
  analyticsBtn: {
    backgroundColor:   colors.cardElevated,
    borderRadius:      radii.sm,
    borderWidth:       1.5,
    borderColor:       colors.primary,
    paddingVertical:   14,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         48,
    marginBottom:      10,
  },
  analyticsBtnText: {
    fontFamily:    fonts.bodySemiBold,
    fontSize:      13,
    color:         colors.primaryBright,
    letterSpacing: 1,
    textAlign:     'center',
  },

  // ── Farewell Overlay ──────────────────────────────────────────
  farewellOverlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: colors.background,
    zIndex:          100,
  },
  farewellText: {
    fontFamily:    fonts.display,
    fontSize:      44,
    color:         colors.textPrimary,
    letterSpacing: 4,
    marginTop:     spacing.md,
  },
});