

# Combined Plan: Log Exercises, Fix Reverse Curls, and Add All New Exercises + Variants

## Summary

This plan combines the previous two tasks into one implementation:

1. Insert 6 new exercise rows into the database (Back Extension + Lever Seated Row)
2. Rename "Reverse Curls" to "Barbell Reverse Curls" in the database
3. Add all new exercises (back extensions, lever rows, reverse curl variations) to the three exercise data files

---

## Part 1: Database Changes

### Insert Back Extension 90 Degree (3 sets)

Workout ID: `0c36ec63-bf3c-4e75-b2c5-28293a311a44`

| Name | Sort Order | Actual Weight | Actual Reps | Category | Completed |
|---|---|---|---|---|---|
| Back Extension 90 Degree (Set 1) | 600 | 80 | 21 | accessory | true |
| Back Extension 90 Degree (Set 2) | 601 | 80 | 21 | accessory | true |
| Back Extension 90 Degree (Set 3) | 602 | 80 | 21 | accessory | true |

### Insert Lever Seated Row Machine (3 sets)

| Name | Sort Order | Actual Weight | Actual Reps | Category | Completed |
|---|---|---|---|---|---|
| Lever Seated Row Machine (Set 1) | 700 | 30 | 12 | accessory | true |
| Lever Seated Row Machine (Set 2) | 701 | 30 | 12 | accessory | true |
| Lever Seated Row Machine (Set 3) | 702 | 30 | 12 | accessory | true |

### Rename Reverse Curls to Barbell Reverse Curls

Update 3 existing rows (weights stay the same since they're already total barbell weight):

| ID | Old Name | New Name |
|---|---|---|
| ce4aafc7... | Reverse Curls (Set 1) | Barbell Reverse Curls (Set 1) |
| fa8f2d15... | Reverse Curls (Set 2) | Barbell Reverse Curls (Set 2) |
| 5d3e3683... | Reverse Curls (Set 3) | Barbell Reverse Curls (Set 3) |

No duration change needed.

---

## Part 2: Code Changes

### File 1: `src/lib/exerciseClassification.ts`

**Update existing entries** (lines 149-152):
- Change `'reverse curl'` and `'reverse curls'` from `Biceps` to `Forearms` (more anatomically accurate)
- Change `'wrist curl'` and `'wrist curls'` from `Biceps` to `Forearms`

**Add new entries** to the classification map:

Under a new **ARMS -- Forearms** section:
- `'barbell reverse curls'` / `'barbell reverse curl'` -> Forearms / arms
- `'dumbbell reverse curls'` / `'dumbbell reverse curl'` -> Forearms / arms
- `'ez bar reverse curls'` / `'ez bar reverse curl'` -> Forearms / arms
- `'cable reverse curls'` / `'cable reverse curl'` -> Forearms / arms

Under the **BACK** section:
- `'back extension 90 degree'` / `'back extension'` / `'back extensions'` / `'hyperextension'` / `'hyperextensions'` / `'back extension machine'` -> Back / back
- `'lever seated row machine'` / `'lever seated row'` / `'plate loaded row'` / `'plate loaded rows'` -> Back / back

**Add fallback patterns**:
- `'back extension'` -> Back / back (multi-word, before single-word patterns)
- `'reverse curl'` -> Forearms / arms (multi-word, before the generic `'curl'` -> Biceps fallback)
- `'lever row'` -> Back / back (multi-word)

### File 2: `src/lib/exerciseLibrary.ts`

Add to the `'Pull'` array:

| Exercise | Category | Default Weight | Default Reps | Muscle Group |
|---|---|---|---|---|
| Back Extension 90 Degree | accessory | BW | 3x15-20 | Lower Back |
| Back Extension | accessory | BW | 3x15-20 | Lower Back |
| Hyperextension | accessory | BW | 3x12-15 | Lower Back |
| Lever Seated Row Machine | primary | 30kg | 3x10-12 | Back |
| Reverse Curls | accessory | 10kg | 3x12-15 | Forearms |
| Barbell Reverse Curls | accessory | 20kg | 3x12-15 | Forearms |
| Dumbbell Reverse Curls | accessory | 10kg | 3x12-15 | Forearms |
| EZ Bar Reverse Curls | accessory | 20kg | 3x12-15 | Forearms |
| Cable Reverse Curls | accessory | 15kg | 3x12-15 | Forearms |

### File 3: `src/lib/exerciseVariants.ts`

Add new variant groups under a labeled **Forearms -- Reverse Curls** section and **Back -- Extensions / Lever Rows** section:

**Reverse Curls group** (each entry lists the other variations as swappable alternatives):
- `'Reverse Curls'` (dumbbell) <-> Barbell Reverse Curls, EZ Bar Reverse Curls, Cable Reverse Curls, Dumbbell Reverse Curls
- `'Barbell Reverse Curls'` (barbell) <-> Reverse Curls, EZ Bar Reverse Curls, Cable Reverse Curls, Dumbbell Reverse Curls
- `'Dumbbell Reverse Curls'` (dumbbell) <-> Reverse Curls, Barbell Reverse Curls, EZ Bar Reverse Curls, Cable Reverse Curls
- `'EZ Bar Reverse Curls'` (barbell) <-> Reverse Curls, Barbell Reverse Curls, Cable Reverse Curls, Dumbbell Reverse Curls
- `'Cable Reverse Curls'` (cable) <-> Reverse Curls, Barbell Reverse Curls, EZ Bar Reverse Curls, Dumbbell Reverse Curls

**Back Extension group**:
- `'Back Extension 90 Degree'` (bodyweight) <-> Back Extension, Hyperextension
- `'Back Extension'` (bodyweight) <-> Back Extension 90 Degree, Hyperextension
- `'Hyperextension'` (bodyweight) <-> Back Extension 90 Degree, Back Extension

**Lever Seated Row group**:
- `'Lever Seated Row Machine'` (machine) <-> Seated Cable Row, T-Bar Row

---

## Files Modified

| File | Change |
|---|---|
| Database (`exercises` table) | 6 INSERTs + 3 UPDATEs |
| `src/lib/exerciseClassification.ts` | ~20 new entries + 3 fallback patterns + fix Forearms labeling |
| `src/lib/exerciseLibrary.ts` | 9 new exercises in Pull array |
| `src/lib/exerciseVariants.ts` | ~10 new variant entries with proper section labels |

