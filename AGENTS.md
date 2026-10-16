# Project rules

- Treat a saved positive workout duration as active minutes when computing net activity; it is authoritative after manual correction and must not have stored pauses subtracted again.
- Show the stored workout energy estimate in History and workout details, while daily totals recompute with the shared energy model; this keeps individual records visible without double-counting their linked burn entries.
- Keep password recovery on its own public route and exempt it from signed-in redirects, so recovery sessions can set a new password before reaching the dashboard.
- Keep unfinished workouts in an immediate device draft and a user-owned account snapshot; reconcile conflicts explicitly and close snapshots after finish or discard so late writes cannot resurrect them.
- CSV portability uses one table-scoped schema and explicit reference ordering, excluding credentials, service logs and active session/recovery state; this preserves field types without reviving closed workouts.
- Workout activity identity is the owner plus workout ID, not the calendar date; update the existing linked activity and validate duration at storage boundaries to prevent duplicate burns and stale-draft inflation.
