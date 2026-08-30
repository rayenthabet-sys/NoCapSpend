import { supabase } from './supabase';

function firstOfMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function firstOfPreviousMonth() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export async function recalculateCurrentMonthLedger(userId, incomeTotal, expenseTotal) {
  const currentMonth = firstOfMonth();
  const previousMonth = firstOfPreviousMonth();

  // 1. Get last month's accumulated total (0 if none exists yet)
  const { data: prevRow } = await supabase
    .from('savings_ledger')
    .select('accumulated_total')
    .eq('user_id', userId)
    .eq('month', previousMonth)
    .maybeSingle();

  const previousAccumulated = prevRow ? Number(prevRow.accumulated_total) : 0;

  // 2. Calculate this month's numbers
  const savedAmount = incomeTotal - expenseTotal;
  const accumulatedTotal = previousAccumulated + savedAmount;

  // 3. Upsert this month's ledger row
  const { error } = await supabase
    .from('savings_ledger')
    .upsert(
      {
        user_id: userId,
        month: currentMonth,
        income_total: incomeTotal,
        expense_total: expenseTotal,
        saved_amount: savedAmount,
        accumulated_total: accumulatedTotal,
      },
      { onConflict: 'user_id,month' }
    );

  if (error) throw error;
  return accumulatedTotal;
}

export async function getTotalReservedForGoals(userId) {
  const { data, error } = await supabase
    .from('goals')
    .select('current_amount')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).reduce((sum, g) => sum + Number(g.current_amount), 0);
}

export async function getCurrentMonthAccumulated(userId) {
  const currentMonth = firstOfMonth();
  const { data } = await supabase
    .from('savings_ledger')
    .select('accumulated_total')
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .maybeSingle();
  return data ? Number(data.accumulated_total) : 0;
}

export async function getAvailableSavings(userId) {
  const currentMonth = firstOfMonth();
  let { data: ledgerRow } = await supabase
    .from('savings_ledger')
    .select('accumulated_total')
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .maybeSingle();

  let accumulated = ledgerRow ? Number(ledgerRow.accumulated_total) : 0;

  // If no ledger row exists yet for this month, calculate on the fly
  if (!ledgerRow) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthStr = String(month + 1).padStart(2, '0');
    const start = `${year}-${monthStr}-01`;
    const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from('income_entries').select('amount').eq('user_id', userId).gte('date', start).lte('date', end),
      supabase.from('expenses').select('amount').eq('user_id', userId).gte('date', start).lte('date', end),
    ]);

    const incomeTotal = (incomeRes.data || []).reduce((sum, row) => sum + Number(row.amount), 0);
    const expenseTotal = (expenseRes.data || []).reduce((sum, row) => sum + Number(row.amount), 0);

    accumulated = await recalculateCurrentMonthLedger(userId, incomeTotal, expenseTotal);
  }

  const reserved = await getTotalReservedForGoals(userId);
  return accumulated - reserved;
}

export async function getSavingsHistory(userId, monthsBack = 6) {
  const { data, error } = await supabase
    .from('savings_ledger')
    .select('month, accumulated_total')
    .eq('user_id', userId)
    .order('month', { ascending: true })
    .limit(monthsBack);

  if (error) throw error;
  return data || [];
}