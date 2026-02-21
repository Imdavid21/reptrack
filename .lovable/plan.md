

## Optimize Exercise Review UI

### Changes

**1. Merge AI button into "Add Exercise" button**

Combine the separate AI sparkles icon button into the "Add Exercise" button itself. The new button will show `+ Add Exercise` on the left and a sparkles icon divider on the right side -- tapping the left area opens the exercise picker, tapping the sparkles triggers AI suggestions. This keeps the UI cleaner with one combined element instead of two separate buttons.

**2. Add "Finish Early" button when resuming a draft**

When `isResuming` is true (a saved draft with progress exists), add a subtle "Finish Early" text button. This sits between the primary "Resume Workout" button and the "Skip exercises" link. It calls the same finish handler as the active session's finish early.

- "Resume Workout" remains the big, prominent primary button
- "Finish Early" is a small, muted text link -- visible but hard to accidentally tap
- "Skip exercises" stays as-is and remains functionally separate (it logs a quick empty workout, not the same as finishing early)

**3. Keep Skip and Finish Early as separate actions**

- "Skip exercises" = quick-log with no exercise data (handleQuickLog)
- "Finish Early" = save whatever progress has been recorded so far

### Technical Details

**File: `src/components/workout/ExerciseReview.tsx`**

*Props:* Add optional `onFinishEarly?: () => void` and `isFinishingEarly?: boolean` props.

*Add Exercise + AI row (lines ~661-697):* Replace the two separate buttons with a single combined button group:
- A container with dashed border and rounded-xl
- Left section: "+ Add Exercise" (click opens picker)  
- Right section: sparkles icon with a left divider line (click triggers onSuggest)
- When AI suggestions are pending or picker is open, render as before

*Bottom actions (lines ~699-717):* When `isResuming` and `onFinishEarly` is provided, insert a "Finish Early" text button between "Resume Workout" and "Skip exercises":
```
Resume Workout (primary)
Finish Early (subtle text)
Skip exercises -> (existing link)
```

**File: `src/pages/LogWorkout.tsx`**

Pass `onFinishEarly={handleExercisesDone}` and `isFinishingEarly={isCreating}` to `ExerciseReview` when `isResuming` is true.
