import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeBack } from '../lib/nav';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getDailyBudget,
  getDailyLockEnabled,
  setDailyLockEnabled,
} from '../lib/dailyBudget';
import {
  getReducedMotionPreference,
  setReducedMotionPreference,
} from '../lib/preferences';
import { showAlert } from '../lib/dialog';
import { useFocusEffect } from 'expo-router';
import { useNetworkStatus } from '../lib/networkStatus';
import NetworkBanner from '../components/NetworkBanner';
import AdjustDailyLimitModal from '../components/AdjustDailyLimitModal';

export default function Settings() {
  const auth = useAuth() as any;
  const session = auth?.session;
  const userId = session?.user?.id;
  const { status } = useNetworkStatus();

  const [dailyBudget, setDailyBudgetState] = useState<number | null>(null);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearingGrind, setClearingGrind] = useState(false);

  // Load preferences on focus / mount
  const loadPreferences = useCallback(async () => {
    try {
      const [budget, lock] = await Promise.all([
        getDailyBudget(),
        getDailyLockEnabled(),
      ]);
      setDailyBudgetState(budget);
      setLockEnabledState(lock);

      if (userId) {
        const motion = await getReducedMotionPreference(userId);
        setReducedMotionState(motion);
      }
    } catch (err) {
      console.warn('[Settings] loadPreferences error:', err);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  // ── Reduced Motion Toggle ─────────────────────────────────────────
  async function handleToggleReducedMotion(val: boolean) {
    setReducedMotionState(val);
    if (userId) {
      await setReducedMotionPreference(userId, val);
    }
  }

  // ── Expense Lock Toggle ───────────────────────────────────────────
  async function handleToggleLock(val: boolean) {
    setLockEnabledState(val);
    await setDailyLockEnabled(val);
  }

  // ── Sign Out Flow ─────────────────────────────────────────────────
  function confirmSignOut() {
    showAlert('Sign Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (err: any) {
            showAlert('Sign Out Failed', err?.message || 'Could not sign out.');
          }
        },
      },
    ]);
  }

  // ── Export Grind Data ─────────────────────────────────────────────
  async function handleExportGrindData() {
    if (!userId) {
      showAlert('Notice', 'Please sign in to export your Grind data.');
      return;
    }
    setExporting(true);
    try {
      const grindKeys = [
        `@bb_cache_${userId}:GRIND_GOALS`,
        `@bb_cache_${userId}:GRIND_CHECKINS`,
        `@bb_cache_${userId}:GRIND_WEEK`,
        `@bb_cache_${userId}:GRIND_NOTES`,
        `@bb_cache_${userId}:GRIND_REFLECTIONS`,
        `@bb_cache_${userId}:GRIND_COURT`,
        `@bb_cache_${userId}:GRIND_ACHIEVEMENTS`,
      ];
      const entries = await AsyncStorage.multiGet(grindKeys);
      const exportData: Record<string, any> = {
        app: 'NoCapSpend',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userPreview: userId.slice(0, 8),
        grindDatasets: {},
      };

      let recordCount = 0;
      entries.forEach(([key, val]) => {
        if (val) {
          const name = key.split(':').pop() || key;
          try {
            const parsed = JSON.parse(val);
            exportData.grindDatasets[name] = parsed;
            if (Array.isArray(parsed)) recordCount += parsed.length;
          } catch {
            exportData.grindDatasets[name] = val;
          }
        }
      });

      const jsonString = JSON.stringify(exportData, null, 2);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nocapspend_grind_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showAlert('Export Successful', `Exported ${recordCount} local Grind records to JSON.`);
      } else {
        showAlert(
          'Grind Export Ready',
          `Successfully compiled ${recordCount} local Grind records. JSON format is ready.`
        );
      }
    } catch (err: any) {
      showAlert('Export Failed', err?.message || 'Could not export Grind data.');
    } finally {
      setExporting(false);
    }
  }

  // ── Clear Grind Data ──────────────────────────────────────────────
  function confirmClearGrindData() {
    if (!userId) return;

    showAlert(
      'Clear Grind Data?',
      'This will permanently delete your local Grind accountability goals, check-ins, notes, and reflections on this device.\n\nYour financial data (budgets, expenses, incomes, savings goals) will NOT be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Grind Data',
          style: 'destructive',
          onPress: async () => {
            setClearingGrind(true);
            try {
              const grindKeys = [
                `@bb_cache_${userId}:GRIND_GOALS`,
                `@bb_cache_${userId}:GRIND_CHECKINS`,
                `@bb_cache_${userId}:GRIND_WEEK`,
                `@bb_cache_${userId}:GRIND_NOTES`,
                `@bb_cache_${userId}:GRIND_REFLECTIONS`,
                `@bb_cache_${userId}:GRIND_COURT`,
                `@bb_cache_${userId}:GRIND_ACHIEVEMENTS`,
              ];
              await AsyncStorage.multiRemove(grindKeys);
              showAlert(
                'Grind Data Cleared',
                'Your local Grind data has been cleared. Financial records remain completely safe.'
              );
            } catch (err: any) {
              showAlert('Error', err?.message || 'Failed to clear Grind data.');
            } finally {
              setClearingGrind(false);
            }
          },
        },
      ]
    );
  }

  // ── User Information formatting ───────────────────────────────────
  const userEmail = session?.user?.email || 'Not signed in';
  const userIdPreview = session?.user?.id ? `${session.user.id.slice(0, 8)}...` : '—';
  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString()
    : '—';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Network banner */}
      <NetworkBanner status={status} />

      {/* Screen Title */}
      <Text style={styles.title}>SETTINGS</Text>
      <Text style={styles.subtitle}>APPLICATION CONTROL CENTER</Text>

      {/* ── 1. ACCOUNT SECTION ────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ACCOUNT</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{userEmail}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>{userIdPreview}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{memberSince}</Text>
        </View>
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={confirmSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutBtnText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. PREFERENCES SECTION ────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>PREFERENCES</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.itemTitle}>Reduced Motion</Text>
            <Text style={styles.itemDesc}>
              Minimize character motion, bobbing, and animations while keeping character identity and reactions intact.
            </Text>
          </View>
          <Switch
            value={reducedMotion}
            onValueChange={handleToggleReducedMotion}
            thumbColor={reducedMotion ? colors.primary : colors.textMuted}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
          />
        </View>
      </View>

      {/* ── 3. FINANCIAL PREFERENCES SECTION ──────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>FINANCIAL PREFERENCES</Text>

        {/* Daily Limit Shortcut */}
        <TouchableOpacity
          style={styles.shortcutRow}
          onPress={() => setLimitModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.shortcutTextCol}>
            <Text style={styles.itemTitle}>Daily Limit</Text>
            <Text style={styles.itemDesc}>
              Contextual shortcut to adjust your daily limit. Primary management is on the Dashboard.
            </Text>
          </View>
          <View style={styles.shortcutBadge}>
            <Text style={styles.shortcutValue}>
              {dailyBudget !== null && dailyBudget > 0 ? `${dailyBudget.toFixed(2)} DT` : 'NOT SET'}
            </Text>
            <Text style={styles.shortcutArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Daily Expense Lock */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.itemTitle}>Daily Expense Lock</Text>
            <Text style={styles.itemDesc}>
              Block adding new expenses once your daily spending reaches the configured daily limit. Income is never blocked.
            </Text>
          </View>
          <Switch
            value={lockEnabled}
            onValueChange={handleToggleLock}
            thumbColor={lockEnabled ? colors.danger : colors.textMuted}
            trackColor={{ false: colors.border, true: '#4A1A1A' }}
          />
        </View>

        {lockEnabled && (
          <View style={styles.lockWarning}>
            <Text style={styles.lockWarningText}>
              🔒 EXPENSE LOCK IS ACTIVE. Once today's spending reaches your daily limit, new expenses are blocked.
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Week Start */}
        <View style={styles.infoRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.itemTitle}>Week Start</Text>
            <Text style={styles.itemDesc}>
              Standard week cycle used by Grind weekly commitments and reflections.
            </Text>
          </View>
          <Text style={styles.fixedBadge}>MONDAY (STANDARD)</Text>
        </View>
      </View>

      {/* ── 4. DATA & PRIVACY SECTION ─────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DATA & PRIVACY</Text>

        {/* Export Grind Data */}
        <View style={styles.actionBlock}>
          <Text style={styles.itemTitle}>Export Grind Data</Text>
          <Text style={styles.itemDesc}>
            Download a structured JSON file of your local Grind goals, check-ins, reflections, and notes stored on this device.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleExportGrindData}
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.actionBtnSecondaryText}>EXPORT GRIND DATA</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Clear Grind Data */}
        <View style={styles.actionBlock}>
          <Text style={[styles.itemTitle, { color: colors.danger }]}>Clear Grind Data</Text>
          <Text style={styles.itemDesc}>
            Permanently delete local Grind accountability goals, notes, and check-in logs. Financial data (budgets, expenses, incomes, savings) will NOT be affected.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={confirmClearGrindData}
            disabled={clearingGrind}
            activeOpacity={0.7}
          >
            {clearingGrind ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.actionBtnDangerText}>CLEAR GRIND DATA</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 5. ABOUT SECTION ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ABOUT</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Application</Text>
          <Text style={styles.infoValue}>NoCapSpend • Boondocks Mode</Text>
        </View>
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.clickableRow}
          onPress={() =>
            showAlert(
              'Privacy Architecture',
              'NoCapSpend utilizes a local-first architecture for personal accountability features. Financial records are synced privately to your cloud database.\n\nNo external tracking networks or third-party ad telemetry are integrated.'
            )
          }
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Privacy Architecture</Text>
          <Text style={styles.shortcutArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.clickableRow}
          onPress={() =>
            showAlert(
              'Terms of Service',
              'NoCapSpend is designed for individual personal budgeting, goal setting, and financial discipline.'
            )
          }
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Terms of Service</Text>
          <Text style={styles.shortcutArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0 (Production Build)</Text>
        </View>
      </View>

      {/* ── Back to Dashboard ─────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => safeBack('/')}
        activeOpacity={0.7}
      >
        <Text style={styles.backBtnText}>← BACK TO DASHBOARD</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Shared Reusable Daily Limit Modal */}
      <AdjustDailyLimitModal
        visible={limitModalVisible}
        currentLimit={dailyBudget}
        onClose={() => setLimitModalVisible(false)}
        onSaved={(newLimit) => {
          setDailyBudgetState(newLimit);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },

  // Headers
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 24,
  },

  // Sections
  section: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  fixedBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },

  // Items / Toggles
  itemTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  itemDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  toggleTextCol: {
    flex: 1,
  },

  // Shortcut Row
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  shortcutTextCol: {
    flex: 1,
  },
  shortcutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shortcutValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  shortcutArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // Lock Warning
  lockWarning: {
    marginTop: 10,
    backgroundColor: '#1C0D0D',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 10,
  },
  lockWarningText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },

  // Action Blocks
  actionBlock: {
    paddingVertical: 4,
  },
  actionBtn: {
    marginTop: 10,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderWidth: 1.5,
  },
  actionBtnSecondary: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderAccent,
  },
  actionBtnSecondaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  actionBtnDanger: {
    backgroundColor: '#1C0D0D',
    borderColor: colors.danger,
  },
  actionBtnDangerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.danger,
    letterSpacing: 1.2,
  },

  // Sign out button
  signOutBtn: {
    marginTop: 12,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },

  // Back Button
  backBtn: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
    minHeight: 48,
    marginTop: 8,
  },
  backBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
});
