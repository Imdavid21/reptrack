import { describe, expect, it } from 'vitest';
import { PPL_PROGRAM, type SessionKey } from './adaptivePpl';

const liftingSessions: SessionKey[] = ['push_a', 'pull_a', 'legs_a', 'push_b', 'pull_b', 'legs_b'];
const workingPhases = new Set(['primary', 'compound', 'specialization', 'accessory', 'core']);

const hardSets = (key: SessionKey) => PPL_PROGRAM[key].exercises
  .filter(exercise => workingPhases.has(exercise.phase))
  .reduce((sum, exercise) => sum + exercise.sets, 0);

describe('45-day bodybuilding PPL', () => {
  it('keeps every lifting session inside the intended recovery ceiling', () => {
    expect(Object.fromEntries(liftingSessions.map(key => [key, hardSets(key)]))).toEqual({
      push_a: 19,
      pull_a: 16,
      legs_a: 18,
      push_b: 18,
      pull_b: 20,
      legs_b: 18,
    });
    for (const key of liftingSessions) expect(hardSets(key)).toBeLessThanOrEqual(20);
  });

  it('keeps the complete six-session rotation near 109 hard sets instead of the old 200+ set design', () => {
    expect(liftingSessions.reduce((sum, key) => sum + hardSets(key), 0)).toBe(109);
  });

  it('starts both push sessions with an incline press', () => {
    const firstWork = (key: SessionKey) => PPL_PROGRAM[key].exercises.find(exercise => workingPhases.has(exercise.phase))?.name;
    expect(firstWork('push_a')).toBe('Incline Barbell Bench Press');
    expect(firstWork('push_b')).toBe('Incline Dumbbell Press');
  });

  it('keeps direct forearm specialization without bloating every pull session', () => {
    const pullA = PPL_PROGRAM.pull_a.exercises.map(exercise => exercise.name);
    const pullB = PPL_PROGRAM.pull_b.exercises.map(exercise => exercise.name);
    expect(pullA).toContain('Hammer Curl');
    expect(pullB).toEqual(expect.arrayContaining([
      'Cable Reverse Curls',
      'Cable Wrist Curl',
      'Cable Wrist Extension',
    ]));
  });

  it('uses the available stable machines instead of assuming a hack squat or back-extension station', () => {
    const all = liftingSessions.flatMap(key => PPL_PROGRAM[key].exercises.map(exercise => exercise.name));
    expect(all).toEqual(expect.arrayContaining([
      'Machine Chest Press',
      'Pec Deck',
      'Smith Machine Overhead Press',
      'T-Bar Row',
      'Lever Seated Row Machine',
      'Leg Press',
      'Seated Leg Curl',
      'Seated Calf Raise',
    ]));
    expect(all).not.toContain('Hack Squat');
    expect(all).not.toContain('45-Degree Back Extension');
  });
});
