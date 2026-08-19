import { describe, it, expect } from 'vitest';
import { getExerciseVariants, hasVariants, getEquipmentType } from './exerciseVariants';

describe('exerciseVariants lookups', () => {
  it('finds variants for an exact key', () => {
    expect(hasVariants('Barbell Bench Press')).toBe(true);
    expect(getEquipmentType('Barbell Bench Press')).toBe('barbell');
  });

  // Regression: these used to be keyed under the old plural spellings
  // ('Hammer Curls', 'Reverse Flyes'), which stopped being the canonical
  // form once the alias table was reconciled to match the live templates'
  // singular spelling - so a lookup by the now-canonical name would miss
  // the real variant list entirely.
  it('resolves variants through a canonicalized name', () => {
    expect(getEquipmentType('Hammer Curl')).toBe('dumbbell');
    expect(getEquipmentType('Reverse Fly')).toBe('dumbbell');
    expect(getExerciseVariants('Bench Press').length).toBeGreaterThan(1);
  });

  it('falls back to a single-item variant list for a genuinely unknown name', () => {
    const variants = getExerciseVariants('Some Brand New Exercise');
    expect(variants).toEqual([{ name: 'Some Brand New Exercise', defaultWeight: '', equipmentType: 'dumbbell' }]);
    expect(hasVariants('Some Brand New Exercise')).toBe(false);
  });
});
