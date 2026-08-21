import { supabase } from '@/integrations/supabase/client';

export interface MealHistoryRow {
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  potassium: number | null;
}

const PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST commonly caps a response at 1,000 rows. Long Data Room
 * ranges can exceed that with multiple meals per day, so fetch the full range
 * explicitly instead of silently treating a truncated result as complete.
 */
export async function fetchMealRows(userId: string, startDate: string, endDate: string): Promise<MealHistoryRow[]> {
  const rows: MealHistoryRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('meals')
      .select('date,calories,protein,carbs,fat,fiber,sugar,sodium,potassium')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as MealHistoryRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}
