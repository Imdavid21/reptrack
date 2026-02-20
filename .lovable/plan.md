
## Consolidate Active Workout Navigation: Remove Redundant Buttons

### Problem
During an active workout session (`step === 'exercises'`), there are two redundant navigation elements in the header:
1. A **List/Grid toggle button** that switches between `single` (SetBySetCard) and `overview` (a second ExerciseReview instance with `activeSession=true`) 
2. A **Pencil edit button** that navigates back to `step === 'review'` (the pre-workout ExerciseReview)

The `step === 'review'` ExerciseReview screen already serves as the overview — it shows all exercises, allows editing, and (after the previous change) supports tapping an exercise to jump to it. This makes the in-session overview mode and the toggle button fully redundant.

### Goal
- **Remove** the List/Grid toggle button and the `overview` exerciseViewMode from the active workout header
- **Remove** the Pencil edit button from the active workout header
- **Replace** both with a single back-chevron (already exists conceptually) so that pressing back from `SetBySetCard` returns to the `ExerciseReview` (`step === 'review'`), which already acts as the overview
- The `ExerciseReview` in `step === 'review'` will now serve both pre-workout planning AND mid-workout navigation/overview — when a session is active (`workoutStartTime` is set), clicking an exercise jumps straight into that exercise's `SetBySetCard`

---

### Technical Changes

**`src/pages/LogWorkout.tsx`**

1. **Remove** the `ExerciseViewMode` type (`'single' | 'overview'`) — it's no longer needed
2. **Remove** the `exerciseViewMode` state and `setExerciseViewMode` calls throughout the file
3. **Remove** the `List`, `LayoutGrid` icon imports (they become unused)
4. **Remove** the List/Grid toggle `<button>` from the active workout header
5. **Remove** the Pencil edit `<button>` from the active workout header (and `handleEditExercises` function)
6. **Remove** the `handleSkipExercise` branch that called `setExerciseViewMode('overview')` — replace with navigation back to `step === 'review'`
7. **Remove** the second `ExerciseReview` block (`exerciseViewMode === 'overview'`) inside `step === 'exercises'`
8. **Update** `handleBack` logic: when in `step === 'exercises'` (always `single` mode now), pressing back goes to previous set → previous exercise → `step === 'review'`
9. **Update** the `ExerciseReview` in `step === 'review'` to pass `onSelectExercise` even before the session starts — when `workoutStartTime` is set and a user taps an exercise, it should call `handleStartSessionAt(idx)` to jump straight to that exercise mid-session. When no session is active yet, tapping opens the edit expand (existing behaviour).
10. **Pass `isResuming` correctly** — when `workoutStartTime` is set, the `step === 'review'` screen already shows "Resume Workout" button; clicking an exercise should now also jump into the session at that exercise index.

**`src/components/workout/ExerciseReview.tsx`**

- Ensure `onSelectExercise` fires when a row is tapped in `activeSession` mode (already implemented). No structural changes needed here — the prop already exists and works.

---

### Resulting Flow

```text
[Select Day] → [ExerciseReview: plan & edit]
                     ↓ Start Workout / Resume
              [SetBySetCard: log sets]
                     ↓ Back (chevron / swipe)
              [ExerciseReview: mid-workout overview]  ← same screen, no duplicate
                     ↓ Tap exercise row
              [SetBySetCard: jump to that exercise]
                     ↓ Finish Workout (from ExerciseReview)
              [Dashboard]
```

- The ExerciseReview screen intelligently shows either "Start Workout" (no session yet) or "Finish Workout" (session active) based on whether `workoutStartTime` is set — this already works via `isResuming` and `activeSession` props.
- The Pencil and List/Grid buttons are removed from the header, reducing clutter. The header will only show: workout name + focus, timer, and sets counter.
