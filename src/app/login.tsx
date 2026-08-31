import { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { showAlert } from '../lib/dialog';
import BudgetCharacter from '../components/BudgetCharacter';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function Login() {
  const auth = useAuth() as any;
  const session = auth?.session;
  const loading = auth?.loading;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
    setSigningIn(false);
    if (error) showAlert('Error', error.message);
  }

  async function signUp() {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSigningIn(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim() });
    setSigningIn(false);
    if (error) showAlert('Error', error.message);
    else showAlert('Success', 'Account created — you can log in now.');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <GlobalCornerFigure assetId="robert_guidance" size={75} opacity={0.2} position="top-right" />

      <View style={styles.characterWrapper}>
        <BudgetCharacter assetId="robert_neutral" size="hero" animated />
      </View>

      <Text style={styles.title}>BUDGET BUDDY</Text>
      <Text style={styles.subtitle}>TRACK YOUR FINANCES</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={signIn}
        disabled={signingIn}
      >
        <Text style={styles.buttonText}>{signingIn ? 'LOGGING IN...' : 'LOGIN'}</Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={signUp}
        disabled={signingIn}
      >
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
          {signingIn ? 'WAIT...' : 'CREATE ACCOUNT'}
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
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 2,
  },
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
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
});