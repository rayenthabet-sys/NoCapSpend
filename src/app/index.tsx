import { useState, useCallback, useRef, useMemo } from 'react';
import { Redirect, Link, useFocusEffect } from 'expo-router';
import {
  View, ActivityIndicator, Text, StyleSheet, ScrollView,
  Dimensions, Alert, TouchableOpacity, Animated,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { recalculateCurrentMonthLedger, getTotalReservedForGoals, getSavingsHistory } from '../lib/savings';
import { ensureRecurringEntriesForThisMonth } from '../lib/recurring';
import { colors, fonts, radii, spacing, chartConfig } from '../lib/theme';
import { resolvePersistentCharacter, getLastExpenseTimestamp } from '../lib/characters';
import { getRacksOnly } from '../lib/slang';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import BudgetCard from '../components/BudgetCard';
import SectionHeader from '../components/SectionHeader';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

// ── Chart colors for pie slices ───────────────────────────────────
const pieColors = ['#B00020', '#720014', '#888888', '#555555', '#3A3A3A', '#292929', '#666666'];

function formatMonthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

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
  const { session, loading } = useAuth();

  // ── Financial state ──────────────────────────────────────────────
  const [income, setIncome]                   = useState(0);
  const [expenses, setExpenses]               = useState(0);
  const [fetching, setFetching]               = useState(true);
  const [accumulatedSavings, setAccumulatedSavings] = useState(0);
  const [reservedForGoals, setReservedForGoals]     = useState(0);
  const [categoryBreakdown, setCategoryBreakdown]   = useState([]);
  const [savingsHistory, setSavingsHistory]         = useState([]);
  const [lastExpenseTs, setLastExpenseTs]           = useState(0);

  // ── Reaction state ───────────────────────────────────────────────
  const [reactionText, setReactionText]     = useState(null);
  const [showReaction, setShowReaction]     = useState(false);
  const [shakeTrigger, setShakeTrigger]     = useState(false);
  const [pulseTrigger, setPulseTrigger]     = useState(false);
  const reactionFired = useRef(false);

  // ── Seeyuh logout animation ──────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const [showSeeyuh, setShowSeeyuh] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    reactionFired.current = false;
    try {
      await ensureRecurringEntriesForThisMonth(session.user.id);

      const expTs = await getLastExpenseTimestamp();
      setLastExpenseTs(expTs);

      const { start, end } = getMonthRange();
      const [incomeRes, expenseRes] = await Promise.all([
        supabase.from('income_entries').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
        supabase.from('expenses').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
      ]);

      const incomeTotal  = (incomeRes.data  || []).reduce((sum, row) => sum + Number(row.amount), 0);
      const expenseTotal = (expenseRes.data || []).reduce((sum, row) => sum + Number(row.amount), 0);

      const accumulated = await recalculateCurrentMonthLedger(session.user.id, incomeTotal, expenseTotal);
      const reserved    = await getTotalReservedForGoals(session.user.id);
      const history     = await getSavingsHistory(session.user.id);

      const { data: expenseDetails } = await supabase
        .from('expenses')
        .select('amount, categories(name)')
        .eq('user_id', session.user.id)
        .gte('date', start)
        .lte('date', end);

      const breakdown = {};
      (expenseDetails || []).forEach((exp) => {
        const catName = exp.categories?.name || 'Uncategorized';
        breakdown[catName] = (breakdown[catName] || 0) + Number(exp.amount);
      });

      setIncome(incomeTotal);
      setExpenses(expenseTotal);
      setAccumulatedSavings(accumulated);
      setReservedForGoals(reserved);
      setSavingsHistory(history);
      setCategoryBreakdown(Object.entries(breakdown).sort((a, b) => b[1] - a[1]));

      const remainingVal = incomeTotal - expenseTotal;

      // Popup phrase without shifting layout
      if (!reactionFired.current) {
        if (remainingVal < 0) {
          setReactionText('FWÄÄH?! (OVER BUDGET)');
          setShowReaction(true);
          setShakeTrigger(v => !v);
        } else if (remainingVal > 150) {
          setReactionText('WE UP. (STACKIN\' BENJIS)');
          setShowReaction(true);
          setPulseTrigger(v => !v);
        }
        reactionFired.current = true;
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      Alert.alert('Error loading data', err.message || 'Something went wrong.');
    } finally {
      setFetching(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleLogout() {
    setShowSeeyuh(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(async () => {
      await supabase.auth.signOut();
    });
  }

  const remaining  = income - expenses;
  const available  = accumulatedSavings - reservedForGoals;
  const screenW    = Dimensions.get('window').width;
  const chartWidth = Math.min(screenW - 48, 580);

  // Memoized character resolution
  const activeCharacter = useMemo(() => {
    return resolvePersistentCharacter({
      remaining,
      isOverBudget: remaining < 0,
      lastExpenseTimestamp: lastExpenseTs,
    });
  }, [remaining, lastExpenseTs]);

  const totalRacks = useMemo(() => getRacksOnly(accumulatedSavings), [accumulatedSavings]);

  // Memoized chart dataset objects
  const lineChartData = useMemo(() => {
    if (savingsHistory.length <= 1) return null;
    return {
      labels: savingsHistory.map((row) => formatMonthLabel(row.month)),
      datasets: [{ data: savingsHistory.map((row) => Number(row.accumulated_total)) }],
    };
  }, [savingsHistory]);

  const pieChartData = useMemo(() => {
    if (categoryBreakdown.length === 0) return null;
    return categoryBreakdown.map(([name, total], index) => ({
      name,
      amount: total,
      color: pieColors[index % pieColors.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
      legendFontFamily: fonts.body,
    }));
  }, [categoryBreakdown]);

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
      {/* Corner Global figures as lightweight stamps */}
      <GlobalCornerFigure view="side" size={60} opacity={0.3} position="top-right" />
      <GlobalCornerFigure view="back" size={65} opacity={0.25} position="bottom-left" />

      {/* SEEYUH logout overlay */}
      {showSeeyuh && (
        <View style={styles.seeyuhOverlay}>
          <BudgetCharacter character="master" size="large" animated={false} />
          <Text style={styles.seeyuhText}>SEEYUH.</Text>
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

        {/* ── Character + Reaction Section ────────────────────── */}
        <View style={styles.characterSection}>
          <BudgetCharacter
            character={activeCharacter}
            size="large"
            animated
            shake={shakeTrigger}
            pulse={pulseTrigger}
          />
          {/* ReactionText container with fixed height = ZERO layout shift */}
          <ReactionText
            text={reactionText}
            visible={showReaction}
            onDone={() => {
              setShowReaction(false);
            }}
          />
        </View>

        {/* ── Total Savings Card ───────────────────────────────── */}
        <BudgetCard style={styles.savingsCard}>
          <GlobalCornerFigure view="frontAlt" size={48} opacity={0.35} position="bottom-right" />
          <Text style={styles.cardSectionLabel}>TOTAL MUNYUN (Savings)</Text>
          {fetching ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.heroNumber}>${accumulatedSavings.toFixed(2)}</Text>
              {totalRacks && <Text style={styles.racksTag}>{totalRacks}</Text>}
              <Text style={styles.heroSub}>
                {remaining >= 0 ? '+' : ''}${remaining.toFixed(2)} THIS MONTH'S BAG
              </Text>
            </>
          )}
        </BudgetCard>

        {/* ── Income / Spent row ───────────────────────────────── */}
        {!fetching && (
          <View style={styles.statRow}>
            <View style={[styles.statCard, { marginRight: 6 }]}>
              <Text style={styles.statCardLabel}>BAG IN (Income)</Text>
              <Text style={[styles.statCardValue, { color: colors.income }]}>
                +${income.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statCard, { marginLeft: 6 }]}>
              <Text style={styles.statCardLabel}>BLEED (Expense)</Text>
              <Text style={[styles.statCardValue, expenses > income && styles.dangerText]}>
                -${expenses.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Available / Reserved row ──────────────────────────── */}
        {!fetching && (
          <View style={styles.statRow}>
            <View style={[styles.statCard, { marginRight: 6 }]}>
              <Text style={styles.statCardLabel}>FREE MUNYUN (Available)</Text>
              <Text style={[styles.statCardValue, available < 0 && styles.dangerText]}>
                ${available.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statCard, { marginLeft: 6 }]}>
              <Text style={styles.statCardLabel}>IN BENJIS (Goals)</Text>
              <Text style={[styles.statCardValue, { color: colors.goals }]}>
                ${reservedForGoals.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Savings Line Chart ────────────────────────────────── */}
        {lineChartData && (
          <BudgetCard>
            <SectionHeader title="MUNYUN OVER TIME" />
            <LineChart
              data={lineChartData}
              width={chartWidth}
              height={160}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: radii.sm, marginTop: 8 }}
              withInnerLines
            />
          </BudgetCard>
        )}

        {/* ── Category breakdown list ───────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <BudgetCard>
            <SectionHeader title="WHERE THE MUNYUN WENT" />
            {categoryBreakdown.map(([name, total]) => (
              <View key={name} style={styles.breakdownRow}>
                <Text style={styles.breakdownName}>{name}</Text>
                <Text style={styles.breakdownAmount}>${total.toFixed(2)}</Text>
              </View>
            ))}
          </BudgetCard>
        )}

        {/* ── Pie Chart ────────────────────────────────────────── */}
        {pieChartData && (
          <BudgetCard>
            <SectionHeader title="MUNYUN SPLIT" />
            <PieChart
              data={pieChartData}
              width={chartWidth}
              height={160}
              chartConfig={{ color: () => colors.text }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </BudgetCard>
        )}

        {/* ── Empty state when no data ──────────────────────────── */}
        {!fetching && income === 0 && expenses === 0 && (
          <BudgetCard>
            <View style={styles.emptyState}>
              <BudgetCharacter character="master" size="medium" animated />
              <Text style={styles.emptyTitle}>NO MUNYUN YET.</Text>
              <Text style={styles.emptyBody}>Secure the bag or log an expense to start stackin'.</Text>
            </View>
          </BudgetCard>
        )}

        {/* ── Navigation ───────────────────────────────────────── */}
        <View style={styles.navSection}>
          <Link href="/add-expense" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn, styles.navBtnAccent])}>
              <Text style={styles.navBtnText}>- MUNYUN BLEED (Expense)</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.navGap} />
          <Link href="/add-income" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn])}>
              <Text style={styles.navBtnText}>+ SECURE BAG (Income)</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.navGap} />
          <Link href="/goals" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn])}>
              <Text style={styles.navBtnText}>BENJI GOALS (Goals)</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.navGap} />
          <Link href="/budgets" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn])}>
              <Text style={styles.navBtnText}>MUNYUN LIMITS (Budgets)</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.navGap} />
          <Link href="/categories" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.navBtn])}>
              <Text style={styles.navBtnText}>MUNYUN KILLERS (Categories)</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── Logout ───────────────────────────────────────────── */}
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
  scrollContent: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40, maxWidth: 680, alignSelf: 'center', width: '100%' },

  // Header
  header:      { alignItems: 'center', marginBottom: spacing.md },
  appTitle:    { fontFamily: fonts.display, fontSize: 42, color: colors.text, letterSpacing: 4 },
  monthLabel:  { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, letterSpacing: 3, marginTop: 2 },

  // Character section with fixed minimum height
  characterSection: { alignItems: 'center', marginBottom: spacing.md, minHeight: 260, justifyContent: 'center' },

  // Savings hero card
  savingsCard:     { alignItems: 'center', paddingVertical: spacing.lg, position: 'relative', overflow: 'hidden' },
  cardSectionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 2, marginBottom: 8 },
  heroNumber:      { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.text },
  racksTag:        { fontFamily: fonts.display, fontSize: 18, color: colors.goals, letterSpacing: 2, marginTop: 2 },
  heroSub:         { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4, letterSpacing: 1 },

  // Stat row cards
  statRow:          { flexDirection: 'row', marginBottom: spacing.md },
  statCard:         {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statCardLabel:    { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' },
  statCardValue:    { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text },
  dangerText:       { color: colors.expense },

  // Breakdown
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  breakdownName:   { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  breakdownAmount: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textSecondary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.text, letterSpacing: 2, marginTop: spacing.md },
  emptyBody:  { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  // Navigation buttons
  navSection: { marginTop: spacing.lg },
  navBtn: {
    backgroundColor: colors.cardSecondary,
    borderRadius:    radii.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingVertical: 14,
    alignItems:      'center',
  },
  navBtnAccent:  { borderColor: colors.primary },
  navBtnText:    { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, letterSpacing: 1.2 },
  navGap:        { height: 8 },

  // Logout
  logoutBtn:  { marginTop: spacing.xl, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  logoutText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, letterSpacing: 2 },

  // Seeyuh overlay
  seeyuhOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, zIndex: 100,
  },
  seeyuhText: { fontFamily: fonts.display, fontSize: 52, color: colors.text, letterSpacing: 8, marginTop: spacing.md },
});