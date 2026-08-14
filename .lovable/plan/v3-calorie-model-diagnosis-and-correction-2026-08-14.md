# V3 calorie model diagnosis and correction

## Verdict

The v3 engine itself is sound. Every activity number it produces is **net of rest** — `(MET − 1) × 3.5 × kg / 200 × minutes` — and it is added to a maintenance baseline that already contains resting energy. That is the correct structure, and the classic "gross MET on top of maintenance" double-count is not present in the current code.

The problem is that **the app is running two different calorie models at once**, and almost all your stored history is from the old one.

## Finding 1: Home and History disagree about the same day

Two separate aggregation paths exist:

- **Home / dashboard** (`useEnergyModel.ts`) ignores the stored `calories` value and recomputes every workout and activity from scratch with v3 net math.
- **History / Insights** (`useCalorieHistory.ts`) reads the stored `calories` column verbatim, only recomputing when a workout has no saved burn row.

So the same walk can read 92 kcal on Home and 130 kcal in History. Neither screen is lying; they are running different engines.

## Finding 2: 175 of your 176 stored burn rows are old gross-MET values

Only one row (13 Aug) is `energy_model_version = 3`. Everything before it is v2, which used gross MET and therefore includes resting calories you were burning anyway.

Restating your stored rows since 1 June with v3 math:

| Activity | Rows | Stored | v3 net | Overstated by |
|---|---|---|---|---|
| Walking | 19 | 3,509 | 2,582 | 36% |
| Cycling | 5 | 2,504 | 1,300 | 93% |
| Boxing | 5 | 571 | 327 | 75% |
| Workouts | 47 | 25,201 | 18,264 | 38% |

Your v3 walk logs at 3.07 kcal/min; the v2 walks average 4.33 kcal/min for the same pace and bodyweight.

## Finding 3: three "running" entries are walks

24, 29 July and one other are logged as running but work out to roughly 5–6 km/h (14 km in 170 min, 13 km in 180 min, 12 km in 130 min). The running formula uses a steeper coefficient than walking, so these are inflated well beyond even the gross-vs-net gap — 84 kcal/km against a realistic ~50.

## Finding 4: the calibration loop currently hides all of this

Calibration back-solves your true expenditure from intake and weight trend, and it uses the **recomputed v3** numbers, not the stored ones. Your intake averages ~2,100 kcal while you dropped 77.7 kg to 72.7 kg since June, implying real expenditure near 2,600 kcal/day. The model's current adjustment is only −36 kcal, meaning its predictions already line up. That is reassuring for Home, but it means History is inflated independently of the loop and will stay inflated.

## Finding 5: minor, not urgent

- Unconfirmed meals count fully toward intake. Only one meal has a null calorie value, and none are unconfirmed, so this has no current effect. Worth a decision, not a fix.
- 14 meals since June have no protein recorded — predates macro capture.
- The 9 workouts with no burn row are all empty shells with zero exercises and no duration. Correct to have no burn.

## The fix

1. **One engine, one answer.** Rewrite `useCalorieHistory.ts` to recompute burns through the same `estimateDayActivity` logic the dashboard uses, instead of trusting the stored `calories` column. Home, History and Insights then agree by construction.
2. **Restate the stored rows.** Backfill every `energy_model_version = 2` row in `calorie_burns` with v3 net kcal, plus `met_estimate`, `effective_weight_kg`, `confidence` and `energy_model_version = 3`, using the bodyweight in effect on each date. Rows without a stored distance keep their duration and are recomputed from the activity's default pace.
3. **Reclassify the three walk-paced "runs"** to walking so the correct metabolic coefficient applies.
4. **Re-run calibration** after the backfill so the adjustment relearns against restated history rather than a mix of both models.
5. **Add a regression test** asserting that the history aggregate and the energy model produce the same total burn for a given day, so the two paths cannot drift apart again.

## What this means for your numbers

Expect your historical daily burn in History and Insights to drop roughly 35–40%, and past net-deficit figures to look smaller. That is a correction, not lost progress — your actual weight trend, which is the ground truth, does not change. Home has already been showing the honest figure.

## Technical notes

- `src/hooks/useCalorieHistory.ts`: replace the `burnsByDate` accumulation with per-day recomputation via `estimateWorkoutEnergy` and `estimateActivity`; keep the `persistedWorkoutBurnIds` guard for workouts.
- Backfill runs as a migration over `calorie_burns` where `energy_model_version = 2`, mirroring `netActivityKcal` in `src/lib/energyEngineV3.ts` and the intensity bands in `estimateWorkoutEnergy` (3.5 / 4.5 / 5.5).
- Weight per date comes from `effectiveWeightAt` against `daily_metrics`, falling back to `user_preferences.initial_weight_kg`.
- Calibration re-run is a client-side recompute on next load once `energy_model_states` rows for 13–14 Aug are cleared.
