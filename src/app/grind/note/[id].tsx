import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { safeBack } from '../../../lib/nav';
import { useAuth } from '../../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../../lib/theme';
import { showAlert } from '../../../lib/dialog';
import {
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from '../../../lib/grindNotes';
import { getGrindGoalById } from '../../../lib/grindStore';

export default function GrindNoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth: any = useAuth();
  const session = auth?.session;

  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [convertedGoalId, setConvertedGoalId] = useState<string | null>(null);
  const [linkedGoal, setLinkedGoal] = useState<any>(null);
  const [linkedGoalChecked, setLinkedGoalChecked] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && session && id) {
      (async () => {
        setLoading(true);
        try {
          const note: any = await getNoteById(session.user.id, id);
          if (note) {
            setTitle(note.title || '');
            setContent(note.content || '');
            setIsPinned(Boolean(note.isPinned));
            setConvertedGoalId(note.convertedToGoalId || null);

            if (note.convertedToGoalId) {
              const goal: any = await getGrindGoalById(session.user.id, note.convertedToGoalId);
              setLinkedGoal(goal);
            }
            setLinkedGoalChecked(true);
          } else {
            showAlert('Note Not Found', 'This note may have been deleted.', [
              { text: 'OK', onPress: () => safeBack('/grind/notes') },
            ]);
          }
        } catch (err) {
          console.warn('[GrindNoteEditor] error loading note', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isNew, session, id]);

  const handleSave = async () => {
    if (!session) {
      showAlert('Not logged in', 'Please sign in to save notes.');
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      showAlert('Empty Note', 'Please write something before saving.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await createNote(session.user.id, {
          title: trimmedTitle,
          content: trimmedContent,
          isPinned,
        });
      } else {
        await updateNote(session.user.id, id, {
          title: trimmedTitle,
          content: trimmedContent,
          isPinned,
        });
      }
      safeBack('/grind/notes');
    } catch (err: any) {
      showAlert('Save Failed', err.message || 'Could not save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!session || isNew) return;
    showAlert(
      'DELETE NOTE',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(session.user.id, id);
            safeBack('/grind/notes');
          },
        },
      ]
    );
  };

  const handleConvertToGoal = async () => {
    if (!session) return;

    let targetNoteId = id;
    // If it's a new unsaved note, save it first
    if (isNew) {
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      if (!trimmedTitle && !trimmedContent) {
        showAlert('Empty Note', 'Please write something in your note before converting to a goal.');
        return;
      }
      const created: any = await createNote(session.user.id, {
        title: trimmedTitle,
        content: trimmedContent,
        isPinned,
      });
      targetNoteId = created.id;
    }

    router.push(
      `/grind/add-goal?fromNoteId=${encodeURIComponent(targetNoteId)}&prefillTitle=${encodeURIComponent(
        title.trim()
      )}&prefillDesc=${encodeURIComponent(content.trim())}` as any
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => safeBack('/grind/notes')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backLink}>← NOTES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pinToggleBtn, isPinned && styles.pinToggleBtnActive]}
            onPress={() => setIsPinned(!isPinned)}
          >
            <Text style={[styles.pinToggleText, isPinned && styles.pinToggleTextActive]}>
              {isPinned ? '★ PINNED' : '☆ PIN NOTE'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenTitle}>{isNew ? 'NEW NOTE' : 'EDIT NOTE'}</Text>

        {/* ── CONVERTED GOAL BANNER ── */}
        {convertedGoalId && linkedGoalChecked && (
          <View
            style={[
              styles.conversionBanner,
              linkedGoal ? styles.conversionBannerValid : styles.conversionBannerStale,
            ]}
          >
            {linkedGoal ? (
              <View style={styles.linkedGoalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedGoalLabel}>✓ CONVERTED TO GRIND GOAL</Text>
                  <Text style={styles.linkedGoalTitle} numberOfLines={1}>
                    {linkedGoal.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewGoalBtn}
                  onPress={() => router.push(`/grind/goal/${linkedGoal.id}` as any)}
                >
                  <Text style={styles.viewGoalBtnText}>VIEW GOAL →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.linkedGoalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staleGoalLabel}>⚠ LINKED GOAL NO LONGER EXISTS</Text>
                  <Text style={styles.staleGoalSub}>The goal was deleted or unlinked.</Text>
                </View>
                <TouchableOpacity
                  style={styles.convertAgainBtn}
                  onPress={handleConvertToGoal}
                >
                  <Text style={styles.convertAgainBtnText}>CONVERT AGAIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── TITLE INPUT ── */}
        <Text style={styles.fieldLabel}>TITLE</Text>
        <TextInput
          style={styles.inputTitle}
          placeholder="Note title or plan summary..."
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        {/* ── CONTENT INPUT ── */}
        <Text style={styles.fieldLabel}>NOTE CONTENT</Text>
        <TextInput
          style={styles.inputContent}
          placeholder="Dump your thoughts, study plan, workout routine, or tasks..."
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        <View style={{ height: 20 }} />

        {/* ── CONVERT BUTTON ── */}
        <TouchableOpacity
          style={styles.convertActionBtn}
          onPress={handleConvertToGoal}
          activeOpacity={0.8}
        >
          <Text style={styles.convertActionBtnText}>🎯 CONVERT TO GRIND GOAL</Text>
        </TouchableOpacity>

        {/* ── SAVE BUTTON ── */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {saving ? 'SAVING...' : isNew ? 'SAVE NOTE' : 'SAVE CHANGES'}
          </Text>
        </TouchableOpacity>

        {/* ── DELETE BUTTON ── */}
        {!isNew && (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonTextDanger}>DELETE NOTE</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  container: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 48,
    maxWidth: 580,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  pinToggleBtn: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.xs,
  },
  pinToggleBtnActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  pinToggleText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  pinToggleTextActive: {
    color: colors.primaryBright,
    fontFamily: fonts.bodyBold,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  conversionBanner: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
  },
  conversionBannerValid: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
  },
  conversionBannerStale: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
  linkedGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  linkedGoalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.income,
    letterSpacing: 1,
    marginBottom: 2,
  },
  linkedGoalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  viewGoalBtn: {
    backgroundColor: colors.card,
    borderColor: colors.income,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  viewGoalBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.income,
    letterSpacing: 0.5,
  },
  staleGoalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  staleGoalSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  convertAgainBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  convertAgainBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  inputContent: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    padding: 12,
    minHeight: 160,
    lineHeight: 20,
    marginBottom: 14,
  },
  convertActionBtn: {
    backgroundColor: colors.cardSecondary,
    borderColor: colors.primaryDark,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  convertActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  button: {
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 48,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  dangerButton: {
    backgroundColor: colors.expenseCard,
    borderColor: colors.expenseBorder,
    marginTop: 6,
  },
  buttonTextDanger: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
    letterSpacing: 1.5,
  },
});
