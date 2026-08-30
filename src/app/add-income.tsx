import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function AddIncome() {
  const { session } = useAuth();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  const [reactionText, setReactionText] = useState(null);
  const [pulse, setPulse] = useState(false);

  async function saveIncome() {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a number greater than 0.');
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
      Alert.alert('Error', error.message);
    } else {
      setActiveReaction('incomeAdded');
      setReactionText('+$' + numericAmount.toFixed(2) + ' / BAG SECURED');
      setPulse(true);
      setTimeout(() => {
        router.back();
      }, 1800);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GlobalCornerFigure view="frontAlt" size={60} opacity={0.3} position="top-right" />

      <Text style={styles.title}>SECURE THE BAG</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter
          reaction={activeReaction}
          character={activeReaction ? undefined : 'selfTitled'}
          size="medium"
          animated
          pulse={pulse}
        />
        <ReactionText
          text={reactionText}
          visible={!!reactionText}
          onDone={() => setReactionText(null)}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Amount (e.g. 500.00)"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TextInput
        style={styles.input}
        placeholder="Source (e.g. Salary, Show, Freelance, Merch)"
        placeholderTextColor={colors.textSecondary}
        value={source}
        onChangeText={setSource}
      />

      <TouchableOpacity style={styles.recurringRow} onPress={() => setIsRecurring(!isRecurring)}>
        <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]} />
        <Text style={styles.recurringLabel}>Repeats monthly (recurring bag)</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={saveIncome}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'SECURING...' : '+ SECURE BAG (+MUNYUN)'}</Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => router.back()}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>CANCEL</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, position: 'relative' },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40, maxWidth: 540, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.text, textAlign: 'center', letterSpacing: 3, marginBottom: 8 },
  characterRow: { alignItems: 'center', marginBottom: spacing.md, minHeight: 200, justifyContent: 'center' },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  recurringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, marginRight: 10 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  recurringLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.income },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, letterSpacing: 1.5 },
});