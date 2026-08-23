import { describe, expect, it } from 'vitest';
import { detectExternalWorkoutSource, parseExternalWorkoutCSV } from './externalWorkout';

describe('external workout import', () => {
  it('detects and groups Strong CSV rows', () => {
    const csv = [
      'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps',
      '2026-08-01 18:00:00,Push A,45m,Bench Press,1,60,8',
      '2026-08-01 18:00:00,Push A,45m,Bench Press,2,60,7',
      '2026-08-01 18:00:00,Push A,45m,Lateral Raise,1,7.5,15',
    ].join('\n');
    expect(detectExternalWorkoutSource(csv.split('\n')[0].split(','))).toBe('strong');
    const sessions = parseExternalWorkoutCSV(csv);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ source: 'strong', date: '2026-08-01', workoutName: 'Push A', durationMinutes: 45 });
    expect(sessions[0].exercises[0].sets).toHaveLength(2);
  });

  it('detects Hevy CSV and derives duration from timestamps', () => {
    const csv = [
      'title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps',
      'Pull A,2026-08-03T18:00:00,2026-08-03T18:52:00,Lat Pulldown,0,normal,50,10',
      'Pull A,2026-08-03T18:00:00,2026-08-03T18:52:00,Lat Pulldown,1,normal,55,8',
    ].join('\n');
    expect(detectExternalWorkoutSource(csv.split('\n')[0].split(','))).toBe('hevy');
    const sessions = parseExternalWorkoutCSV(csv);
    expect(sessions[0].durationMinutes).toBe(52);
    expect(sessions[0].exercises[0].sets[1]).toMatchObject({ weight: 55, reps: 8, setType: 'normal' });
  });

  it('ignores rows without a usable date or set', () => {
    const csv = 'Date,Workout Name,Exercise Name,Weight,Reps\n,Push A,Bench Press,60,8';
    expect(parseExternalWorkoutCSV(csv)).toEqual([]);
  });
});
