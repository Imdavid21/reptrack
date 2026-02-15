

## Trainer Validation and Corrections

The overall approach is solid and follows proven DUP (Daily Undulating Periodization) principles. Two corrections:

**Correction 1 - Heavy day effort target:** You wrote "stop 1-2 reps before failure." For heavy compound lifts (4-6 rep range at 80-85% 1RM), 1 RIR is too aggressive for sustainable weekly programming -- it accumulates excessive CNS fatigue. Recommended: **2-3 RIR (RPE 7-8) for heavy compounds**, 1-2 RIR for heavy accessories. This preserves strength performance across the week.

**Correction 2 - Volume day isolation RIR:** Allowing 0 RIR (true failure) on the *last set* of isolations is fine, but only for single-joint movements (lateral raises, curls, extensions). Multi-joint accessories like dips or rows should stay at 1-2 RIR even on volume day.

Everything else -- the PPLPPL structure, 2x frequency, Heavy/Volume pairing, rest time differentiation, and the personalization-from-data requirement -- is best practice.

---

## Implementation Plan

### 1. Extend the Exercise and WorkoutDay data model

Add new optional fields to the `Exercise` interface in `src/lib/workoutPresets.ts`:
- `restSeconds?: number` -- rest time between sets
- `rir?: string` -- reps in reserve target (e.g. "2-3" or "1-2")

Add a `bias` field to `WorkoutDay`:
- `bias?: 'heavy' | 'volume'` -- determines programming rules for the day

### 2. Update the default PPL6 routine structure

In `src/lib/workoutPresets.ts`, update the `defaultRoutine` (phase1) so:
- Days 1-3 (Push A, Pull A, Legs A) get `bias: 'heavy'`
- Days 4-6 (Push B, Pull B, Legs B) get `bias: 'volume'`
- Keep the exact same exercise names and order
- Update each exercise's `targetReps` to reflect the correct ranges for its bias:
  - Heavy compounds: `"4x4-6"` or `"4x5-6"`
  - Heavy accessories: `"3x8-10"`
  - Volume compounds: `"4x8-10"` or `"4x8-12"`
  - Volume accessories: `"3x12-15"`
  - Volume isolations: `"3x15-20"`
- Add `restSeconds` per exercise:
  - Heavy compounds: 180 (3 min)
  - Heavy accessories: 120 (2 min)
  - Volume compounds: 120 (2 min)
  - Volume accessories: 90 (1.5 min)
  - Volume isolations: 60 (1 min)
- Add `rir` per exercise:
  - Heavy compounds: `"2-3"`
  - Heavy accessories: `"1-2"`
  - Volume compounds: `"1-2"`
  - Volume accessories: `"1-2"`
  - Volume isolations (last set): `"0-1"` (noted in the `notes` field)

Phase 2 and Phase 3 routines will be updated to match the same Heavy/Volume pattern with their existing weight progressions.

### 3. Build a personalization engine

Create a new utility function `derivePersonalizedProgramming()` in `src/lib/workoutPresets.ts` (or a new file `src/lib/programmingEngine.ts`) that:

1. Takes: exercise name, day bias (heavy/volume), exercise category, user's last-used data (from `useLastUsedWeights`), user preferences (fitness_goal)
2. Returns: computed `sets`, `reps`, `restSeconds`, `rir`

Logic:
- **If last-used data exists:** Derive sets from the user's most recent set count for that exercise. Derive rep target from the bias rules (heavy = lower end, volume = higher end) adjusted by actual performance.
- **If no data exists:** Fall back to best-practice defaults based on the exercise category and day bias, as described in step 2.

### 4. Integrate into the workout loading flow

Update `buildExercisesFromTemplate()` in `src/pages/LogWorkout.tsx` to:
- Read the day's `bias` field
- Call `derivePersonalizedProgramming()` for each exercise
- Use the returned values instead of raw template values when constructing `ExerciseSet[]`
- Pass `restSeconds` and `rir` through to each exercise object

### 5. Display rest time and effort targets in the logging UI

Update `src/components/workout/SetBySetCard.tsx` to show:
- Rest time suggestion (e.g. "Rest: 3:00") after completing a set -- can integrate with the existing `RestTimer` component
- RIR target displayed subtly near the rep target (e.g. "8-10 reps @ 2 RIR")

### 6. Update the AI workout generator

Update the system prompt in `supabase/functions/generate-workout/index.ts` to:
- Include Heavy/Volume bias in the output JSON for each day
- Add `restSeconds` and `rir` fields to generated exercises
- Instruct the AI to follow the same Heavy day / Volume day rules

### Summary of files changed

| File | Change |
|------|--------|
| `src/lib/workoutPresets.ts` | Add `restSeconds`, `rir` to Exercise interface; add `bias` to WorkoutDay; update all phase routines |
| `src/lib/splitTemplates.ts` | No structural changes needed (inherits from defaultRoutine) |
| `src/lib/programmingEngine.ts` | New file: personalization logic |
| `src/pages/LogWorkout.tsx` | Update `buildExercisesFromTemplate` to use programming engine |
| `src/components/workout/SetBySetCard.tsx` | Display rest time and RIR hints |
| `supabase/functions/generate-workout/index.ts` | Update prompt for Heavy/Volume output |

