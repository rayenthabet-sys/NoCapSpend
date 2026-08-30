import { supabase } from './supabase';

function firstOfMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export async function ensureRecurringEntriesForThisMonth(userId) {
  const monthStart = firstOfMonth();

  // --- Recurring expenses ---
  const { data: expenseTemplates } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .eq('recurrence_interval', 'monthly');

  const seenExpenseKeys = new Set();

  for (const template of expenseTemplates || []) {
    // Dedupe: if we've already handled an identical template this loop, skip it.
    const key = `${template.note || ''}|${template.amount}|${template.category_id || ''}`;
    if (seenExpenseKeys.has(key)) continue;
    seenExpenseKeys.add(key);

    let query = supabase
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
      .eq('amount', template.amount)
      .eq('is_recurring', true)
      .gte('date', monthStart)
      .limit(1); // never throws even if duplicates still exist

    query = template.note ? query.eq('note', template.note) : query.is('note', null);

    const { data: existingRows } = await query;

    if (!existingRows || existingRows.length === 0) {
      await supabase.from('expenses').insert({
        user_id: userId,
        amount: template.amount,
        note: template.note,
        category_id: template.category_id,
        date: monthStart,
        is_recurring: true,
        recurrence_interval: 'monthly',
      });
    }
  }

  // --- Recurring income ---
  const { data: incomeTemplates } = await supabase
    .from('income_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .eq('recurrence_interval', 'monthly');

  const seenIncomeKeys = new Set();

  for (const template of incomeTemplates || []) {
    const key = `${template.source || ''}|${template.amount}`;
    if (seenIncomeKeys.has(key)) continue;
    seenIncomeKeys.add(key);

    let query = supabase
      .from('income_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('amount', template.amount)
      .eq('is_recurring', true)
      .gte('date', monthStart)
      .limit(1);

    query = template.source ? query.eq('source', template.source) : query.is('source', null);

    const { data: existingRows } = await query;

    if (!existingRows || existingRows.length === 0) {
      await supabase.from('income_entries').insert({
        user_id: userId,
        amount: template.amount,
        source: template.source,
        date: monthStart,
        is_recurring: true,
        recurrence_interval: 'monthly',
      });
    }
  }
}
