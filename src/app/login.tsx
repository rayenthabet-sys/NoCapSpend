import { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { showAlert } from '../lib/dialog';
import { useNetworkStatus } from '../lib/networkStatus';
import BudgetCharacter from '../components/BudgetCharacter';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

const REMEMBER_EMAIL_KEY = '@budget_buddy:remember_account_email';
const REMEMBER_FLAG_KEY  = '@budget_buddy:remember_account_enabled';

export default function Login() {
  const auth = useAuth() as any;
  const session = auth?.session;
  const loading = auth?.loading;
  const { isOnline } = useNetworkStatus();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // Load remembered email on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedFlag, storedEmail] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_FLAG_KEY),
          AsyncStorage.getItem(REMEMBER_EMAIL_KEY),
        ]);
        const flagEnabled = storedFlag === 'true';
        setRememberAccount(flagEnabled);
        if (flagEnabled && storedEmail) {
          setEmail(storedEmail);
        }
      } catch {}
    })();
  }, []);

  if (session) {
    return <Redirect href="/" />;
  }

  // Offline with no session — show friendly message
  if (!loading && !session && !isOnline) {
    return (
      <View style={styles.offlineScreen}>
        <GlobalCornerFigure assetId="robert_guidance" size={75} opacity={0.2} position="top-right" />
        <BudgetCharacter assetId="robert_neutral" size="hero" animated />
        <Text style={styles.offlineTitle}>NO CONNECTION</Text>
        <Text style={styles.offlineBody}>
          Please connect to the internet{'\n'}to sign in for the first time.
        </Text>
      </View>
    );
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setSigningIn(false);

    if (error) {
      showAlert('Error', error.message);
    } else {
      // Persist or clear remembered email
      if (rememberAccount) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
        await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'false');
      }
    }
  }

  async function signUp() {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSigningIn(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });
    setSigningIn(false);
    if (error) showAlert('Error', error.message);
    else showAlert('Success', 'Account created — you can log in now.');
  }

  async function handleToggleRemember() {
    const next = !rememberAccount;
    setRememberAccount(next);
    if (!next) {
      // User disabled — clear stored email immediately
      await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'false');
    } else {
      await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'true');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.kavWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
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
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
          textContentType="emailAddress"
          autoComplete="email"
        />
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          returnKeyType="go"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={signIn}
          textContentType="password"
          autoComplete="current-password"
        />

        {/* Remember Account toggle */}
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={handleToggleRemember}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, rememberAccount && styles.checkboxChecked]}>
            {rememberAccount && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.rememberLabel}>REMEMBER ACCOUNT</Text>
        </TouchableOpacity>

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

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kavWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
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

  // Remember Account row
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 44,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 16,
  },
  rememberLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    flexShrink: 1,
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

  // Offline screen
  offlineScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  offlineTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  offlineBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
});