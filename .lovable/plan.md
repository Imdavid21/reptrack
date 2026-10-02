# Recommended next feature: Workout recovery across devices

Make an unfinished workout recoverable even when the original tab closes or the device changes. This addresses the biggest remaining risk in the core training flow without adding another daily metric or check-in.

## What you get

- While you log sets, the app keeps the fast on-device draft and also saves a private recovery copy to your account when connected.
- On Today and Train, a single **Resume workout** action opens the newest recoverable session, showing its last saved time and whether it is saved on this device only or synced to your account.
- If the two copies differ, offer a clear choice rather than silently replacing completed sets. Never turn an unfinished session into a completed workout automatically.
- Finishing or explicitly discarding a workout removes its recovery copy only after the action succeeds. If finishing fails, the sets remain available for retry.
- Offline logging continues locally and syncs the recovery copy when connection returns.

## Technical approach

1. Verify the existing live-session table's ownership policy, permissions, and current consumers before using it for recovery. If its current shape cannot safely hold the full draft, add only the necessary user-owned snapshot fields or a dedicated recovery table with explicit grants and row-level security.
2. Share one versioned draft snapshot across the current Train and older workout-logging flows, including set progress, exercise position, intended date, stable save ID, and timing/pause state. Keep existing local drafts compatible.
3. Reconcile local and account copies by verified owner, stable session ID, and last successful save; guard against stale writes, duplicate finished workouts, and simultaneous tabs. Treat account sync errors as visible but never block local logging.
4. Add the recovery status and conflict choice to existing resume entry points, then test refresh, app closure, offline/reconnect, another device, backdated sessions, failed finish/retry, and explicit discard.

This is the first feature I recommend. It does not add new charts, coaching prompts, or extra logging steps.
