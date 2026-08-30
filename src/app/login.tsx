import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing, labels } from '../lib/theme';
import BudgetCharacter from '../components/BudgetCharacter';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  }

  async function signUp() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim() });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Account created — you can log in now.');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <GlobalCornerFigure view="side" size={80} opacity={0.3} position="top-right" />
      <GlobalCornerFigure view="back" size={75} opacity={0.25} position="bottom-left" />

      <View style={styles.characterWrapper}>
        <BudgetCharacter character="master" size="hero" animated />
      </View>

      <Text style={styles.title}>BUDGET BUDDY</Text>
      <Text style={styles.subtitle}>COUNTIN' BANDS & RACKS</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={signIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'LOGGING IN...' : 'LOGIN'}</Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={signUp}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
          {loading ? 'WAIT...' : 'CREATE ACCOUNT'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  characterWrapper: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 2,
  },
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
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 1.5,
  },
});