import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../lib/theme';

interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentRoute?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.82), 340);
const ANIMATION_DURATION = 220;

export default function NavigationDrawer({
  visible,
  onClose,
  currentRoute = '/',
}: NavigationDrawerProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: ANIMATION_DURATION,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      if (path === currentRoute) return;
      router.push(path as any);
    }, 150);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Drawer content */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brandTitle}>
                No<Text style={styles.brandAccent}>Cap</Text>Spend
              </Text>
              <Text style={styles.brandSub}>BOONDOCKS MODE</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close navigation menu"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── SECTION: THE GRIND ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>THE GRIND</Text>
              <View style={styles.badgeNew}>
                <Text style={styles.badgeNewText}>NEW</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.navItem,
                styles.grindFeaturedItem,
                currentRoute === '/grind' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind')}
            >
              <Text style={styles.navIcon}>🎯</Text>
              <Text style={[styles.navText, styles.grindFeaturedText]}>THE GRIND</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/week' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/week')}
            >
              <Text style={styles.navIcon}>📅</Text>
              <Text style={styles.navText}>THIS WEEK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/notes' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/notes')}
            >
              <Text style={styles.navIcon}>📝</Text>
              <Text style={styles.navText}>WAR ROOM NOTES</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/achievements' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/achievements')}
            >
              <Text style={styles.navIcon}>🏆</Text>
              <Text style={styles.navText}>RECORD & ACHIEVEMENTS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/receipt' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/receipt')}
            >
              <Text style={styles.navIcon}>🧾</Text>
              <Text style={styles.navText}>WEEKLY RECEIPTS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/reflection' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/reflection')}
            >
              <Text style={styles.navIcon}>💭</Text>
              <Text style={styles.navText}>WEEKLY REFLECTION</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                currentRoute === '/grind/court' && styles.navItemActive,
              ]}
              onPress={() => handleNavigate('/grind/court')}
            >
              <Text style={styles.navIcon}>⚖</Text>
              <Text style={styles.navText}>CHARACTER COURT</Text>
            </TouchableOpacity>

            {/* ── SECTION: FINANCIAL ── */}
            <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
              <Text style={styles.sectionTitle}>FINANCIAL</Text>
            </View>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/' && styles.navItemActive]}
              onPress={() => handleNavigate('/')}
            >
              <Text style={styles.navIcon}>🏠</Text>
              <Text style={styles.navText}>DASHBOARD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/goals' && styles.navItemActive]}
              onPress={() => handleNavigate('/goals')}
            >
              <Text style={styles.navIcon}>💰</Text>
              <Text style={styles.navText}>SAVINGS GOALS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/budgets' && styles.navItemActive]}
              onPress={() => handleNavigate('/budgets')}
            >
              <Text style={styles.navIcon}>📋</Text>
              <Text style={styles.navText}>BUDGETS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/statistics' && styles.navItemActive]}
              onPress={() => handleNavigate('/statistics')}
            >
              <Text style={styles.navIcon}>📊</Text>
              <Text style={styles.navText}>ANALYTICS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/categories' && styles.navItemActive]}
              onPress={() => handleNavigate('/categories')}
            >
              <Text style={styles.navIcon}>🏷</Text>
              <Text style={styles.navText}>CATEGORIES</Text>
            </TouchableOpacity>

            {/* ── SECTION: SYSTEM ── */}
            <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
              <Text style={styles.sectionTitle}>SYSTEM</Text>
            </View>

            <TouchableOpacity
              style={[styles.navItem, currentRoute === '/settings' && styles.navItemActive]}
              onPress={() => handleNavigate('/settings')}
            >
              <Text style={styles.navIcon}>⚙</Text>
              <Text style={styles.navText}>SETTINGS</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>NoCapSpend • v1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  drawer: {
    backgroundColor: colors.surface,
    borderRightWidth: 1.5,
    borderRightColor: colors.borderAccent,
    height: '100%',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  brandTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: colors.primary,
  },
  brandSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 2.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: 2,
  },
  badgeNew: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeNewText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  grindFeaturedItem: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginBottom: 6,
  },
  grindFeaturedText: {
    color: colors.primaryBright,
    fontFamily: fonts.bodyBold,
  },
  navItemActive: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  navItemDisabled: {
    opacity: 0.45,
    justifyContent: 'space-between',
  },
  navIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 22,
    textAlign: 'center',
  },
  iconMuted: {
    opacity: 0.6,
  },
  navText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 1,
    flex: 1,
  },
  textMuted: {
    color: colors.textMuted,
  },
  comingSoonTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
