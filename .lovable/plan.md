

# Fix Exercise Classification -- Comprehensive Lookup Map

## Problem
Exercise classification uses fragile substring pattern matching. "Leg Extension" matches `'extension'` (Arms/Triceps) before it reaches `'leg extension'` (Quads). Similar issues exist for other exercises where one pattern is a substring of another.

## Solution
Create a single shared classification file with an explicit lookup map covering **every exercise** in the system, then replace the inline pattern matching in both analytics components.

---

## Complete Exercise Map (108 entries)

Every exercise from the library, variants file, split templates, and actual database records, labeled correctly:

### CHEST (19 entries)
| Exercise | Body Part |
|---|---|
| Barbell Bench Press | Chest |
| Dumbbell Bench Press | Chest |
| Flat Dumbbell Bench Press | Chest |
| Flat Dumbbell Bench | Chest |
| Flat Barbell Bench | Chest |
| Flat DB Bench | Chest |
| Flat DB Bench Press | Chest |
| DB Flat Bench | Chest |
| Incline Barbell Bench Press | Chest |
| Incline Barbell Bench | Chest |
| Incline BB Bench | Chest |
| Incline Barbell Press | Chest |
| Incline Dumbbell Press | Chest |
| Incline DB Press | Chest |
| Cable Flyes | Chest |
| Cable Crossover | Chest |
| Incline Dumbbell Flyes | Chest |
| Incline DB Fly | Chest |
| Chest Fly | Chest |
| Push-ups | Chest |
| Incline Push-ups | Chest |
| Decline Push-ups | Chest |
| Close Grip Push-ups | Chest |
| Dips | Chest |
| Weighted Dips | Chest |
| Close Grip Chest Press | Chest |
| Bench Press | Chest |

### SHOULDERS (16 entries)
| Exercise | Body Part |
|---|---|
| Overhead Press | Shoulders |
| Barbell Overhead Press | Shoulders |
| Barbell OHP | Shoulders |
| Dumbbell Shoulder Press | Shoulders |
| Seated Dumbbell Shoulder Press | Shoulders |
| Seated DB Shoulder Press | Shoulders |
| DB Shoulder Press | Shoulders |
| Arnold Press | Shoulders |
| Lateral Raises | Shoulders |
| Dumbbell Lateral Raises | Shoulders |
| Cable Lateral Raise | Shoulders |
| Lateral Raise Machine | Shoulders |
| DB Lateral Raise | Shoulders |
| Front Raises | Shoulders |
| Bent Over Rear Delt Flyes | Shoulders |
| Face Pulls | Shoulders |
| Face Pull | Shoulders |
| Reverse Flyes | Shoulders |
| Reverse Fly | Shoulders |
| Rear Delt Fly + Lat Raise | Shoulders |

### ARMS -- Triceps (12 entries)
| Exercise | Body Part |
|---|---|
| Tricep Pushdown | Triceps |
| Cable Tricep Pushdowns | Triceps |
| Cable Pushdown | Triceps |
| Tricep Pushdowns | Triceps |
| Overhead Tricep Extension | Triceps |
| Overhead Cable Tricep Extension | Triceps |
| Cable Rope Overhead Tricep Extension | Triceps |
| Dumbbell Overhead Extension | Triceps |
| Skull Crushers | Triceps |
| Close Grip Bench Press | Triceps |
| Tricep Dips | Triceps |

### ARMS -- Biceps (14 entries)
| Exercise | Body Part |
|---|---|
| Barbell Curl | Biceps |
| Barbell Curls | Biceps |
| Dumbbell Curl | Biceps |
| DB Bicep Curl | Biceps |
| Bicep Curls | Biceps |
| Hammer Curls | Biceps |
| Hammer Curl | Biceps |
| Incline Dumbbell Curl | Biceps |
| Incline Dumbbell Curls | Biceps |
| Cable Curl | Biceps |
| Cable Curls | Biceps |
| EZ Bar Preacher Curls | Biceps |
| EZ Bar Curl | Biceps |
| Concentration Curls | Biceps |

### BACK (18 entries)
| Exercise | Body Part |
|---|---|
| Pull-ups | Back |
| Weighted Pull-ups | Back |
| Negative Pull-ups | Back |
| Chin-ups | Back |
| Lat Pulldown | Back |
| Straight Arm Pulldown | Back |
| Straight Arm Pulldowns | Back |
| Barbell Row | Back |
| Barbell Rows | Back |
| T-Bar Row | Back |
| Seated Cable Row | Back |
| Cable Seated Row | Back |
| Cable Rows | Back |
| Single Arm Dumbbell Row | Back |
| Single Arm Dumbbell Rows | Back |
| Single Arm DB Row | Back |
| DB Row | Back |
| Conventional Deadlift | Back |
| Deadlift | Back |
| Deadlift Technique Work | Back |
| Deadlift Technique | Back |

### LEGS -- Quads (14 entries)
| Exercise | Body Part |
|---|---|
| Barbell Squat | Quads |
| Front Squat | Quads |
| Front Squats | Quads |
| Bodyweight Squats | Quads |
| Goblet Squats | Quads |
| Goblet Squat | Quads |
| Hack Squat | Quads |
| Leg Press | Quads |
| **Leg Extension** | **Quads** |
| **Leg Extensions** | **Quads** |
| Sissy Squats | Quads |
| Bulgarian Split Squat | Quads |
| Bulgarian Split Squats | Quads |
| Walking Lunges | Quads |
| Squats | Quads |
| Dumbbell Lunges | Quads |
| Wall Sit | Quads |

### LEGS -- Hamstrings (8 entries)
| Exercise | Body Part |
|---|---|
| Romanian Deadlift | Hamstrings |
| Romanian Deadlifts | Hamstrings |
| Dumbbell RDL | Hamstrings |
| Single Leg Romanian Deadlifts | Hamstrings |
| Good Mornings | Hamstrings |
| Leg Curl | Hamstrings |
| Leg Curls | Hamstrings |

### LEGS -- Glutes (4 entries)
| Exercise | Body Part |
|---|---|
| Hip Thrust | Glutes |
| Hip Thrusts | Glutes |
| Glute Bridge | Glutes |
| Glute Bridges | Glutes |

### LEGS -- Calves (5 entries)
| Exercise | Body Part |
|---|---|
| Standing Calf Raise | Calves |
| Standing Calf Raises | Calves |
| Seated Calf Raise | Calves |
| Seated Calf Raises | Calves |
| Calf Raises | Calves |

### CORE (1 entry)
| Exercise | Body Part |
|---|---|
| Ab Wheel Rollout | Core |

---

## Technical Changes

### 1. New file: `src/lib/exerciseClassification.ts`
- Export a `EXERCISE_CLASSIFICATION` map: `Record<string, { bodyPart: string; muscleGroup: string }>` with lowercased keys for all ~110 exercises above
- `bodyPart` = detailed label (Chest, Quads, Triceps, Biceps, Hamstrings, etc.)
- `muscleGroup` = overview label (chest, back, shoulders, arms, legs, core)
- Export two functions:
  - `getBodyPart(name: string, fallbackCategory?: string): string` -- used by `useBodyPartsProgress`
  - `getMuscleGroup(name: string): string` -- used by `StrengthOverviewChart`
- Lookup strategy: exact match on lowercased name, then normalized match via `normalizeExerciseName`, then fallback pattern matching (multi-word patterns before single-word), then category fallback

### 2. Update `src/hooks/useBodyPartsProgress.ts`
- Remove all inline classification logic (`BODY_PART_OVERRIDES`, `exerciseToBodyPart`, `guessBodyPart`)
- Import `getBodyPart` from the new shared file
- Replace `guessBodyPart(set.exercise_name, set.exercise_category)` with `getBodyPart(set.exercise_name, set.exercise_category)`

### 3. Update `src/components/analytics/StrengthOverviewChart.tsx`
- Remove all inline classification logic (`EXERCISE_OVERRIDES`, `MUSCLE_GROUPS`, `getMuscleGroup`)
- Import `getMuscleGroup` from the new shared file
- Keep the `MUSCLE_GROUPS` label array (just `key` and `label`) for chip rendering, but source classification from the shared function

This guarantees both charts always agree, "Leg Extension" is always Quads, and adding new exercises requires editing only one file.

