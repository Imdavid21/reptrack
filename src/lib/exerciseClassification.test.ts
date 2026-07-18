import { describe, it, expect } from 'vitest';
import { getBodyPart, getMuscleGroup } from './exerciseClassification';

describe('getBodyPart', () => {
  // Regression: these are mandatory correctives ("do not skip") in ppl6,
  // ppl5, and full_body3, but had no exact or pattern match, so every set
  // silently contributed zero volume to any muscle-balance bucket.
  it('classifies Dead Hang as a forearm/grip exercise, not Other', () => {
    expect(getBodyPart('Dead Hang')).toBe('Forearms');
    expect(getBodyPart('Dead Hangs')).toBe('Forearms');
  });

  it('classifies Hanging Knee Raises as Core, not Other', () => {
    expect(getBodyPart('Hanging Knee Raises')).toBe('Core');
  });

  it('is case-insensitive and strips the "(Set N)" suffix', () => {
    expect(getBodyPart('dead hang (Set 2)')).toBe('Forearms');
  });

  // Regression: CATEGORY_FALLBACK keys are lowercase ('push'/'pull'/'legs'/
  // 'core'), but AddExerciseSheet's custom-exercise category picker is
  // Title Case ('Push'/'Pull'/'Legs'/'Core'), so a custom exercise's
  // category was silently never matching this fallback tier at all.
  it('falls back to the category hint case-insensitively for an unrecognized name', () => {
    expect(getBodyPart('Totally Made Up Exercise Name', 'Push')).toBe('Chest');
    expect(getBodyPart('Totally Made Up Exercise Name', 'push')).toBe('Chest');
    expect(getBodyPart('Totally Made Up Exercise Name', 'PULL')).toBe('Back');
  });

  it('returns Other for an unrecognized name with no usable category hint', () => {
    expect(getBodyPart('Totally Made Up Exercise Name')).toBe('Other');
    expect(getBodyPart('Totally Made Up Exercise Name', 'primary')).toBe('Other');
  });
});

describe('getMuscleGroup', () => {
  it('groups Dead Hang and Hanging Knee Raises correctly', () => {
    expect(getMuscleGroup('Dead Hang')).toBe('arms');
    expect(getMuscleGroup('Hanging Knee Raises')).toBe('core');
  });
});
