
# Exercise Name Merge Plan

## Overview
Merge duplicate exercise entries across both the `exercises` and `exercise_sets` tables for user imdz1999@gmail.com. All data (weights, reps, dates) will be preserved -- only the `name` / `exercise_name` column values change.

---

## Merge Groups

### Group 1: Barbell Curls
| Old Name | Canonical Name |
|---|---|
| Barbell Curl | **Barbell Curls** |

- `exercises` table: 9 sets "Barbell Curl" -> "Barbell Curls" (10 already correct)
- `exercise_sets` table: 4 sets "Barbell Curl" -> "Barbell Curls"

### Group 2: Barbell Overhead Press
| Old Name | Canonical Name |
|---|---|
| Barbell OHP | **Barbell Overhead Press** |
| Overhead Press | **Barbell Overhead Press** |

- `exercises` table: 11 sets "Barbell OHP" + 8 "Overhead Press" -> merge into 8 existing "Barbell Overhead Press"
- `exercise_sets` table: 11 "Barbell OHP" + 8 "Overhead Press" -> "Barbell Overhead Press"

### Group 3: Deadlifts
| Old Name | Canonical Name |
|---|---|
| Conventional Deadlift | **Deadlifts** |
| Deadlift | **Deadlifts** |

- `exercises` table: 11 "Conventional Deadlift" + 14 "Deadlift" -> "Deadlifts"
- `exercise_sets` table: 7 "Conventional Deadlift" + 14 "Deadlift" -> "Deadlifts"
- Note: "Deadlift Technique" stays separate (different exercise purpose)

### Group 4: Flat Dumbbell Bench Press
| Old Name | Canonical Name |
|---|---|
| Flat DB Bench | **Flat Dumbbell Bench Press** |
| Flat DB Bench Press | **Flat Dumbbell Bench Press** |
| Flat Dumbbell Bench | **Flat Dumbbell Bench Press** |
| Dumbbell Bench Press | **Flat Dumbbell Bench Press** |

- `exercises` table: 3 + 4 + 3 + 3 = 13 sets -> merge into 18 existing
- `exercise_sets` table: 3 + 4 + 3 = 10 sets -> "Flat Dumbbell Bench Press"

### Group 5: Incline Barbell Bench Press
| Old Name | Canonical Name |
|---|---|
| Incline Barbell Bench | **Incline Barbell Bench Press** |
| Incline BB Bench | **Incline Barbell Bench Press** |

- `exercises` table: 6 + 8 = 14 sets -> merge into 33 existing
- `exercise_sets` table: 6 + 8 = 14 sets -> "Incline Barbell Bench Press"

### Group 6: Hammer Curls
| Old Name | Canonical Name |
|---|---|
| Hammer Curl | **Hammer Curls** |

- `exercises` table: 5 sets -> "Hammer Curls" (3 already correct)
- `exercise_sets` table: 5 sets -> "Hammer Curls"

### Group 7: Leg Extensions
| Old Name | Canonical Name |
|---|---|
| Leg Extension | **Leg Extensions** |

- `exercises` table: 6 sets -> "Leg Extensions" (3 already correct)
- `exercise_sets` table: 6 sets -> "Leg Extensions"

### Group 8: Cable Tricep Pushdowns
| Old Name | Canonical Name |
|---|---|
| Tricep Pushdown | **Cable Tricep Pushdowns** |
| Cable Pushdown | **Cable Tricep Pushdowns** |

- `exercises` table: 7 + 3 = 10 sets -> merge into 7 existing
- `exercise_sets` table: 3 + 3 = 6 sets -> "Cable Tricep Pushdowns"

### Group 9: Dumbbell Shoulder Press
| Old Name | Canonical Name |
|---|---|
| DB Shoulder Press | **Dumbbell Shoulder Press** |
| Seated DB Shoulder Press | **Dumbbell Shoulder Press** |
| Seated Dumbbell Shoulder Press | **Dumbbell Shoulder Press** |

- `exercises` table: 4 + 4 + 7 = 15 sets -> merge into 11 existing
- `exercise_sets` table: 4 + 4 = 8 sets -> "Dumbbell Shoulder Press"

### Group 10: Cable Seated Row
| Old Name | Canonical Name |
|---|---|
| Seated Cable Row | **Cable Seated Row** |

- `exercises` table: 11 sets -> merge into 27 existing
- `exercise_sets` table: already correct (11 "Cable Seated Row")

### Group 11: Incline Dumbbell Flyes
| Old Name | Canonical Name |
|---|---|
| Incline DB Fly | **Incline Dumbbell Flyes** |

- `exercises` table: 3 sets -> merge into 4 existing
- `exercise_sets` table: 3 sets -> "Incline Dumbbell Flyes"

### Group 12: Incline Dumbbell Press
| Old Name | Canonical Name |
|---|---|
| Incline DB Press | **Incline Dumbbell Press** |

- `exercises` table: 19 sets -> merge into 5 existing
- `exercise_sets` table: 19 sets -> "Incline Dumbbell Press"

### Group 13: Close Grip Bench Press
| Old Name | Canonical Name |
|---|---|
| Close Grip Chest Press | **Close Grip Bench Press** |

- `exercises` table: 4 sets -> merge into 10 existing
- `exercise_sets` table: 4 sets -> "Close Grip Bench Press"

### Group 14: Lateral Raises
| Old Name | Canonical Name |
|---|---|
| Dumbbell Lateral Raises | **Lateral Raises** |

- `exercises` table: 5 sets -> merge into 14 existing
- Note: "Lateral Raise Machine" stays separate (different equipment)

### Group 15: Dumbbell Bicep Curls
| Old Name | Canonical Name |
|---|---|
| DB Bicep Curl | **Dumbbell Bicep Curls** |

- `exercises` table: 6 sets -> "Dumbbell Bicep Curls"
- `exercise_sets` table: 6 sets -> "Dumbbell Bicep Curls"

---

## Exercises NOT Merged (Kept Separate)
- **Deadlift Technique** -- different purpose from Deadlifts
- **Lateral Raise Machine** -- different equipment from Lateral Raises
- **Cable Flyes** vs **Chest Fly** -- different equipment context
- **Bent Over Rear Delt Flyes** vs **Reverse Flyes** -- keeping distinct (different form cues)
- **Rear Delt Fly + Lat Raise** -- combo exercise, stays separate

---

## Technical Implementation

### Step 1: Update `exercises` table
Run UPDATE statements for each merge group, matching on the user's workouts. The `(Set N)` suffix is preserved -- only the base name changes. For example:
```text
"Barbell Curl (Set 1)" -> "Barbell Curls (Set 1)"
"Flat DB Bench (Set 2)" -> "Flat Dumbbell Bench Press (Set 2)"
```

### Step 2: Update `exercise_sets` table
Run matching UPDATE statements on `exercise_name` for the same merge groups.

### Step 3: Update `exerciseMatching.ts`
Add canonical aliases to `normalizeExerciseName()` so future logging resolves abbreviations automatically, preventing new duplicates.

### Step 4: Verify
Query both tables post-merge to confirm no old names remain.

---

## Data Safety
- No rows are deleted -- only the name/exercise_name text values change
- All weights, reps, dates, workout associations are untouched
- Set suffixes like `(Set 1)` are preserved
- The update is scoped to this user's workouts only via JOIN on `workouts.user_id`
