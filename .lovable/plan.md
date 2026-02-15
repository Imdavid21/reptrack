

## Merge ExerciseOverview into ExerciseReview

### Problem
There are two screens showing exercise lists that serve overlapping purposes:
1. **ExerciseReview** -- shown *before* starting a workout (edit exercises, reorder, add, start)
2. **ExerciseOverview** -- shown *during* an active workout when switching to "overview" mode (see progress, pick an exercise to log, finish workout)

Having two separate components for this creates confusion. A gym user mid-workout should see the same familiar layout they saw before starting, just with progress indicators added.

### Solution
Remove `ExerciseOverview` entirely and reuse `ExerciseReview` for the mid-workout overview, adding a few props to support the "active session" context:
- Show set completion progress (e.g., "3/4 sets logged") per exercise
- Allow tapping an exercise to jump to its set-by-set logging view
- Show the "Finish Workout" button instead of "Start Workout"
- Disable editing controls (reorder, remove, add) during an active session to prevent accidental changes

---

### Technical Details

**File: `src/components/workout/ExerciseOverview.tsx`**
- Delete this file entirely.

**File: `src/components/workout/ExerciseReview.tsx`**
- Add an optional `activeSession` prop (boolean) that switches the component into "in-progress" mode:
  - Replaces "Start Workout" with "Finish Workout"
  - Hides reorder arrows, remove buttons, "Add Exercise", and AI suggest
  - Shows per-exercise set completion status (e.g., "3/4 sets" with a check icon for fully completed exercises)
- Add an optional `onSelectExercise` prop for tapping an exercise during an active session (navigates to set-by-set view)
- Add an optional `onFinish` prop for the "Finish Workout" action
- Add optional `isFinishing` prop to disable the button while saving

**File: `src/pages/LogWorkout.tsx`**
- Remove the `ExerciseOverview` import
- In the `exerciseViewMode === 'overview'` block, render `ExerciseReview` instead, passing:
  - `activeSession={true}`
  - `onSelectExercise` that sets the exercise index and switches to `'single'` mode
  - `onFinish={handleExercisesDone}`
  - `isFinishing={isCreating}`
  - The same `exercises`, `dayName`, `dayFocus` already available in scope

### No dependencies to remove
- `ExerciseOverview` is only imported in `LogWorkout.tsx` -- no other consumers
- All its functionality (progress display, exercise selection) will be absorbed into `ExerciseReview`

