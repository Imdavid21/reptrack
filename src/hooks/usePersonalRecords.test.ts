import { describe, it, expect } from 'vitest';
import { getCanonicalName, EXERCISE_ALIASES } from './usePersonalRecords';
import { resolveCanonicalName } from '@/lib/exerciseMatching';
import { SPLIT_TEMPLATES } from '@/lib/splitTemplates';

describe('getCanonicalName', () => {
  it('strips the "(Set N)" suffix logged exercises are stored with', () => {
    expect(getCanonicalName('Barbell Bench Press (Set 3)')).toBe('Barbell Bench Press');
  });

  it('leaves an already-canonical name unchanged', () => {
    expect(getCanonicalName('Barbell Squat')).toBe('Barbell Squat');
  });

  // Regression coverage for the 2026-07 PPL6 rebuild, which renamed several
  // template exercises and silently orphaned their PR history because the
  // new names weren't added as aliases of the old canonical name.
  it('resolves tricep extension variants introduced by the PPL6 rebuild to the pre-existing canonical name', () => {
    expect(getCanonicalName('Overhead Cable Tricep Extension')).toBe('Overhead Tricep Extension');
    expect(getCanonicalName('Cable Rope Overhead Tricep Extension')).toBe('Overhead Tricep Extension');
  });

  it('resolves other same-exercise naming variants found across split templates', () => {
    expect(getCanonicalName('Bench Press')).toBe('Barbell Bench Press');
    expect(getCanonicalName('Incline Barbell Press')).toBe('Incline Barbell Bench Press');
    expect(getCanonicalName('DB Lateral Raise')).toBe('Lateral Raises');
    expect(getCanonicalName('Cable Rows')).toBe('Seated Cable Row');
    expect(getCanonicalName('Cable Crossover')).toBe('Cable Flyes');
  });

  // Genuinely different exercises/PR metrics must NOT be merged — e.g. a
  // bodyweight-reps PR and an added-weight PR aren't comparable numbers.
  it('keeps a weighted variant separate from its bodyweight base exercise', () => {
    expect(getCanonicalName('Pull-ups')).toBe('Pull-ups');
    expect(getCanonicalName('Weighted Pull-ups')).toBe('Weighted Pull-ups');
    expect(getCanonicalName('Dips')).toBe('Dips');
    expect(getCanonicalName('Weighted Dips')).toBe('Weighted Dips');
  });

  // Locks in what every exercise name currently shipped in a split template
  // resolves to. A name that resolves to itself is normal — most exercises
  // have no naming variant anywhere. What's NOT normal, and is exactly the
  // shape of today's bug, is a name resolving to itself while nothing in
  // EXERCISE_ALIASES treats it as a known hub — i.e. it looks like a rename
  // that was never wired up as an alias of its old canonical name. If a
  // future template edit does that again, this test fails with a diff
  // showing exactly which exercise's PR history just got silently orphaned,
  // instead of that only surfacing as a user bug report months later.
  it('resolves every exercise name in every split template to a known canonical name', () => {
    const canonicalTargets = new Set(Object.values(EXERCISE_ALIASES));

    // Exercises expected to have their own, unmerged PR line — either
    // brand-new movements or ones deliberately kept distinct from a
    // same-named-but-different-metric variant (see test above). None of
    // these have any other spelling elsewhere in the templates, so nothing
    // aliases to them.
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

// Regression coverage: usePersonalRecords used to bucket/look up PRs by the
// case-preserved getCanonicalName (which only rewrites *known* aliases and
// otherwise echoes the input verbatim). Two loggings of the same lift that
// differed only in casing or incidental whitespace — e.g. "Conventional
// Deadlift" from a split template vs "conventional deadlift " from a swap
// or AI-parsed workout — formed two separate object keys, silently splitting
// a lifter's max across buckets so the PR badge could show a lower number
// than a real, already-saved set. The fix buckets/looks up by
// resolveCanonicalName (lowercased) instead, while still displaying the
// nicely-cased canonical name.
describe('resolveCanonicalName (PR bucketing key)', () => {
  it('collapses case variants of the same exercise to the same key', () => {
    expect(resolveCanonicalName('Conventional Deadlift')).toBe(resolveCanonicalName('conventional deadlift'));
  });

  it('collapses alias and canonical spellings to the same key regardless of case', () => {
    expect(resolveCanonicalName('Deadlift')).toBe(resolveCanonicalName('CONVENTIONAL DEADLIFT'));
  });

  it('still keeps genuinely different exercises in different buckets', () => {
    expect(resolveCanonicalName('Conventional Deadlift')).not.toBe(resolveCanonicalName('Romanian Deadlift'));
  });
});
