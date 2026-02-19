

## Remove Strength Overview Chart

The "Strength Overview" card (sparkline grid + Strength Index) will be removed from the Insights page and its component file deleted. The "Exercise Progression" chart already provides superior per-exercise tracking with growth sorting and the upcoming body part filters.

### Changes

**1. `src/pages/Insights.tsx`**
- Remove the `import { StrengthOverviewChart }` line
- Remove the `motion.div` wrapper containing `<StrengthOverviewChart />` (around lines 454-457)

**2. Delete `src/components/analytics/StrengthOverviewChart.tsx`**
- The entire file is removed. No other component imports from it.

### What is preserved
- All underlying data hooks (`useExerciseSets`, `useBodyPartsProgress`) remain untouched
- Shared utilities (`getMuscleGroup`, `stripSetSuffix` in `exerciseClassification.ts`) are used by other components (VolumeSankeyChart, ExercisePicker) and stay in place
- No database changes needed -- all workout/exercise data is unaffected

### No dependency transfers needed
The Exercise Progression chart already has its own data pipeline via `useExerciseSets`. The Strength Overview did not provide any unique data or state to other components.

