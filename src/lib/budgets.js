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

function getMonthRange(monthStart) {
    const [year, month] = monthStart.split('-').map(Number);
    const end = new Date(year, month, 0); // last day of that month
    return { start: monthStart, end: end.toISOString().slice(0, 10) };
}

export async function getCategoryActualSpend(userId, categoryId, monthStart) {
    const { start, end } = getMonthRange(monthStart);
    const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .gte('date', start)
        .lte('date', end);

    if (error) throw error;
    return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
}

// Returns the actual spendable amount for this month, factoring in rollover from last month
export async function getEffectiveBudget(userId, categoryId, plannedAmount) {
    const previousMonth = firstOfPreviousMonth();

    const { data: prevBudget } = await supabase
        .from('budgets')
        .select('planned_amount, rollover_mode')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month', previousMonth)
        .maybeSingle();

    if (!prevBudget || prevBudget.rollover_mode !== 'rollover') {
        return Number(plannedAmount);
    }

    const prevSpend = await getCategoryActualSpend(userId, categoryId, previousMonth);
    const leftover = Number(prevBudget.planned_amount) - prevSpend;

    return Number(plannedAmount) + leftover;
}

export async function upsertBudget(userId, categoryId, plannedAmount, rolloverMode) {
    const month = firstOfMonth();
    const { error } = await supabase.from('budgets').upsert(
        {
            user_id: userId,
            category_id: categoryId,
            month,
            planned_amount: plannedAmount,
            rollover_mode: rolloverMode,
        },
        { onConflict: 'user_id,category_id,month' }
    );
    if (error) throw error;
}

export async function getBudgetsForCurrentMonth(userId) {
    const month = firstOfMonth();
    const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(name)')
        .eq('user_id', userId)
        .eq('month', month);

    if (error) throw error;
    return data || [];
}

export { firstOfMonth };