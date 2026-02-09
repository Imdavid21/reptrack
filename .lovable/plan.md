

# Strength Overview: Body-Part Area Chart with Exercise Drill-Down

## What Changes

The chart currently shows **one muscle group at a time** as a stacked area of exercises. The new design shows **up to 3 body parts as simple area lines on the same chart**, with exercise-level detail available on hover (desktop) or tap (mobile).

## Visual Layout

```text
+-------------------------------------------+
| [Trophy] Strength Overview        +12%    |
+-------------------------------------------+
| [CHEST] [BACK] [LEGS]  (top 3 chips)      |
+-------------------------------------------+
|                                           |
|   ___--- Chest (blue)                     |
|  /   _-- Back (coral)                     |
| /  _/--- Legs (green)                     |
| /_/                                       |
|                                           |
|  Jan 6   Jan 13  Jan 20  Jan 27  Feb 3   |
+-------------------------------------------+
|           230 kg STRENGTH INDEX            |
+-------------------------------------------+
```

**On hover (PC):** Tooltip shows the body part name, total weight, and a mini breakdown of contributing exercises with their weights.

**On tap (mobile):** Same tooltip appears; tapping a second time (or tapping the area directly) opens the existing `ExerciseBreakdownDialog` for that body part.

## Technical Details

### Data Changes
- Remove per-exercise stacking -- each muscle group becomes a **single area line** showing its weekly total (sum of exercise maxes), which is already computed as `weeklyMaxWeights`
- Chart data becomes one unified array: `{ week: "Jan 6", chest: 120, back: 95, legs: 180, ... }`
- Limit display to **top 3 muscle groups by current weight** (keeps chart clean)

### Chart Changes
- Replace stacked `<Area>` per-exercise with one `<Area>` per body part (up to 3)
- Each area gets a distinct pastel color and subtle fill
- Remove muscle group chip selector row (no longer needed since all 3 show at once)
- Keep `AnimatePresence` for smooth transitions when date range changes

### Tooltip / Interaction
- Custom `<Tooltip content={...} />` component that renders:
  - Body part name + total kg
  - List of exercises with their max weight for that week
- On mobile: tap an area to open `ExerciseBreakdownDialog` for that group
- On desktop: hover shows the rich tooltip; click opens the dialog
- Use `onClick` on `<Area>` to trigger dialog, detecting the active body part from the click event

### What Gets Removed
- Muscle group chip selector row
- `hiddenExercises` state and toggle logic
- Per-exercise `<Area>` components
- `stackedWeekly` and `exerciseNames` from `MuscleGroupData`

### What Stays
- Header with trophy icon and growth % chip (now shows overall growth)
- Strength Index footer
- `ExerciseBreakdownDialog` (opened on tap/click)
- All existing data hooks and date range filtering

### Files Modified
- `src/components/analytics/StrengthOverviewChart.tsx` -- single file change

