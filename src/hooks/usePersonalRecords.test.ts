import { describe, it, expect } from 'vitest';
import { getCanonicalName } from './usePersonalRecords';
import { resolveCanonicalName } from '@/lib/exerciseMatching';
import { getPrTransferability } from '@/lib/exerciseRelationships';

describe('exercise identity for PR bucketing', () => {
  it('strips the "(Set N)" suffix logged exercises are stored with', () => {
    expect(getCanonicalName('Barbell Bench Press (Set 3)')).toBe('Barbell Bench Press');
  });

  it('keeps true naming aliases on one exact PR', () => {
    expect(getCanonicalName('Bench Press')).toBe('Barbell Bench Press');
    expect(getCanonicalName('Olympic Flat Bench Press')).toBe('Barbell Bench Press');
    expect(getCanonicalName('Incline Barbell Press')).toBe('Incline Barbell Bench Press');
    expect(getCanonicalName('Olympic Incline Bench Press')).toBe('Incline Barbell Bench Press');
    expect(getCanonicalName('45° Plate-Loaded Leg Press')).toBe('Leg Press');
    expect(getCanonicalName('Selectorized Chest Press Machine')).toBe('Machine Chest Press');
    expect(getCanonicalName('Seated Leg Curl Machine')).toBe('Seated Leg Curl');
    expect(getCanonicalName('Seated Calf Raise Machine')).toBe('Seated Calf Raise');
  });

  it('does not merge different implements or machine mechanics into one PR', () => {
    expect(resolveCanonicalName('Pec Deck')).not.toBe(resolveCanonicalName('Cable Flyes'));
    expect(resolveCanonicalName('Cable Crossover')).not.toBe(resolveCanonicalName('Cable Flyes'));
    expect(resolveCanonicalName('Machine Lateral Raise')).not.toBe(resolveCanonicalName('Lateral Raises'));
    expect(resolveCanonicalName('Reverse Pec Deck')).not.toBe(resolveCanonicalName('Reverse Fly'));
    expect(resolveCanonicalName('Seated Leg Curl')).not.toBe(resolveCanonicalName('Lying Leg Curl'));
    expect(resolveCanonicalName('Dumbbell Romanian Deadlift')).not.toBe(resolveCanonicalName('Romanian Deadlift'));
    expect(resolveCanonicalName('Single Leg Romanian Deadlift')).not.toBe(resolveCanonicalName('Romanian Deadlift'));
    expect(resolveCanonicalName('EZ Bar Curl')).not.toBe(resolveCanonicalName('Barbell Curl'));
    expect(resolveCanonicalName('Overhead Cable Tricep Extension')).not.toBe(resolveCanonicalName('Dumbbell Overhead Extension'));
  });

  it('keeps weighted and bodyweight PR metrics separate', () => {
    expect(resolveCanonicalName('Pull-ups')).not.toBe(resolveCanonicalName('Weighted Pull-ups'));
    expect(resolveCanonicalName('Dips')).not.toBe(resolveCanonicalName('Weighted Dips'));
  });

  it('still collapses casing and whitespace for the same lift', () => {
    expect(resolveCanonicalName('Conventional Deadlift')).toBe(resolveCanonicalName('conventional deadlift'));
    expect(resolveCanonicalName('Deadlift')).toBe(resolveCanonicalName('CONVENTIONAL DEADLIFT'));
  });
});

describe('PR transferability', () => {
  it('shares PRs for true identity aliases', () => {
    expect(getPrTransferability('Olympic Flat Bench Press', 'Barbell Bench Press')).toBe('shared');
    expect(getPrTransferability('45° Plate-Loaded Leg Press', 'Leg Press')).toBe('shared');
  });

  it('allows comparable reference PRs for the same pulldown loading system', () => {
    expect(getPrTransferability('Lat Pulldown', 'Neutral Grip Pulldown')).toBe('comparable');
    expect(getPrTransferability('Lat Pulldown', 'Close Grip Lat Pulldown')).toBe('comparable');
    expect(getPrTransferability('Single-Arm Lat Pulldown', 'Single-Arm Kneeling Lat Pulldown')).toBe('comparable');
  });

  it('keeps machine/free-weight variants as context rather than a shared PR', () => {
    expect(getPrTransferability('Barbell Bench Press', 'Machine Chest Press')).toBe('context');
    expect(getPrTransferability('Barbell Row', 'T-Bar Row')).toBe('context');
    expect(getPrTransferability('Pec Deck', 'Cable Flyes')).toBe('context');
  });

  it('does not transfer PR numbers across deliberately incompatible alternatives', () => {
    expect(getPrTransferability('Barbell Squat', 'Leg Press')).toBe('none');
    expect(getPrTransferability('Pull-ups', 'Assisted Pull-ups')).toBe('none');
    expect(getPrTransferability('Pull-ups', 'Weighted Pull-ups')).toBe('none');
  });
});
