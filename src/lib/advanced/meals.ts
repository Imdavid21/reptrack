import type { MealHistoryRow } from './engine';

export interface MealBundleSuggestion {
  label: string;
  mealType: string;
  count: number;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function mealBundleSuggestions(rows: MealHistoryRow[], mealType?: string, limit = 5): MealBundleSuggestion[] {
  const byMeal = new Map<string, MealHistoryRow[]>();
  for (const row of rows) {
    if (!row.food_name || (mealType && row.meal_type !== mealType)) continue;
    const type = row.meal_type || 'meal';
    const key = `${row.date}|${type}`;
    const list = byMeal.get(key) ?? [];
    list.push(row);
    byMeal.set(key, list);
  }

  const groups = new Map<string, { count: number; type: string; labels: string[]; calories: number; protein: number; carbs: number; fat: number }>();
  for (const rowsForMeal of byMeal.values()) {
    const normalized = rowsForMeal.map(row => row.food_name!.trim()).sort((a, b) => a.localeCompare(b));
    if (!normalized.length) continue;
    const type = rowsForMeal[0].meal_type || 'meal';
    const key = `${type}|${normalized.map(item => item.toLowerCase()).join(' + ')}`;
    const current = groups.get(key) ?? { count: 0, type, labels: normalized, calories: 0, protein: 0, carbs: 0, fat: 0 };
    current.count += 1;
    current.calories += rowsForMeal.reduce((sum, row) => sum + Number(row.calories || 0), 0);
    current.protein += rowsForMeal.reduce((sum, row) => sum + Number(row.protein || 0), 0);
    current.carbs += rowsForMeal.reduce((sum, row) => sum + Number(row.carbs || 0), 0);
    current.fat += rowsForMeal.reduce((sum, row) => sum + Number(row.fat || 0), 0);
    groups.set(key, current);
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.labels.length - a.labels.length)
    .slice(0, limit)
    .map(group => ({
      label: group.labels.length === 1 ? group.labels[0] : group.labels.join(' + '),
      mealType: group.type,
      count: group.count,
      items: group.labels,
      calories: Math.round(group.calories / group.count),
      protein: Math.round(group.protein / group.count),
      carbs: Math.round(group.carbs / group.count),
      fat: Math.round(group.fat / group.count),
    }));
}
