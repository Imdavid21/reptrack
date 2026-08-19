import { describe, it, expect } from 'vitest';
import {
  EXERCISE_ALIASES,
  getCanonicalName,
  resolveCanonicalName,
  normalizeExerciseName,
  findBestMatch,
} from './exerciseMatching';
import { SPLIT_TEMPLATES } from './splitTemplates';

describe('getCanonicalName', () => {
  it('resolves a known alias to its properly-cased canonical form', () => {
    expect(getCanonicalName('Barbell Bench')).toBe('Barbell Bench Press');
    expect(getCanonicalName('bb bench press')).toBe('Barbell Bench Press');
  });

  it('is case-insensitive', () => {
    expect(getCanonicalName('BARBELL BENCH')).toBe('Barbell Bench Press');
    expect(getCanonicalName('barbell bench')).toBe('Barbell Bench Press');
  });

  it('strips the "(Set N)" suffix logged exercises are stored with', () => {
    expect(getCanonicalName('Barbell Bench (Set 3)')).toBe('Barbell Bench Press');
  });

  it('leaves an unknown or already-canonical name unchanged', () => {
    expect(getCanonicalName('Barbell Squat')).toBe('Barbell Squat');
    expect(getCanonicalName('Some Brand New Exercise')).toBe('Some Brand New Exercise');
  });

  // Regression: this file used to be two separately-maintained tables (this
  // one, lowercase-only; usePersonalRecords.ts's, Title-Case) that disagreed
  // on which direction a couple of singular/plural pairs should resolve -
  // both aliased the live template's actual spelling to a plural/singular
  // form that never appears anywhere in the app.
  it('aliases the plural form to the live template\'s singular spelling, not the reverse', () => {
    expect(getCanonicalName('Hammer Curls')).toBe('Hammer Curl');
    expect(getCanonicalName('Hammer Curl')).toBe('Hammer Curl');
    expect(getCanonicalName('Reverse Flyes')).toBe('Reverse Fly');
    expect(getCanonicalName('Reverse Fly')).toBe('Reverse Fly');
  });
});

describe('resolveCanonicalName / normalizeExerciseName / findBestMatch', () => {
  it('resolveCanonicalName returns the lowercase form of getCanonicalName', () => {
    expect(resolveCanonicalName('Barbell Bench')).toBe('barbell bench press');
  });

  it('findBestMatch keeps seated and standing calf raises separate - different loading, not aliases', () => {
    const map = { 'Seated Calf Raise': 10, 'Standing Calf Raise': 50 };
    expect(findBestMatch('Seated Calf Raise', map)).toBe(10);
    expect(findBestMatch('Standing Calf Raise', map)).toBe(50);
  });

  it('normalizeExerciseName unifies common abbreviations', () => {
    expect(normalizeExerciseName('Dumbbell Bench Press')).toBe(normalizeExerciseName('DB Bench Press'));
  });
});

// The whole point of merging the two alias tables: a lift must resolve to
// the same canonical identity whether it goes through the PR path
// (getCanonicalName) or the last-used-weight/matching path
// (resolveCanonicalName / findBestMatch) - that's exactly the gap that let
// the same real-world lift silently split into two different PR lines.
describe('cross-consumer consistency', () => {
  const pairs: [string, string][] = [
    ['Hammer Curl', 'Hammer Curls'],
    ['Reverse Fly', 'Reverse Flyes'],
    ['Barbell Bench', 'Bench Press'],
    ['Standing Calf Raise', 'Calf Raises'],
    ['Leg Extension', 'Leg Extensions'],
  ];

  it.each(pairs)('"%s" and "%s" resolve to the same canonical identity everywhere', (a, b) => {
    expect(getCanonicalName(a)).toBe(getCanonicalName(b));
    expect(resolveCanonicalName(a)).toBe(resolveCanonicalName(b));
    expect(normalizeExerciseName(a)).toBe(normalizeExerciseName(b));
  });
});

// Locks in what every exercise name currently shipped in a split template
// resolves to, the same guard usePersonalRecords.test.ts already runs
// against this same table - duplicated here so this file's own test suite
// is self-sufficient and catches a regression regardless of which consumer
// someone happens to be testing.
describe('EXERCISE_ALIASES coverage of live split templates', () => {
  it('resolves every exercise name in every split template to a known canonical name', () => {
    const canonicalTargets = new Set(Object.values(EXERCISE_ALIASES));
    const expectedStandalone = new Set([
      'Close Grip Bench Press',
      'Dips',
      'Dumbbell Lunges',
      'Farmer Walks',
      'Front Squats',
      'Hammer Curl',
      'Hanging Knee Raises',
      'Leg Press',
      'Tricep Dips',
      'Weighted Dips',
      'Weighted Pull-ups',
    ]);

    const suspicious: string[] = [];
    for (const template of Object.values(SPLIT_TEMPLATES)) {
      for (const day of Object.values(template.days)) {
        for (const exercise of day.exercises) {
          const name = exercise.name;
          const canonical = getCanonicalName(name);
          const isKnownHub = canonical !== name || canonicalTargets.has(canonical) || expectedStandalone.has(name);
          if (!isKnownHub) suspicious.push(name);
        }
      }
    }

    expect(suspicious).toEqual([]);
  });
});
