

# Strength Overview: Horizontal Stacked Bar Breakdown

## Overview
Same plan as approved, but using **horizontal stacked bars** instead of vertical. Each row represents a week, and the bar extends right showing exercise contributions to total weight. This is more readable on mobile since week labels sit on the Y-axis and weight extends horizontally.

## Visual Layout

```text
+-------------------------------------------+
| [Trophy] Strength Overview        +12%    |
+-------------------------------------------+
| [CHEST] [BACK] [SHOULDERS] [ARMS] [LEGS] |
+-------------------------------------------+
|                                           |
|  Feb 3  |████████████████████             |
|  Jan 27 |██████████████████               |
|  Jan 20 |████████████████                 |
|  Jan 13 |██████████████                   |
|  Jan 6  |████████████                     |
|                                           |
|          0    20    40    60   (kg)        |
+-------------------------------------------+
| [Flat DB Press] [Incline DB] [Cable Fly]  |
+-------------------------------------------+
|           230 kg STRENGTH INDEX            |
+-------------------------------------------+
```

## Technical Changes

### `src/components/analytics/StrengthOverviewChart.tsx` (full rewrite of render, keep data hooks)

1. **Keep** existing `useMemo` data processing that builds `muscleGroups` with per-exercise weekly data
2. **Extend** weekly data into stacked format: `{ week: "Feb 3", [exerciseName]: maxWeight }` per selected muscle group
3. **Replace** sparkline grid with:
   - Horizontal scrollable MUI Chip row for muscle group selection
   - Recharts `BarChart` with `layout="vertical"` and stacked `<Bar>` components (one per exercise)
   - Y-axis = week labels, X-axis = weight (kg)
   - Chart height scales with number of weeks (e.g. `weeks.length * 40 + 40`)
4. **Legend**: toggleable exercise color chips below the chart; tapping hides/shows that exercise from the stack
5. **Remove** `SparklineCard` sub-component
6. **Keep** `ExerciseBreakdownDialog` -- triggered on bar segment click or legend tap

### Color Palette (soft pastels)
`#B5D8F7`, `#F7C8B5`, `#C5E8C1`, `#F0D6F7`, `#F7E8B5`, `#B5F0E8`, `#F7B5C8`, `#D6D6F0`

### State
- `selectedGroupKey: string` -- active muscle group (default: first with data)
- `hiddenExercises: Set<string>` -- exercises toggled off

### Interactions
- Haptic feedback on chip taps
- `AnimatePresence` crossfade when switching muscle groups
- Rounded bar corners (`radius={[0, 4, 4, 0]}`) for polished look
- Tooltip on bar hover/tap showing exercise name and weight

