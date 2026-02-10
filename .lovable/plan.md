

# Fix Duplicate Exercise Entries from `(Set X)` Suffix

## Problem
When workouts are saved, each set becomes a separate row in the `exercises` table with the set number appended to the name:
- `Lat Pulldown (Set 1)`
- `Lat Pulldown (Set 2)`  
- `Lat Pulldown (Set 3)`

Analytics components treat these as **separate exercises**, causing:
- Progressions chart showing "Lat Pulldown (Set 1)", "Lat Pulldown (Set 2)" as different exercises
- Strength Overview detail dialog listing duplicate exercise entries
- Exercise counts being inflated

Classification into muscle groups still works (pattern matching catches "pulldown"), but the per-exercise grouping is broken.

## Solution
Add a `stripSetSuffix` utility to `exerciseClassification.ts` that removes `(Set X)` from exercise names, then apply it at the data-processing level in the affected hooks/components.

## Technical Changes

### 1. `src/lib/exerciseClassification.ts`
- Add and export a `stripSetSuffix(name: string): string` function that removes ` (Set N)` suffixes using a regex like `/\s*\(set\s*\d+\)\s*$/i`
- Apply it inside the `classify()` function so exact lookups work for set-suffixed names
- This ensures both `getBodyPart` and `getMuscleGroup` handle suffixed names correctly

### 2. `src/hooks/useExerciseSets.ts`
- Import `stripSetSuffix`
- Apply it when mapping exercise data: `exercise_name: stripSetSuffix(ex.name)` (line ~124)
- This ensures volume totals, weekly volume, and progressions all group sets of the same exercise together

### 3. `src/components/analytics/StrengthOverviewChart.tsx`
- Import `stripSetSuffix`
- Apply it when grouping exercises: `const exerciseName = stripSetSuffix(set.exercise_name)` before using it as a map key (line ~79)
- This prevents "Lat Pulldown (Set 1)" and "Lat Pulldown (Set 2)" from appearing as separate exercises in the detail dialog

### 4. `src/hooks/useBodyPartsProgress.ts`
- This hook queries `exercise_sets` table (not `exercises`), which stores `exercise_name` without the `(Set X)` suffix, so no changes needed here

## What This Fixes
- Exercise progressions will show a single "Lat Pulldown" entry instead of 4 separate "(Set 1/2/3/4)" entries
- Strength Overview detail will list each exercise once with its true max weight
- Volume calculations remain correct (all sets still contribute to total volume)
- No database changes needed -- this is a display/grouping fix only

