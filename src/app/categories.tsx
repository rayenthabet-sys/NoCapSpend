import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { safeBack } from '../lib/nav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { colors, fonts, radii } from '../lib/theme';
import { showAlert } from '../lib/dialog';
import BudgetCharacter from '../components/BudgetCharacter';

export default function Categories() {
  const auth: any = useAuth();
  const session = auth?.session;
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('type', 'expense')
      .order('name');
    if (!error && data) setCategories(data);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  async function addCategory() {
    if (!name.trim()) {
      showAlert('Missing name', 'Enter a category name.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name: name.trim(),
      type: 'expense',
    });
    setSaving(false);
    if (error) {
      showAlert('Error', error.message);
    } else {
      setName('');
      loadCategories();
    }
  }

  function confirmDelete(category: any) {
    showAlert('Delete Category', `Delete "${category.name}"? Expenses already using it will keep their history, just show no category.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('categories').delete().eq('id', category.id);
          loadCategories();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CATEGORIES</Text>

      <FlatList
        data={categories}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.categoryRow} onPress={() => confirmDelete(item)}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.deleteHint}>tap to delete</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BudgetCharacter assetId="robert_neutral" size="small" animated />
            <Text style={styles.emptyTitle}>NO CATEGORIES YET.</Text>
            <Text style={styles.emptyText}>Add your first spending category below.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <TextInput
        style={styles.input}
        placeholder="New category (e.g. Food, Travel, Studio)"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={addCategory}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'ADDING...' : '+ ADD CATEGORY'}</Text>
      </TouchableOpacity>
      <View style={{ height: 10 }} />
      <TouchableOpacity style={[styles.button, styles.ghostButton]} onPress={() => safeBack('/')}>
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>BACK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, paddingBottom: 40, backgroundColor: colors.background, maxWidth: 580, alignSelf: 'center', width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.textPrimary, textAlign: 'center', marginBottom: 20, letterSpacing: 2.5 },
  categoryRow: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
  deleteHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  emptyState: { alignItems: 'center', marginTop: 30 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginTop: 12, letterSpacing: 2 },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 14,
    marginTop: 8,
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
  primaryButton: { backgroundColor: colors.cardElevated, borderColor: colors.primary },
  ghostButton: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, letterSpacing: 1.5 },
});