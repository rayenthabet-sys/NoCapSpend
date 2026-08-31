import { useState, useCallback, useMemo } from 'react';
import { Redirect, useFocusEffect } from 'expo-router';
import { safeBack } from '../lib/nav';
import {
  View, ActivityIndicator, Text, StyleSheet, ScrollView,
  Dimensions, TouchableOpacity,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { getSavingsHistory } from '../lib/savings';
import { colors, fonts, radii, spacing, chartConfig } from '../lib/theme';
import { resolveCharacterState } from '../lib/characterEngine';
import { useNetworkStatus } from '../lib/networkStatus';
import { cacheWrite, cacheRead, BUCKETS } from '../lib/offlineStore';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import BudgetCard from '../components/BudgetCard';
import SectionHeader from '../components/SectionHeader';
import GlobalCornerFigure from '../components/GlobalCornerFigure';
import NetworkBanner from '../components/NetworkBanner';

const pieColors = ['#D4A237', '#8C6818', '#4E9A51', '#C84C32', '#7E6BB0', '#D98A2B', '#BAB6A2'];

interface SavingsHistoryRow {
  month: string;
  accumulated_total: number;
}

function formatMonthLabel(dateStr: string) {
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

export default function Statistics() {
  const auth = useAuth() as any;
  const session = auth?.session;
  const loading = auth?.loading;
  const { status, isOnline } = useNetworkStatus();

  const [savingsHistory, setSavingsHistory] = useState<SavingsHistoryRow[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<[string, number][]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const loadStats = useCallback(async () => {
    if (!session) return;
    try {
      if (isOnline) {
        const { start, end } = getMonthRange();
        const [incomeRes, expenseRes, historyRes, expenseDetails] = await Promise.all([
          supabase.from('income_entries').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
          supabase.from('expenses').select('amount').eq('user_id', session.user.id).gte('date', start).lte('date', end),
          getSavingsHistory(session.user.id, 6),
          supabase.from('expenses').select('amount, categories(name)').eq('user_id', session.user.id).gte('date', start).lte('date', end),
        ]);

        const incTotal = (incomeRes.data || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const expTotal = (expenseRes.data || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

        const breakdown: Record<string, number> = {};
        (expenseDetails.data || []).forEach((exp: any) => {
          const catName = exp.categories?.name || (Array.isArray(exp.categories) && exp.categories[0]?.name) || 'Uncategorized';
          breakdown[catName] = (breakdown[catName] || 0) + Number(exp.amount);
        });

        const sortedBreakdown: [string, number][] = Object.entries(breakdown)
          .map(([name, amount]) => [name, Number(amount)] as [string, number])
          .sort((a, b) => b[1] - a[1]);

        setIncomeTotal(incTotal);
        setExpenseTotal(expTotal);
        setSavingsHistory((historyRes || []) as SavingsHistoryRow[]);
        setCategoryBreakdown(sortedBreakdown);

        // Cache for offline use
        await cacheWrite(session.user.id, BUCKETS.STATS, {
          savingsHistory: historyRes || [],
          categoryBreakdown: sortedBreakdown,
          incomeTotal: incTotal,
          expenseTotal: expTotal,
        });
      } else {
        // Offline: read from cache
        const cached = await cacheRead(session.user.id, BUCKETS.STATS);
        if (cached) {
          setSavingsHistory(cached.savingsHistory || []);
          setCategoryBreakdown(cached.categoryBreakdown || []);
          setIncomeTotal(cached.incomeTotal || 0);
          setExpenseTotal(cached.expenseTotal || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
      const cached = await cacheRead(session.user.id, BUCKETS.STATS);
      if (cached) {
        setSavingsHistory(cached.savingsHistory || []);
        setCategoryBreakdown(cached.categoryBreakdown || []);
        setIncomeTotal(cached.incomeTotal || 0);
        setExpenseTotal(cached.expenseTotal || 0);
      }
    }
  }, [session, isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const screenW = Dimensions.get('window').width;
  const chartWidth = Math.min(screenW - 48, 580);

  const hueyState: any = useMemo(() => {
    return resolveCharacterState({
      incomeTotal,
      expenseTotal,
      remaining: incomeTotal - expenseTotal,
      availableSavings: 0,
      isStatisticsActive: true,
    });
  }, [incomeTotal, expenseTotal]);

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

  const savingsRate = incomeTotal > 0 ? Math.max(Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100), 0) : 0;
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0][0] : 'None';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlobalCornerFigure assetId="huey_review" size={60} opacity={0.2} position="top-right" />

      {/* Network banner */}
      <NetworkBanner status={status} />

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>ANALYTICS & TRENDS</Text>
        <Text style={styles.subLabel}>MANAGED BY HUEY FREEMAN</Text>
      </View>

      {/* ── Huey Freeman Host Section ───────────────────────── */}
      <View style={styles.characterSection}>
        <BudgetCharacter
          assetId={hueyState.assetId}
          animationType={hueyState.animationType}
          size="medium"
          animated
        />
        <ReactionText
          text={hueyState.reactionText}
          visible={true}
          holdMs={999999}
        />
      </View>

      {/* ── KPI Summary Panel ────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SAVINGS RATE</Text>
          <Text style={[styles.kpiValue, { color: colors.income }]} numberOfLines={1} adjustsFontSizeToFit>{savingsRate}%</Text>
        </View>
        <View style={[styles.kpiCard, { marginHorizontal: 8 }]}>
          <Text style={styles.kpiLabel}>MONTHLY EXPENSES</Text>
          <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{expenseTotal.toFixed(2)} DT</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TOP CATEGORY</Text>
          <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{topCategory}</Text>
        </View>
      </View>

      {/* ── Savings Line Chart ────────────────────────────────── */}
      {lineChartData ? (
        <BudgetCard style={styles.chartCard}>
          <SectionHeader title="SAVINGS OVER TIME (6 MONTHS)" />
          <LineChart
            data={lineChartData}
            width={chartWidth}
            height={170}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: radii.sm, marginTop: 8 }}
            withInnerLines
          />
        </BudgetCard>
      ) : (
        <BudgetCard>
          <SectionHeader title="SAVINGS OVER TIME" />
          <Text style={styles.emptyCardText}>Need at least 2 months of history to graph trajectory.</Text>
        </BudgetCard>
      )}

      {/* ── Category Breakdown List ───────────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <BudgetCard>
          <SectionHeader title="SPENDING BREAKDOWN" />
          {categoryBreakdown.map(([name, total]) => {
            const pct = expenseTotal > 0 ? Math.round((total / expenseTotal) * 100) : 0;
            return (
              <View key={name} style={styles.breakdownRow}>
                <View style={styles.breakdownNameCol}>
                  <Text style={styles.breakdownName} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
                  <Text style={styles.breakdownPct}>{pct}% of monthly expenses</Text>
                </View>
                <Text style={styles.breakdownAmount} numberOfLines={1} adjustsFontSizeToFit>{total.toFixed(2)} DT</Text>
              </View>
            );
          })}
        </BudgetCard>
      )}

      {/* ── Pie Chart ────────────────────────────────────────── */}
      {pieChartData && (
        <BudgetCard>
          <SectionHeader title="SPENDING BY CATEGORY" />
          <PieChart
            data={pieChartData}
            width={chartWidth}
            height={160}
            chartConfig={{ color: () => colors.textPrimary }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </BudgetCard>
      )}

      {/* ── Back Navigation Button ───────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => safeBack('/')}
      >
        <Text style={styles.backBtnText}>BACK TO DASHBOARD</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  screen:  { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 40, maxWidth: 640, alignSelf: 'center', width: '100%' },

  // Header
  header:     { alignItems: 'center', marginBottom: spacing.md },
  appTitle:   { fontFamily: fonts.display, fontSize: 34, color: colors.textPrimary, letterSpacing: 3, textAlign: 'center' },
  subLabel:   { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primary, letterSpacing: 2, marginTop: 2, textAlign: 'center' },

  // Character section
  characterSection: { alignItems: 'center', marginBottom: spacing.md, minHeight: 200, justifyContent: 'center' },

  // KPI Row
  kpiRow: { flexDirection: 'row', marginBottom: spacing.md },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: { fontFamily: fonts.bodySemiBold, fontSize: 9.5, color: colors.textMuted, letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase', textAlign: 'center', flexWrap: 'wrap' },
  kpiValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, textAlign: 'center' },

  // Charts
  chartCard: { paddingVertical: spacing.md },
  emptyCardText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 },

  // Breakdown
  breakdownRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  breakdownNameCol: { flex: 1 },
  breakdownName:    { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  breakdownPct:     { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  breakdownAmount:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary, flexShrink: 1 },

  // Back Button
  backBtn: {
    backgroundColor: colors.card,
    borderRadius:    radii.sm,
    borderWidth:     1.5,
    borderColor:     colors.border,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       spacing.md,
  },
  backBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary, letterSpacing: 1.2, textAlign: 'center' },
});
