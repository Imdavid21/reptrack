# Deficit Mode

A toggle in Settings flips the dashboard calorie card into a cutting-focused view: hard cap countdown, real-time net deficit (intake − burn − target), and protein elevated as the primary metric.

## 1. Data model

Add columns to `user_preferences` (migration):
- `deficit_mode_enabled boolean default false`
- `daily_deficit_target integer default 500` (kcal under maintenance)
- `maintenance_calories integer` (nullable; falls back to `daily_calorie_goal + daily_deficit_target` if unset)

When Deficit mode is ON, the effective intake cap = `maintenance_calories − daily_deficit_target` (or just `daily_calorie_goal` if maintenance is unset).

## 2. Settings (`src/pages/Settings.tsx`)

New compact "Deficit Mode" section under the existing Goals area:
- Toggle switch (on/off)
- When ON, reveal two inputs: Maintenance kcal, Deficit kcal/day (default 500)
- Save/Done pattern consistent with existing Settings chips

## 3. Dashboard card (`src/components/health/CalorieTrackerCompact.tsx`)

Branch on `deficit_mode_enabled`:

**Normal mode** — unchanged.

**Deficit mode** — restructured card:
- Top row: small "DEFICIT" badge (pastel coral) next to the heading
- Hero metric: **Calories remaining** = `cap + todayBurn − todayIntake`. Big number, "kcal left today" label. Goes red when negative.
- Secondary strip (3 small stats):
  - Net deficit today: `(maintenance − intake + burn)` with sign; green if ≥ target, amber if partial, red if surplus
  - Protein: `consumed / goal g` — promoted to primary color, bold
  - Burn: `+X kcal added` (from `useCalorieBurn`)
- Progress ring/bar represents intake vs cap (fills then turns red on overflow)
- Quick-add buttons unchanged

Burn integration: pull from existing `useCalorieBurn` hook (already used elsewhere) and add it to the remaining budget.

## 4. Dashboard badge (`src/pages/Dashboard.tsx`)

Small "Deficit" pill near the header when the mode is on, so the state is visible without opening Settings.

## Technical notes

- New migration adds three nullable/defaulted columns; no breaking changes to existing rows.
- `useUserPreferences` type extended with the three fields.
- Reuses `useMeals` (intake), `useCalorieBurn` (burn), `usePreferences` (cap + protein goal). No new API calls.
- Keeps the Dark AF aesthetic: pastel coral accent for deficit state, same `rounded-xl`, no gradients, no emojis.
- No changes to Insights, History, or meal-logging flows.

## Out of scope

- Weekly deficit streak chart (can be added to Insights later)
- Auto-detect from `weight_goal_type` (deferred per your "Settings + badge" choice)
- Macro recalculation (carbs/fat targets stay as-is; only protein is emphasized visually)
