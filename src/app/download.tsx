// ─────────────────────────────────────────────────────────────────
// NoCapSpend — Public Android APK Download Screen
// Public route accessible without authentication.
// Supports both State A (Pending build) and State B (Verified release).
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { APK_RELEASE_CONFIG } from '../config/releaseConfig';
import GlobalCornerFigure from '../components/GlobalCornerFigure';

export default function DownloadScreen() {
  const [copiedHash, setCopiedHash] = useState(false);

  const isAvailable = APK_RELEASE_CONFIG.available && !!APK_RELEASE_CONFIG.downloadUrl;

  const handleDownload = async () => {
    if (!isAvailable || !APK_RELEASE_CONFIG.downloadUrl) return;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(APK_RELEASE_CONFIG.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        const canOpen = await Linking.canOpenURL(APK_RELEASE_CONFIG.downloadUrl);
        if (canOpen) {
          await Linking.openURL(APK_RELEASE_CONFIG.downloadUrl);
        }
      }
    } catch (err) {
      console.warn('[DownloadScreen] Download launch error:', err);
    }
  };

  const handleCopyHash = () => {
    if (!APK_RELEASE_CONFIG.sha256) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(APK_RELEASE_CONFIG.sha256);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      }
    } catch {}
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <GlobalCornerFigure assetId="robert_guidance" size={75} opacity={0.25} position="top-right" />

      {/* ── Brand Header ─────────────────────────────────────────── */}
      <View style={styles.headerBox}>
        <Text style={styles.brandTitle}>NOCAPSPEND</Text>
        <Text style={styles.brandSubtitle}>THE GRIND // BOONDOCKS MODE</Text>
        <Text style={styles.tagline}>Take control of your money. No excuses.</Text>
      </View>

      {/* ── Release Information Card ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, isAvailable ? styles.statusBadgeReady : styles.statusBadgePending]}>
            <Text style={[styles.statusBadgeText, isAvailable ? styles.statusBadgeTextReady : styles.statusBadgeTextPending]}>
              {isAvailable ? '● VERIFIED PRODUCTION BUILD' : '● RELEASE IN PREPARATION'}
            </Text>
          </View>
          <Text style={styles.versionTag}>v{APK_RELEASE_CONFIG.version}</Text>
        </View>

        <Text style={styles.cardTitle}>ANDROID APK DIRECT RELEASE</Text>
        <Text style={styles.cardDescription}>
          Standalone Android application build. Sideload directly to your Android device without Google Play Store dependencies.
        </Text>

        {/* Specs Table */}
        <View style={styles.specsGrid}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>File Name</Text>
            <Text style={styles.specValue}>{APK_RELEASE_CONFIG.fileName}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>App Version</Text>
            <Text style={styles.specValue}>{APK_RELEASE_CONFIG.version} (Code {APK_RELEASE_CONFIG.versionCode})</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Compatibility</Text>
            <Text style={styles.specValue}>{APK_RELEASE_CONFIG.minAndroidVersion}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Download Size</Text>
            <Text style={styles.specValue}>{APK_RELEASE_CONFIG.sizeEstimate}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Release Date</Text>
            <Text style={styles.specValue}>{APK_RELEASE_CONFIG.releaseDate || 'Pending Build'}</Text>
          </View>
        </View>

        {/* ── Action / State Banner ──────────────────────────────── */}
        {isAvailable ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleDownload}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Download Android APK"
          >
            <Text style={styles.primaryButtonText}>⬇  DOWNLOAD ANDROID APK</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerTitle}>Android APK coming soon</Text>
            <Text style={styles.pendingBannerText}>
              The production APK build is currently being compiled via EAS. As soon as the build artifact is verified and published to GitHub Releases, the direct download button will activate here.
            </Text>
            <View style={[styles.button, styles.disabledButton]}>
              <Text style={styles.disabledButtonText}>BUILD IN PREPARATION</Text>
            </View>
          </View>
        )}

        {/* ── Integrity Verification Box ────────────────────────── */}
        <View style={styles.integrityBox}>
          <View style={styles.integrityHeader}>
            <Text style={styles.integrityTitle}>SHA-256 INTEGRITY CHECKSUM</Text>
            {isAvailable && APK_RELEASE_CONFIG.sha256 ? (
              <TouchableOpacity onPress={handleCopyHash} style={styles.copyBtn}>
                <Text style={styles.copyBtnText}>{copiedHash ? 'COPIED!' : 'COPY'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.integrityHash} selectable>
            {APK_RELEASE_CONFIG.sha256
              ? APK_RELEASE_CONFIG.sha256
              : 'Verified SHA-256 hash will be displayed here upon official release build confirmation.'}
          </Text>
        </View>
      </View>

      {/* ── Installation Sideload Guide ───────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DIRECT INSTALLATION GUIDE</Text>
        <Text style={styles.guideStep}>
          <Text style={styles.stepNum}>1. Download APK: </Text>
          Download the production APK directly on your Android phone.
        </Text>
        <Text style={styles.guideStep}>
          <Text style={styles.stepNum}>2. Allow Unknown Sources: </Text>
          When prompted, enable "Install unknown apps" for your browser in Android Settings &gt; Security.
        </Text>
        <Text style={styles.guideStep}>
          <Text style={styles.stepNum}>3. Tap Install: </Text>
          Open the downloaded APK and tap "Install". Your existing database and preferences are preserved.
        </Text>
        <Text style={styles.guideStep}>
          <Text style={styles.stepNum}>4. Verify Checksum (Optional): </Text>
          Compare the file's SHA-256 hash against the integrity checksum above to confirm package authenticity.
        </Text>
      </View>

      {/* ── Secondary Navigation ──────────────────────────────────── */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Open Web Application"
        >
          <Text style={styles.secondaryButtonText}>← OPEN WEB APPLICATION</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        NoCapSpend is encrypted, private, and powered by Supabase RLS.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  headerBox: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.primary,
    letterSpacing: 3,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 2,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusBadgePending: {
    backgroundColor: 'rgba(217, 138, 43, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  statusBadgeReady: {
    backgroundColor: 'rgba(78, 154, 81, 0.15)',
    borderWidth: 1,
    borderColor: colors.income,
  },
  statusBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  statusBadgeTextPending: {
    color: colors.warning,
  },
  statusBadgeTextReady: {
    color: colors.income,
  },
  versionTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  specsGrid: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  specLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  specValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: '#000000',
    letterSpacing: 1.5,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  disabledButtonText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  pendingBanner: {
    backgroundColor: 'rgba(217, 138, 43, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 138, 43, 0.3)',
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingBannerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.warning,
    marginBottom: 4,
  },
  pendingBannerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  integrityBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  integrityTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  copyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.primaryBright,
  },
  integrityHash: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    ...(Platform.OS === 'web' ? ({ wordBreak: 'break-all' } as any) : {}),
  },
  guideStep: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  stepNum: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  navRow: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
