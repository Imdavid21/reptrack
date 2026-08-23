import { describe, expect, it } from 'vitest';
import { mealBundleSuggestions } from './meals';

describe('meal reconstruction', () => {
  it('rebuilds recurring meal combinations from same-day meal logs', () => {
    const result = mealBundleSuggestions([
      { food_name: 'Greek yogurt', meal_type: 'breakfast', calories: 100, protein: 11, carbs: 8, fat: 1, date: '2026-08-01' },
      { food_name: 'Banana', meal_type: 'breakfast', calories: 90, protein: 1, carbs: 23, fat: 0, date: '2026-08-01' },
      { food_name: 'Banana', meal_type: 'breakfast', calories: 92, protein: 1, carbs: 24, fat: 0, date: '2026-08-02' },
      { food_name: 'Greek yogurt', meal_type: 'breakfast', calories: 104, protein: 11, carbs: 8, fat: 1, date: '2026-08-02' },
    ], 'breakfast');

    expect(result[0]).toMatchObject({
      count: 2,
      items: ['Banana', 'Greek yogurt'],
      calories: 193,
      protein: 12,
    });
  });

  it('does not mix different meal types into one bundle', () => {
    const result = mealBundleSuggestions([
      { food_name: 'Eggs', meal_type: 'breakfast', calories: 150, protein: 12, date: '2026-08-01' },
      { food_name: 'Eggs', meal_type: 'dinner', calories: 150, protein: 12, date: '2026-08-01' },
    ]);
    expect(result).toHaveLength(2);
  });
});
