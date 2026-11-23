# Roadmap

- [x] Fix: workouts can't be started (regression after separator/stub cleanup)
- [x] Redesign /app/dataroom/activity per selected "Performance insight dashboard" direction (dark theme, pastel accents)
- [x] Reduce loading-screen time (user: loading page adds extra time and hampers experience)
- [x] Correct October 1 Pull A duration/burn only and verify Today, Activity, History, and stored values
- [x] Finish email/password sign-in and recovery flow; confirm the dashboard redirect with a signed-in session
- [x] Recover unfinished workouts from the account across devices, with local fallback and conflict choice

- [x] Verify CSV export/import end to end with the live testing account, including mappings and duplicate prevention
- [x] Remove only the October 12 duplicate, audit activities, prevent repeat workout burns, validate duration, and verify dashboard consistency
- [x] Stop repeated account/device recovery prompts during ongoing workouts and test sign-in refreshes
- [x] Prepare Vercel build, output, and SPA route fallback settings
- [ ] Connect the GitHub repository to the user's Vercel account, set build-time backend values, add the deployed domain to the auth redirect allowlist, and verify a signed-in deployment (requires user account setup)
- [x] MCP v2: workout context, planned workouts with Start in app, day summary, deletes + undo, idempotency, typed errors
- [ ] Publish so the hosted assistant connection serves MCP v2 (waiting on user)
