
# Exercise Library Update Plan

## Problem
13 naming mismatches between the user's actual logged exercises and the exercise library, plus 4 missing exercises. This causes broken analytics, missing progression charts, and exercises not pre-filling correctly.

## Changes

### 1. Add missing exercises to `exerciseLibrary.ts`
- **Push**: Add "Chest Fly" (accessory, Chest), "Close Grip Push-ups" (accessory, Chest/Triceps, bodyweight), "Flat Barbell Bench Press" (primary, Chest)
- **Pull**: Add "Rear Delt Fly + Lat Raise" (accessory, Rear Delts/Side Delts) — or split into separate if preferred

### 2. Add aliases to `exerciseClassification.ts`
Map all 13 naming variants so analytics resolve correctly:
- "Barbell Curls" → "Barbell Curl"
- "Cable Seated Row" → "Seated Cable Row"
- "Cable Tricep Pushdowns" → "Tricep Pushdown"
- "Deadlifts" → "Conventional Deadlift"
- "Dumbbell Bicep Curls" → "Dumbbell Curl"
- "Face Pull" → "Face Pulls"
- "Flat Dumbbell Bench Press" → "Dumbbell Bench Press"
- "Leg Extensions" → "Leg Extension"
- "Lateral Raise Machine" → "Machine Lateral Raise"
- "Standing Calf Raises" → "Standing Calf Raise"
- "Flat Barbell Bench" → "Flat Barbell Bench Press" (new entry)

### 3. Fix preset name in `workoutPresets.ts`
- Rename "Flat Barbell Bench" → "Flat Barbell Bench Press" (matching the new library entry) across Phase 2 and Phase 3

### 4. Run a SQL migration to normalize historical exercise names
Batch UPDATE on `exercise_sets` to rename logged entries to canonical names, ensuring all past data aligns with the library for accurate progression tracking.

## Technical Details
- Files modified: `src/lib/exerciseLibrary.ts`, `src/lib/exerciseClassification.ts`, `src/lib/workoutPresets.ts`
- One database migration to normalize ~13 exercise name variants in `exercise_sets`
- No UI changes needed — the picker and charts will automatically benefit from consistent naming
