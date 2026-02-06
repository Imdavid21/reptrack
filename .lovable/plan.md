
# Workouts & History Rework: Complete Plan with Existing User Handling

## Overview

This plan transforms the workout system from a rigid pre-defined 6-day PPL routine into a flexible, user-centric experience. A critical addition is **smart handling of existing users** who already have workout history - they should never be forced through new onboarding flows.

---

## User Scenarios

### Scenario 1: Brand New User (No Workout History)
1. Opens "Log Workout" tab
2. **Routine Setup Flow**: "How many days can you train per week?" (3/4/5/6)
3. **AI Option**: "Want AI to suggest exercises based on your goals?"
4. Proceeds to workout logging with their chosen split

### Scenario 2: Existing User (Has Workout History) - YOUR CASE
1. Opens "Log Workout" tab
2. **No new onboarding** - system analyzes their past workouts
3. **Smart Detection**: Infers their split from workout patterns (e.g., 6 workouts/week = PPL x2)
4. Continues with their established routine, with option to customize in Settings

### Scenario 3: Returning User (Cleared Preferences but Has History)
1. System detects workouts exist even if preferences are missing
2. Auto-creates preferences based on inferred patterns
3. Skips all onboarding, goes straight to dashboard

---

## Phase 1: Smart Existing User Detection

### Database Analysis Logic
Create a new hook `useRoutineInference.ts` that:
1. Queries last 30 days of workout history
2. Counts unique workout days per week
3. Analyzes exercise patterns (Push/Pull/Legs splits)
4. Returns inferred configuration:

```text
Example Analysis:
- User has 24 workouts in last 30 days
- Workouts are: Push A, Pull A, Legs A, Push B, Pull B, Legs B
- Inference: 6-day PPL split, already configured
- Result: No new setup needed, use existing pattern
```

### Enhanced `useUserPreferences.ts`
Extend the existing returning-user logic to also infer and store training split:

```text
Current Logic (lines 38-55):
- Check if workouts exist
- If yes, set onboarding_completed = true

Enhanced Logic:
- Check if workouts exist
- If yes, also analyze workout patterns
- Infer training_split from history (ppl6, upper_lower4, etc.)
- Store inferred split in preferences
- Set routine_setup_completed = true (new flag)
```

### New Database Columns
Add to `user_preferences`:
- `training_split` (text): 'ppl6', 'upper_lower4', 'full_body3', 'ppl5', 'custom'
- `rest_days` (jsonb): Array of day indices [0, 6] for Sunday/Saturday
- `routine_setup_completed` (boolean): Whether user has configured their routine

---

## Phase 2: Conditional Routine Setup Flow

### New Component: `RoutineSetup.tsx`
Only shown when:
- User has no workout history AND no routine configured
- User explicitly clicks "Change Split" in Settings

Split options:
- 3-day: Full Body (Mon/Wed/Fri)
- 4-day: Upper/Lower (Mon/Tue/Thu/Fri)
- 5-day: PPL + Upper/Lower
- 6-day: PPL x2 (current default)

### Integration with `LogWorkout.tsx`
```text
if (preferencesLoading) return <LoadingSpinner />

if (!preferences?.routine_setup_completed && workoutCount === 0) {
  return <RoutineSetup onComplete={() => navigate('/log')} />
}

// Normal workout flow for everyone else
return <DaySelectorWithCheckin ... />
```

---

## Phase 3: Dynamic Workout Days

### Refactor `DaySelectorWithCheckin.tsx`
Currently hardcoded to 6 days (PPL x2). Change to:

```text
Based on user's training_split:
- ppl6: Day 1-6 (Push A, Pull A, Legs A, Push B, Pull B, Legs B)
- upper_lower4: Day 1-4 (Upper A, Lower A, Upper B, Lower B)
- full_body3: Day 1-3 (Full Body A, Full Body B, Full Body C)
- custom: User-defined days
```

### New File: `src/lib/splitTemplates.ts`
Define exercise templates for each split type:

```text
export const SPLIT_TEMPLATES = {
  ppl6: { ... current defaultRoutine },
  upper_lower4: {
    'Day 1': { name: 'Upper A', focus: 'Push Emphasis', exercises: [...] },
    'Day 2': { name: 'Lower A', focus: 'Quad Focus', exercises: [...] },
    'Day 3': { name: 'Upper B', focus: 'Pull Emphasis', exercises: [...] },
    'Day 4': { name: 'Lower B', focus: 'Hamstring Focus', exercises: [...] },
  },
  full_body3: { ... },
}
```

---

## Phase 4: ML-Assisted Exercise Selection

### Enhanced Edge Function: `generate-workout/index.ts`
Accept parameters:
- `split_type`: The user's chosen split
- `day_index`: Which day of the split (1, 2, 3, etc.)
- `goal`: lose/gain/maintain (from user preferences)
- `equipment`: gym/home/minimal

Return personalized exercise recommendations.

### Empty Session Option
Allow users to start a workout with zero pre-filled exercises:
- "Start Empty" button in day selector
- Add exercises one-by-one using enhanced ExercisePicker
- Useful for users who don't follow a structured program

---

## Phase 5: History Editing

### Enhanced `History.tsx`
- Extend timeline from 14 to 30 days
- Each workout day shows edit icon
- Tap to open `WorkoutEditSheet`

### New Component: `WorkoutEditSheet.tsx`
Bottom sheet allowing:
- Edit individual sets (weight, reps)
- Delete sets
- Add missed exercises
- Mark workout as "skipped" (intentional rest)
- Delete entire workout

### Enhanced `WorkoutDetail.tsx`
- Add "Edit Mode" toggle
- Inline editing of all set data
- Save changes with optimistic updates

---

## Implementation Priority

1. **Phase 1** - Existing user detection (critical - prevents breaking current users)
2. **Phase 3** - Dynamic days (builds foundation for flexibility)
3. **Phase 5** - History editing (high user value, independent work)
4. **Phase 2** - Routine setup for new users
5. **Phase 4** - ML exercise suggestions

---

## Database Migrations

```sql
-- Add routine configuration columns
ALTER TABLE user_preferences 
ADD COLUMN training_split text DEFAULT 'ppl6',
ADD COLUMN rest_days jsonb DEFAULT '[0]',
ADD COLUMN routine_setup_completed boolean DEFAULT false;

-- Add skip tracking to workouts
ALTER TABLE workouts 
ADD COLUMN is_skipped boolean DEFAULT false;
```

---

## Files to Create
- `src/hooks/useRoutineInference.ts` - Analyze workout history
- `src/components/workout/RoutineSetup.tsx` - Split selector (new users only)
- `src/components/workout/WorkoutEditSheet.tsx` - History editing
- `src/lib/splitTemplates.ts` - Templates for all split types

## Files to Modify
- `src/hooks/useUserPreferences.ts` - Add routine inference logic
- `src/pages/LogWorkout.tsx` - Conditional routing based on user state
- `src/components/workout/DaySelectorWithCheckin.tsx` - Dynamic days
- `src/pages/History.tsx` - Add edit capabilities
- `src/pages/WorkoutDetail.tsx` - Inline editing mode
- `src/lib/workoutPresets.ts` - Reorganize into split templates

---

## Key Decisions

**Existing users with history will:**
- Never see a new onboarding/setup flow
- Have their split auto-inferred (most likely "ppl6" based on current 6-day structure)
- Retain all their workout history unchanged
- Get access to new editing features immediately

**Settings page will include:**
- "Training Split" option to change splits anytime
- "Rest Days" selector for custom schedules
- "Generate New Routine" button to use AI assistance
