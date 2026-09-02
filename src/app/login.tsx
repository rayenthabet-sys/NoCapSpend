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

  const [mode, setMode]                       = useState<'login' | 'signup'>('login');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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

  function switchMode(newMode: 'login' | 'signup') {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setSubmitting(false);

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
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showAlert('Missing fields', 'Enter your email and password.');
      return;
    }
    if (trimmedPassword.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      showAlert('Password Mismatch', 'Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
    });
    setSubmitting(false);

    if (error) {
      showAlert('Error', error.message);
    } else {
      if (data?.session) {
        if (rememberAccount) {
          await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
          await AsyncStorage.setItem(REMEMBER_FLAG_KEY, 'true');
        }
      } else {
        showAlert('Account Created', 'Your account has been created! Please log in.');
        switchMode('login');
      }
    }
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
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'TRACK YOUR FINANCES' : 'CREATE YOUR ACCOUNT'}
        </Text>

        {/* Tab switcher: lets the user choose Create Account first */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => switchMode('login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              SIGN IN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'signup' && styles.tabActive]}
            onPress={() => switchMode('signup')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
              CREATE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

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
          placeholder={mode === 'login' ? 'Password' : 'Create password (min 6 chars)'}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          returnKeyType={mode === 'login' ? 'go' : 'next'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            if (mode === 'login') {
              signIn();
            } else {
              confirmPasswordRef.current?.focus();
            }
          }}
          blurOnSubmit={mode === 'login'}
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {mode === 'signup' && (
          <TextInput
            ref={confirmPasswordRef}
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            returnKeyType="go"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onSubmitEditing={signUp}
            textContentType="newPassword"
          />
        )}

        {/* Remember Account toggle (shown in Login mode) */}
        {mode === 'login' && (
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
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={mode === 'login' ? signIn : signUp}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting
              ? (mode === 'login' ? 'LOGGING IN...' : 'CREATING ACCOUNT...')
              : (mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />

        {/* Bottom switcher helper */}
        <TouchableOpacity
          style={styles.switchModeContainer}
          onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchModeText}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.switchModeHighlight}>
              {mode === 'login' ? 'CREATE ACCOUNT' : 'LOG IN'}
            </Text>
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
    marginBottom: spacing.lg,
    letterSpacing: 2,
  },

  // Mode switcher tab bar
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xs,
  },
  tabActive: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: colors.primary,
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
  buttonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },

  // Bottom switch mode helper
  switchModeContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  switchModeHighlight: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
    letterSpacing: 1,
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