import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { safeBack } from '../../lib/nav';
import { useAuth } from '../../lib/AuthContext';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { showAlert } from '../../lib/dialog';
import {
  getNotes,
  deleteNote,
  toggleNotePinned,
} from '../../lib/grindNotes';

export default function GrindNotesScreen() {
  const auth: any = useAuth();
  const session = auth?.session;

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const allNotes = await getNotes(session.user.id);
      setNotes(allNotes);
    } catch (err) {
      console.warn('[GrindNotesScreen] loadNotes failed', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleTogglePin = async (noteId: string, e?: any) => {
    e?.stopPropagation?.();
    if (!session) return;
    await toggleNotePinned(session.user.id, noteId);
    loadNotes();
  };

  const handleDelete = (note: any, e?: any) => {
    e?.stopPropagation?.();
    if (!session) return;
    showAlert(
      'DELETE NOTE',
      `Are you sure you want to delete "${note.title || 'this note'}"?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(session.user.id, note.id);
            loadNotes();
          },
        },
      ]
    );
  };

  const handleConvertToGoal = (note: any, e?: any) => {
    e?.stopPropagation?.();
    const title = note.title || '';
    const desc = note.content || '';
    router.push(
      `/grind/add-goal?fromNoteId=${encodeURIComponent(note.id)}&prefillTitle=${encodeURIComponent(
        title
      )}&prefillDesc=${encodeURIComponent(desc)}` as any
    );
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderNoteCard = (note: any) => {
    const isConverted = Boolean(note.convertedToGoalId);

    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, note.isPinned && styles.noteCardPinned]}
        onPress={() => router.push(`/grind/note/${note.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {note.title || 'UNTITLED NOTE'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.pinBtn}
            onPress={(e) => handleTogglePin(note.id, e)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.pinIcon, note.isPinned && styles.pinIconActive]}>
              {note.isPinned ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {Boolean(note.content) && (
          <Text style={styles.noteContentPreview} numberOfLines={2}>
            {note.content}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.noteDate}>
            UPDATED {formatDate(note.updatedAt || note.createdAt)}
          </Text>

          <View style={styles.cardActionsRow}>
            {isConverted ? (
              <View style={styles.convertedBadge}>
                <Text style={styles.convertedBadgeText}>✓ CONVERTED TO GOAL</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.convertBtn}
                onPress={(e) => handleConvertToGoal(note, e)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.convertBtnText}>→ TO GOAL</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => handleDelete(note, e)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => safeBack('/grind')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backLink}>← THE GRIND</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newNoteBtn}
          onPress={() => router.push('/grind/note/new' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.newNoteBtnText}>+ NEW NOTE</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenTitle}>WAR ROOM NOTES</Text>
      <Text style={styles.screenSubtitle}>WRITE IT DOWN. CONVERT IT. GRIND.</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notes.length === 0 ? (
        /* ── EMPTY STATE ── */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyQuote}>“NOTES DON'T DO SHIT BY THEMSELVES.”</Text>
          <Text style={styles.emptySubquote}>WRITE IT DOWN. THEN GRIND.</Text>
          <Text style={styles.emptyDesc}>
            Dump your study topics, fitness ideas, or project plans here, then turn them directly into weekly Grind goals.
          </Text>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/grind/note/new' as any)}
          >
            <Text style={styles.primaryActionBtnText}>+ WRITE YOUR FIRST NOTE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.notesListContainer}>
          {/* ── PINNED SECTION ── */}
          {pinnedNotes.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>★ PINNED NOTES</Text>
                <Text style={styles.sectionHeaderCount}>{pinnedNotes.length}</Text>
              </View>
              {pinnedNotes.map(renderNoteCard)}
            </View>
          )}

          {/* ── ALL / REGULAR NOTES ── */}
          {regularNotes.length > 0 && (
            <View style={styles.sectionWrap}>
              {pinnedNotes.length > 0 && (
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>ALL NOTES</Text>
                  <Text style={styles.sectionHeaderCount}>{regularNotes.length}</Text>
                </View>
              )}
              {regularNotes.map(renderNoteCard)}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: 12,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  newNoteBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newNoteBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryBright,
    letterSpacing: 1,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    lineHeight: 36,
  },
  screenSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderAccent,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyQuote: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.primaryBright,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptySubquote: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryActionBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryActionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  notesListContainer: {
    gap: 16,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionHeaderCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
  },
  noteCardPinned: {
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    borderColor: colors.borderAccent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  pinBtn: {
    padding: 4,
  },
  pinIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  pinIconActive: {
    color: colors.primaryBright,
  },
  noteContentPreview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  noteDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  convertedBadge: {
    backgroundColor: colors.incomeCard,
    borderColor: colors.incomeBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  convertedBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.income,
    letterSpacing: 0.5,
  },
  convertBtn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryDark,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  convertBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primaryBright,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
});
