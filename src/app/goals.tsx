import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { safeBack } from '../lib/nav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { useNetworkStatus } from '../lib/networkStatus';
import { cacheWrite, cacheRead, BUCKETS } from '../lib/offlineStore';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import GlobalCornerFigure from '../components/GlobalCornerFigure';
import NetworkBanner from '../components/NetworkBanner';

export default function Goals() {
  const auth: any = useAuth();
  const session = auth?.session;
  const loading = auth?.loading;
  const { status, isOnline } = useNetworkStatus();
  const [goals, setGoals] = useState<any[]>([]);

  const loadGoals = useCallback(async () => {
    if (!session) return;
    if (isOnline) {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGoals(data);
        await cacheWrite(session.user.id, BUCKETS.GOALS, data);
      }
    } else {
      const cached = await cacheRead(session.user.id, BUCKETS.GOALS);
      if (Array.isArray(cached)) {
        setGoals(cached);
      }
    }
  }, [session, isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  function renderGoal({ item }: any) {
    const progress = Math.min(item.current_amount / item.target_amount, 1);
    const percent = Math.round(progress * 100);
    const isComplete = Number(item.current_amount) >= Number(item.target_amount);

    return (
      <TouchableOpacity
        style={[styles.goalCard, isComplete && styles.goalCardComplete]}
        onPress={() => router.push(`/goal/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.goalName} numberOfLines={1} adjustsFontSizeToFit>{item.name}</Text>
          {isComplete && <Text style={styles.completeBadge}>COMPLETE</Text>}
        </View>
        <Text style={styles.goalAmounts}>
          {Number(item.current_amount).toFixed(2)} DT / {Number(item.target_amount).toFixed(2)} DT
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percent}%` }, isComplete && styles.progressComplete]} />
        </View>
        <Text style={styles.percentText}>{percent}%</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalCornerFigure assetId="jazmine_progress" size={60} opacity={0.2} position="top-right" />

      {/* Network banner */}
      <NetworkBanner status={status} />

      <Text style={styles.title}>SAVINGS GOALS</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter assetId="jazmine_progress" animationType="native" size="medium" animated />
        <ReactionText
          text="GREAT PROGRESS! KEEP GOING!"
          visible={true}
          holdMs={999999}
        />
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item: any) => item.id}
        renderItem={renderGoal}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <BudgetCharacter assetId="jazmine_progress" size="small" animated />
              <Text style={styles.emptyTitle}>NO GOALS YET.</Text>
              <Text style={styles.emptyText}>What are you saving for?</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <Link href="/add-goal" asChild>
        <TouchableOpacity style={StyleSheet.flatten([styles.button, styles.primaryButton])}>
          <Text style={styles.buttonText}>+ NEW SAVINGS GOAL</Text>
        </TouchableOpacity>
      </Link>
      <View style={{ height: 10 }} />
      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/')}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>BACK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 52, paddingBottom: 40, backgroundColor: colors.background, maxWidth: 580, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 180, justifyContent: 'center' },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  goalCardComplete: {
    borderColor: colors.goals,
    borderLeftWidth: 4,
    borderLeftColor: colors.goals,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  goalName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, flex: 1 },
  completeBadge: { fontFamily: fonts.display, fontSize: 14, color: colors.goals, letterSpacing: 1, flexShrink: 1 },
  goalAmounts: { fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 10, fontSize: 13 },
  progressBarBg: { height: 8, backgroundColor: colors.progressBg, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  progressComplete: { backgroundColor: colors.goals },
  percentText: { fontFamily: fonts.body, textAlign: 'right', marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  emptyState: { alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, marginTop: 12, letterSpacing: 2, textAlign: 'center' },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5, textAlign: 'center' },
  primaryButton: { borderColor: colors.primary, backgroundColor: colors.cardElevated },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
});