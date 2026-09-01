import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';
import BudgetCharacter from './BudgetCharacter';
import { resolveAchievementReaction } from '../lib/grindReactions';

interface AchievementUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  achievement: any;
}

export default function AchievementUnlockModal({
  visible,
  onClose,
  achievement,
}: AchievementUnlockModalProps) {
  if (!visible || !achievement) return null;

  const reaction = resolveAchievementReaction(achievement.id);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── HEADER ── */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>ACHIEVEMENT UNLOCKED</Text>
                <Text style={styles.headerSubtitle}>PROOF OF EXECUTION</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── ACHIEVEMENT DISPLAY BOX ── */}
            <View style={styles.achievementBox}>
              <Text style={styles.achievementIcon}>{achievement.icon || '🏆'}</Text>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {achievement.category || 'MILESTONE'}
                </Text>
              </View>
            </View>

            {/* ── CHARACTER REACTION BOX ── */}
            <View style={styles.characterSection}>
              <BudgetCharacter
                assetId={reaction.assetId}
                animationType={reaction.animationType as any}
                size="small"
                animated={true}
              />
              <View style={styles.speechBubble}>
                <Text style={styles.speakerText}>{reaction.speaker}</Text>
                <Text style={styles.quoteText}>“{reaction.quote}”</Text>
                <Text style={styles.subtextText}>{reaction.subtext}</Text>
              </View>
            </View>

            {/* ── DISMISS BUTTON ── */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionBtnText}>KEEP GRINDING</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1.5,
    borderRadius: radii.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primaryBright,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
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
  achievementBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  achievementTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primaryBright,
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.borderAccent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  categoryBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
  },
  characterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 18,
    gap: 12,
  },
  speechBubble: {
    flex: 1,
  },
  speakerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  quoteText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primaryBright,
    letterSpacing: 1,
    lineHeight: 19,
    marginBottom: 2,
  },
  subtextText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
});
