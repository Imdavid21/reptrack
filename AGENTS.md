# Project rules

- Treat a saved positive workout duration as active minutes when computing net activity; it is authoritative after manual correction and must not have stored pauses subtracted again.
- Show the stored workout energy estimate in History and workout details, while daily totals recompute with the shared energy model; this keeps individual records visible without double-counting their linked burn entries.
- Keep password recovery on its own public route and exempt it from signed-in redirects, so recovery sessions can set a new password before reaching the dashboard.
- Keep unfinished workouts in an immediate device draft and a user-owned account snapshot; reconcile conflicts explicitly and close snapshots after finish or discard so late writes cannot resurrect them.
- Key workout recovery initialization and save callbacks to the account ID, not the changing auth user object; token refreshes must not interrupt active sets with a false backup conflict.
- CSV portability uses one table-scoped schema and explicit reference ordering, excluding credentials, service logs and active session/recovery state; this preserves field types without reviving closed workouts.
- Workout activity identity is the owner plus workout ID, not the calendar date; update the existing linked activity and validate duration at storage boundaries to prevent duplicate burns and stale-draft inflation.
- Deploy the React/Vite frontend independently from Lovable Cloud, keeping auth, database, storage, and edge functions on the existing backend; Vercel builds must receive the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time so client calls and auth keep targeting the same backend.
- Every assistant (MCP) write goes through the planning.ts write guard: client_key replays return the original record, near-duplicates within 10 minutes return a warning, and each write is logged with its prior state so undo_last_write can reverse it; this prevents retry duplicates and keeps assistant changes reversible.
- Assistant-planned workouts live in planned_workouts and start through the Train screen card, which stores the draft saveId as workout_id; completion is detected when a workouts row with that id exists.
