# Lead with maintenance, not BMR

The calorie tile currently headlines "BMR ESTIMATE 1665" and buries the number that actually drives your deficit (1962) as grey subtext. This flips the emphasis.

## What changes

The tile on the home screen becomes:

```text
MAINTENANCE (BEFORE EXERCISE)
1,962 kcal/day
Resting 1,665 + daily living                    >
```

Expanded (tap to open), it keeps the live ticker and adds the chain:

```text
Resting burn (BMR)                    1,665 kcal/day
Daily living (non-exercise)             +297 kcal
Personal calibration                     -36 kcal
-----------------------------------------------
Maintenance before exercise            1,962 kcal

Burned at rest so far today          1,041.32 kcal   (live)
+ Logged activity today                 +420 kcal
-----------------------------------------------
Total burned so far                  1,461.32 kcal
```

Plus one line of plain-English framing: logged workouts, walks, runs and rides are added on top of maintenance, which is why maintenance itself excludes them.

## Scope

- Only the presentation of this tile changes. No change to how BMR, maintenance, deficit or net calories are calculated.
- The tile appears in both normal and Deficit Mode on the home screen; both get the same new layout.

## Technical notes

- `src/components/health/BmrBreakdownTile.tsx`: swap headline/subtext, add the breakdown rows in the expanded state.
- The daily-living and calibration rows need the pieces that make up maintenance. `CalorieTrackerCompact.tsx` already reads `energy.model`, which carries `formulaRee`, `nonexerciseFactor`, `formulaBaseline`, `calibrationAdjustment` and `personalBaseline` — pass those through as optional props.
- Fall back gracefully when the model row is absent (older days, incomplete profile): show headline maintenance and resting only, skip the calibration row.
