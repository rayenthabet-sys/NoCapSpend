// ─────────────────────────────────────────────────────────────────
// NoCapSpend — The Grind Notes Local Store
// User-namespaced AsyncStorage cache for notes and ideas.
// Isolated from financial tables and ledger logic.
// ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@bb_cache_';
const BUCKET_GRIND_NOTES = 'GRIND_NOTES';

function getStoreKey(userId) {
  if (!userId) throw new Error('[grindNotes] userId is required for notes storage');
  return `${PREFIX}${userId}:${BUCKET_GRIND_NOTES}`;
}

/**
 * Generate deterministic local ID for notes.
 * Format: note_local_<timestamp>_<random>
 */
export function generateNoteLocalId() {
  return `note_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Retrieve all raw notes for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getAllNotesRaw(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(getStoreKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[grindNotes] getAllNotesRaw error', err);
    return [];
  }
}

/**
 * Save raw notes list for a user.
 * @param {string} userId
 * @param {Array} list
 */
async function setAllNotesRaw(userId, list) {
  if (!userId) return;
  await AsyncStorage.setItem(getStoreKey(userId), JSON.stringify(list));
}

/**
 * Get all notes for a user, sorted pinned first, then updatedAt descending.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getNotes(userId) {
  if (!userId) return [];
  const notes = await getAllNotesRaw(userId);

  return notes.sort((a, b) => {
    // Pinned notes come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then newest updated first
    const dateA = a.updatedAt || a.createdAt || '';
    const dateB = b.updatedAt || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });
}

/**
 * Get a specific note by ID.
 * @param {string} userId
 * @param {string} noteId
 * @returns {Promise<Object|null>}
 */
export async function getNoteById(userId, noteId) {
  if (!userId || !noteId) return null;
  const notes = await getAllNotesRaw(userId);
  return notes.find((n) => n.id === noteId) || null;
}

/**
 * Create a new note.
 * @param {string} userId
 * @param {Object} noteData - { title, content, isPinned }
 * @returns {Promise<Object>} Created note
 */
export async function createNote(userId, noteData = {}) {
  if (!userId) throw new Error('[grindNotes] userId is required to create note');

  const now = new Date().toISOString();
  const newNote = {
    id: generateNoteLocalId(),
    user_id: userId,
    title: (noteData.title || '').trim(),
    content: (noteData.content || '').trim(),
    isPinned: Boolean(noteData.isPinned),
    convertedToGoalId: null,
    createdAt: now,
    updatedAt: now,
  };

  const notes = await getAllNotesRaw(userId);
  notes.unshift(newNote);
  await setAllNotesRaw(userId, notes);

  return newNote;
}

/**
 * Update an existing note.
 * @param {string} userId
 * @param {string} noteId
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
export async function updateNote(userId, noteId, updates = {}) {
  if (!userId || !noteId) return null;

  const notes = await getAllNotesRaw(userId);
  const index = notes.findIndex((n) => n.id === noteId);
  if (index < 0) return null;

  const existing = notes[index];
  const now = new Date().toISOString();

  const updatedNote = {
    ...existing,
    ...updates,
    id: existing.id,
    user_id: userId,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    content: updates.content !== undefined ? updates.content.trim() : existing.content,
    isPinned: updates.isPinned !== undefined ? Boolean(updates.isPinned) : existing.isPinned,
    convertedToGoalId:
      updates.convertedToGoalId !== undefined ? updates.convertedToGoalId : existing.convertedToGoalId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  notes[index] = updatedNote;
  await setAllNotesRaw(userId, notes);

  return updatedNote;
}

/**
 * Delete a note.
 * @param {string} userId
 * @param {string} noteId
 * @returns {Promise<boolean>}
 */
export async function deleteNote(userId, noteId) {
  if (!userId || !noteId) return false;

  const notes = await getAllNotesRaw(userId);
  const filtered = notes.filter((n) => n.id !== noteId);
  await setAllNotesRaw(userId, filtered);

  return true;
}

/**
 * Toggle pinned status for a note.
 * @param {string} userId
 * @param {string} noteId
 * @returns {Promise<Object|null>}
 */
export async function toggleNotePinned(userId, noteId) {
  if (!userId || !noteId) return null;

  const note = await getNoteById(userId, noteId);
  if (!note) return null;

  return updateNote(userId, noteId, { isPinned: !note.isPinned });
}

/**
 * Mark a note as converted to a Grind goal.
 * @param {string} userId
 * @param {string} noteId
 * @param {string} goalId
 * @returns {Promise<Object|null>}
 */
export async function markNoteConverted(userId, noteId, goalId) {
  if (!userId || !noteId || !goalId) return null;
  return updateNote(userId, noteId, { convertedToGoalId: goalId });
}

/**
 * Clear all notes for a user (called on logout/reset).
 * @param {string} userId
 */
export async function clearNotes(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getStoreKey(userId));
  } catch (err) {
    console.warn('[grindNotes] clearNotes error', err);
  }
}
