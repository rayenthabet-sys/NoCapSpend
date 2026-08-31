import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { safeBack } from '../lib/nav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii } from '../lib/theme';
import { showAlert } from '../lib/dialog';

export default function AddGoal() {
  const auth: any = useAuth();
  const session = auth?.session;
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  async function saveGoal() {
    const numericTarget = parseFloat(targetAmount);
    if (!name.trim()) {
      showAlert('Missing name', 'Give your goal a name.');
      return;
    }
    if (!numericTarget || numericTarget <= 0) {
      showAlert('Invalid target', 'Enter a target amount greater than 0.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('goals').insert({
      user_id: session.user.id,
      name: name.trim(),
      target_amount: numericTarget,
      deadline: deadline.trim() || null,
    });
    setLoading(false);

    if (error) {
      showAlert('Error', error.message);
    } else {
      safeBack('/goals');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>NEW SAVINGS GOAL</Text>

      <TextInput
        style={styles.input}
        placeholder="Goal name (e.g. New Laptop)"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Target amount in DT (e.g. 150.00)"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={targetAmount}
        onChangeText={setTargetAmount}
      />
      <TextInput
        style={styles.input}
        placeholder="Deadline (YYYY-MM-DD, optional)"
        placeholderTextColor={colors.textMuted}
        value={deadline}
        onChangeText={setDeadline}
      />

      <View style={{ height: 16 }} />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={saveGoal}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'SAVING...' : '+ CREATE SAVINGS GOAL'}</Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/goals')}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>CANCEL</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40, maxWidth: 540, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: colors.textPrimary, textAlign: 'center', letterSpacing: 3, marginBottom: 24 },
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
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5 },
});