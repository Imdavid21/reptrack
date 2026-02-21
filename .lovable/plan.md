

## Update Active Session Buttons in ExerciseReview

### What Changes
When viewing the exercise list during an active workout session (via the overview toggle or edit button), the bottom action area will show:

- **"Resume Workout"** as the primary, prominent button -- tapping it returns to the set-by-set card at the current exercise
- **"Finish Early"** as a subtle, secondary text-style button below it -- visible but not easy to accidentally tap
- When **all sets are completed**, the "Finish Workout" button becomes the sole primary button (current behavior, since there's nothing to resume)

### Why
1. Users who open the overview mid-workout most likely want to check progress or jump to an exercise, not finish
2. An accidental "Finish" tap mid-workout could prematurely end a session
3. The option to finish early should still be accessible for users who want it

### Technical Details

**File: `src/components/workout/ExerciseReview.tsx`** (lines ~588-597)

Replace the current single "Finish Workout" button in the `activeSession` branch with:

1. Calculate whether all exercises are fully completed (every set marked `completed`)
2. If **not all done**:
   - Primary button: "Resume Workout" -- calls `onSelectExercise` with the current/next incomplete exercise index
   - Below it: a small text-link-style "Finish Early" button (ghost/link variant, muted color, smaller font) -- calls `onFinish`
3. If **all done**:
   - Single primary button: "Finish Workout" -- calls `onFinish` (same as current)

**File: `src/pages/LogWorkout.tsx`** (lines ~715-737)

- Pass `currentExerciseIndex` to ExerciseReview as a new prop (e.g. `resumeAtIndex`) so "Resume" knows which exercise to return to
- Alternatively, ExerciseReview can compute the first incomplete exercise index from the exercises array

No new dependencies or database changes required.

