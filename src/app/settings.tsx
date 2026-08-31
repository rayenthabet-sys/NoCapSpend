import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Switch,
} from 'react-native';
import { safeBack } from '../lib/nav';
import { colors, fonts, radii, spacing } from '../lib/theme';
import {
  getDailyBudget,
  setDailyBudget,
  getDailyLockEnabled,
  setDailyLockEnabled,
} from '../lib/dailyBudget';
import { showAlert } from '../lib/dialog';
import { useFocusEffect } from 'expo-router';
import { useNetworkStatus } from '../lib/networkStatus';
import NetworkBanner from '../components/NetworkBanner';

export default function Settings() {
  const { status } = useNetworkStatus();
  const [dailyBudgetInput, setDailyBudgetInput] = useState('');
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadPrefs = useCallback(async () => {
    const budget = await getDailyBudget();
    const lock   = await getDailyLockEnabled();
    setDailyBudgetInput(budget !== null ? String(budget) : '');
    setLockEnabledState(lock);
  }, []);

  useFocusEffect(
    useCallback(() => { loadPrefs(); }, [loadPrefs])
  );

  async function handleSaveDailyBudget() {
    const trimmed = dailyBudgetInput.trim();
    if (!trimmed) {
      showAlert('Invalid value', 'Enter a daily budget amount greater than 0.');
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num) || num <= 0) {
      showAlert('Invalid value', 'Daily budget must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      await setDailyBudget(num);
      setSavedMsg('Daily budget saved.');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err: any) {
      showAlert('Error', err?.message || 'Could not save daily budget.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLock(val: boolean) {
    setLockEnabledState(val);
    await setDailyLockEnabled(val);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Network banner */}
      <NetworkBanner status={status} />

      <Text style={styles.title}>SETTINGS</Text>

      {/* ── Daily Budget ──────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DAILY BUDGET</Text>
        <Text style={styles.sectionDesc}>
          Set your daily spending limit. The app will track how much you spend each day and warn you as you approach the limit.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="e.g. 25.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={dailyBudgetInput}
            onChangeText={setDailyBudgetInput}
          />
          <Text style={styles.currencyLabel}>DT</Text>
        </View>

        {savedMsg ? <Text style={styles.savedMsg}>{savedMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={handleSaveDailyBudget}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'SAVING...' : 'SAVE DAILY BUDGET'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Expense Lock ──────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DAILY EXPENSE LOCK</Text>
        <Text style={styles.sectionDesc}>
          When enabled, adding new expenses will be blocked once your daily spending reaches the daily budget limit. Income is never blocked.
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            Lock expenses when daily limit is reached
          </Text>
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
              🔒  EXPENSE LOCK IS ACTIVE. Once today's spending reaches your daily budget, new expenses will be blocked.
            </Text>
          </View>
        )}
      </View>

      {/* ── Back ────────────────────────────────────── */}
      <TouchableOpacity style={[styles.btn, styles.ghostBtn]} onPress={() => safeBack('/')}>
        <Text style={[styles.btnText, { color: colors.textSecondary }]}>← BACK</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 52, paddingBottom: 40, maxWidth: 540, alignSelf: 'center', width: '100%' },

  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2.5,
    marginBottom: 28,
  },

  section: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
    flexWrap: 'wrap',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputFlex: { flex: 1, marginBottom: 0, marginRight: 10 },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    fontSize: 16,
  },
  currencyLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.primary,
    letterSpacing: 1,
  },

  savedMsg: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.income,
    marginBottom: 10,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: 12,
  },
  toggleLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    flexWrap: 'wrap',
  },

  lockWarning: {
    marginTop: 12,
    backgroundColor: '#1A0A0A',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 12,
  },
  lockWarningText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 18,
    flexWrap: 'wrap',
  },

  btn: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtn: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  ghostBtn:   { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 },
  btnText:    { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5, textAlign: 'center' },
});
