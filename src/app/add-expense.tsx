import { useState, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { getCategoryActualSpend, getEffectiveBudget, firstOfMonth } from '../lib/budgets';
import { recordExpenseLogged } from '../lib/characters';
import BudgetCharacter from '../components/BudgetCharacter';
import ReactionText from '../components/ReactionText';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function AddExpense() {
  const { session } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeReaction, setActiveReaction] = useState(null);
  const [reactionText, setReactionText] = useState(null);
  const [shake, setShake] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('type', 'expense')
      .order('name');
    if (!error && data) setCategories(data);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  async function saveExpense() {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a number greater than 0.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('expenses').insert({
      user_id: session.user.id,
      amount: numericAmount,
      note: note.trim() || null,
      category_id: selectedCategoryId,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? 'monthly' : null,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Persist expense timestamp so Die Lit stays active for 1 minute
    await recordExpenseLogged();

    // Check if this expense pushed a budget over limit
    let isOverBudget = false;
    if (selectedCategoryId) {
      try {
        const spent = await getCategoryActualSpend(session.user.id, selectedCategoryId, firstOfMonth());
        const effective = await getEffectiveBudget(session.user.id, selectedCategoryId, 0);
        if (effective > 0 && spent > effective) {
          isOverBudget = true;
        }
      } catch (_) {}
    }

    setLoading(false);

    if (isOverBudget) {
      setActiveReaction('overBudget');
      setReactionText('FWÄÄH?! (OVER BUDGET)');
      setShake(true);
    } else {
      setActiveReaction('expenseAdded');
      setReactionText('-$' + numericAmount.toFixed(2) + ' / MUNYUN BLEED');
    }

    setTimeout(() => {
      router.back();
    }, 1800);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <GlobalCornerFigure view="side" size={60} opacity={0.3} position="top-right" />

      <Text style={styles.title}>LOG MUNYUN BLEED</Text>

      <View style={styles.characterRow}>
        <BudgetCharacter
          reaction={activeReaction}
          character={activeReaction ? undefined : 'dieLit'}
          size="medium"
          animated
          shake={shake}
        />
        <ReactionText
          text={reactionText}
          visible={!!reactionText}
          onDone={() => setReactionText(null)}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Amount (e.g. 25.50)"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TextInput
        style={styles.input}
        placeholder="Note (e.g. Food, Merch, Studio)"
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
      />

      <Text style={styles.label}>MUNYUN KILLER CATEGORY</Text>
      <View style={styles.chipRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCategoryId === cat.id && styles.chipSelected]}
            onPress={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
          >
            <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextSelected]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
        {categories.length === 0 && (
          <Text style={styles.noCategories}>No categories yet — you can still save without one.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.recurringRow} onPress={() => setIsRecurring(!isRecurring)}>
        <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]} />
        <Text style={styles.recurringLabel}>Repeats monthly (recurring bleed)</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={saveExpense}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'LOGGING...' : 'LOG BLEED'}</Text>
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
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textMuted, marginBottom: 10, letterSpacing: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.chip,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.cardSecondary,
    marginBottom: 6,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipText: { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: colors.text, fontFamily: fonts.bodySemiBold },
  noCategories: { fontFamily: fonts.body, color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },
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
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, letterSpacing: 1.5 },
});