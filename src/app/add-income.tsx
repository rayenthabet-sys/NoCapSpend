import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { safeBack } from '../lib/nav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { resolveCharacterState } from '../lib/characterEngine';
import { showAlert } from '../lib/dialog';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function AddIncome() {
  const auth: any = useAuth();
  const session = auth?.session;
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeReactionState, setActiveReactionState] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');

  async function saveIncome() {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      showAlert('Invalid amount', 'Enter a number greater than 0.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('income_entries').insert({
      user_id: session.user.id,
      amount: numericAmount,
      source: source.trim() || null,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? 'monthly' : null,
    });
    setLoading(false);

    if (error) {
      showAlert('Error', error.message);
      return;
    }

    // ── Success: show reaction, reset form, STAY on this screen ──
    const reaction: any = resolveCharacterState({
      incomeTotal: numericAmount,
      eventTrigger: 'incomeAdded',
    });
    setActiveReactionState(reaction);
    setSuccessMsg(`+${numericAmount.toFixed(2)} DT recorded.`);

    // Reset form so user can log another entry without navigating away
    setAmount('');
    setSource('');
    setIsRecurring(false);

    // Clear success banner after reaction finishes
    setTimeout(() => {
      setSuccessMsg('');
      setActiveReactionState(null);
    }, (reaction?.durationMs || 2000) + 500);

    // ── No automatic navigation. User presses BACK to leave. ──
  }

  const currentAssetId = activeReactionState?.assetId || 'slickback_cash';
  const currentAnimType = activeReactionState?.animationType || 'native';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GlobalCornerFigure assetId="slickback_cash" size={60} opacity={0.25} position="top-right" />

      <Text style={styles.title}>ADD INCOME</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter
          assetId={currentAssetId}
          animationType={currentAnimType}
          size="medium"
          animated
          pulse={activeReactionState?.pulse || false}
        />
        <ReactionText
          text={activeReactionState?.reactionText || null}
          visible={!!activeReactionState}
          onDone={() => setActiveReactionState(null)}
        />
      </View>

      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓  {successMsg}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Amount in DT (e.g. 50.00)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TextInput
        style={styles.input}
        placeholder="Source (e.g. Salary, Show, Freelance, Merch)"
        placeholderTextColor={colors.textMuted}
        value={source}
        onChangeText={setSource}
      />

      <TouchableOpacity style={styles.recurringRow} onPress={() => setIsRecurring(!isRecurring)}>
        <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]} />
        <Text style={styles.recurringLabel}>Repeats monthly (Recurring Income)</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={saveIncome}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'SAVING...' : '+ ADD INCOME'}</Text>
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
  successBanner: {
    backgroundColor: '#0D1F0D',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.income,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
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
  recurringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, minHeight: 44 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, marginRight: 10 },
  checkboxChecked: { backgroundColor: colors.income, borderColor: colors.primaryBright },
  recurringLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.income },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5 },
});