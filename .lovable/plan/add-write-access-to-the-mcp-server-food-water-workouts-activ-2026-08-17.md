# Add write access to the MCP server (food, water, workouts, activities)

Turn the read-only MCP server into a read + write server so ChatGPT can log your
check-ins directly. Writes stay limited to four domains: meals, water, workouts,
and activities (walk/run/cycle). Everything else stays read-only.

## What ChatGPT will be able to do

New tools, all create-or-update, never delete:

| Tool | What it does |
| --- | --- |
| `log_meal` | Log a meal with food name, meal type, calories and macros (protein, carbs, fat, fiber, sugar, sodium, potassium) that ChatGPT estimates |
| `update_meal` | Correct a meal it previously logged (by meal id returned from `log_meal` or `get_nutrition`) |
| `log_water` | Log a water intake amount in ml/litres for a given day |
| `log_workout` | Log a full session: date, workout name, duration, and a list of exercises with reps and loads |
| `update_workout` | Adjust a logged session's duration, date/time, or replace its exercise list |
| `log_activity` | Log a walk, run, or cycle with distance and/or duration |
| `update_activity` | Correct a logged activity's distance, duration, or calories |

Rules baked into every write tool:

- **Ownership** — rows are always written for the signed-in user from the verified
  OAuth token. Any `user_id` sent by the model is ignored.
- **Backdating** — dates must be between 30 days ago and today (in your timezone).
  Anything else is rejected with a clear message.
- **No deletes** — no delete tool exists, and updates can only touch rows you own.
- **Confirmation-friendly** — each tool returns the saved record so ChatGPT can
  read back exactly what was written.
- **Energy stays consistent** — logging or updating a workout recalculates its
  calorie burn the same way the app does, so Insights and History match.

## Food macros

ChatGPT supplies calories and macros with the meal. Calories are required; macros
are optional but recorded when provided, and each meal is tagged with its source
so app-logged and ChatGPT-logged meals stay distinguishable.

## Safety and failsafes

- Write tools get their own tighter rate-limit bucket, and unlike reads they
  **fail closed** if the limiter is unavailable.
- Idempotency: each write accepts an optional client key so a retried call
  updates the same row instead of creating a duplicate.
- Every write is recorded in the existing MCP audit log with tool name, duration,
  and success/failure, and is visible on the MCP status page.
- Numeric ranges are validated (no negative calories, absurd loads, 400 kg
  bodyweight-style values) before anything is stored.

## Technical notes

- `supabase/functions/mcp/core.ts`: replace the single `MCP_MODE = "read_only"`
  flag with explicit `READ_TOOLS` / `WRITE_TOOLS` lists plus validation helpers
  (`assertWritableDate`, numeric bounds, macro coercion).
- New `supabase/functions/mcp/writes.ts`: one handler per write tool, all going
  through the user-scoped PostgREST client so RLS applies; `user_id` set from
  `ctx.user.id`.
- `supabase/functions/mcp/index.ts`: register the write tools with
  `readOnlyHint:false`, `destructiveHint:false`, `idempotentHint:true`; route
  writes through the strict limiter; keep audit logging.
- Workout writes insert into `workouts` + `exercises` and write the matching
  `calorie_burns` row using the existing energy calculation, mirroring
  `workoutEnergySync`.
- `src/lib/mcpSecurity.test.ts`: update the policy tests (they currently assert
  a read-only server) to assert the exact allowed write set, that no delete or
  generic-execution tool is registered, and that date/ownership guards hold.
- `src/pages/McpStatus.tsx`: show read vs write tools and reflect the new mode.
- The consent screen copy changes from "read-only access" to an explicit list of
  what can be created and updated, so re-authorising ChatGPT shows the real scope.
- Redeploy the `mcp` edge function; ChatGPT needs to reconnect to pick up the new
  tool list.
