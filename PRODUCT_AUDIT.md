# Reptrack / HEALTH-OS — Principal-Level Product & Engineering Audit

**Date:** 2026-06-12
**Scope:** Full codebase review — `src/` (14 pages, 27 hooks, ~80 components, 17 lib modules), `supabase/` (5 edge functions, 29 migrations), build/PWA/native config.
**Method:** Direct code reading + four parallel deep-dive sub-audits (hooks, pages/flows, dashboard/health/analytics, schema/security/config) + toolchain runs (`tsc`, `vitest`, `eslint`).
**Posture:** Adversarial. Every claim below is anchored to a file. Findings I verified by reading the code are marked **[verified]**; findings surfaced by analysis that need a runtime/live-DB confirmation are marked **[confirm]**.

---

## 1. Executive Summary

This is a genuinely capable solo-built fitness PWA — set-by-set logging, AI food analysis, AI routine generation, offline draft persistence, an analytics suite, and a Capacitor native shell. The architecture instincts are good (React Query, RLS on every table, IndexedDB offline queue, multi-layer draft flush). **The problem is not ambition; it's correctness and trust.** The app makes promises in its README, Privacy Policy, and UI that the code does not keep, and several of those gaps are severe.

**The five things that matter most right now:**

1. **New-user signup is broken by migration history.** [verified] The `api_keys` table was dropped 2026-06-10 with `DROP TABLE … CASCADE`, but the `on_auth_user_created_generate_api_key` trigger on `auth.users` and its function were never dropped. Postgres does not track table references inside `plpgsql` bodies, so the trigger still fires on every signup and inserts into a table that no longer exists → the signup transaction fails. This is a company-ending bug if it is live in production. **Verify against the live DB immediately.**

2. **Cross-user health-data leak via a misnamed RLS policy.** [verified] `morning_checkins` has both an owner `SELECT` policy and a second policy literally named "Deny anonymous access" defined as `USING (auth.uid() IS NOT NULL)`. Postgres combines permissive policies with **OR**, so the net effect is "any logged-in user can read any other user's morning check-ins" (sleep, energy, notes). The name says deny; the SQL grants. Same pattern was on `api_keys`.

3. **Every user's meal photos are on the public internet.** [verified] The `meal-photos` bucket is created `public = true` and carries a policy `"Meal photos are publicly accessible" … USING (bucket_id = 'meal-photos')` with no ownership check. Anyone with (or guessing) a URL — `userId/timestamp-name` — can read anyone's food photos. Food photos can contain faces, homes, and EXIF GPS.

4. **The timezone foundation is wrong.** [verified] Core write paths build date keys with `new Date().toISOString().split('T')[0]`, which is **UTC**, while read/aggregation paths use local-time helpers. A user in the Americas logging an evening workout records it on *tomorrow's* date. This silently corrupts streaks, "today" views, and every date-bucketed chart for the majority of the planet. It is the single most pervasive data-quality bug in the app.

5. **Documented rate limits don't exist, and the AI endpoints are uncapped cost.** [verified] The README advertises per-endpoint limits ("ai-coach 10/min", etc.). No edge function implements any rate limiting. `analyze-food` calls `gpt-4o` (not the documented `gpt-4o-mini`) with `detail: "high"` images. A logged-in user (or a leaked anon JWT) can run your OpenAI bill to the ceiling.

**Scorecard headline:** strong product surface, **unsafe data layer**, **untrustworthy metrics**, **near-zero test coverage** (1 test file), and **trust-damaging marketing** (fake "live" activity ticker, promises of account deletion that isn't implemented). Fix the data layer and the honesty gaps before adding a single feature.

---

## 2. Product Scorecard

| Dimension | Grade | One-line justification |
|---|---|---|
| Product vision / problem fit | **B** | Real, daily, painful problem (training + nutrition + recovery in one place). Crowded category; differentiation is thin. |
| Core loop (log a workout) | **B+** | The set-by-set flow with draft recovery is the best part of the app. |
| Data correctness | **D** | UTC date bug, average-of-averages charts, axis truncation, range-parse truncation. |
| Security & privacy | **D-** | Public meal photos, cross-user check-in reads, anon email enumeration, no CSP, broken-signup migration. |
| Reliability / offline | **C+** | Good IndexedDB queue, but duplicate-submit race and "saved offline" optimism. |
| Accessibility | **D** | Icon-only buttons without labels, sub-44px targets, `window.confirm`, contrast gaps, no reduced-motion. |
| Analytics integrity | **D+** | Misleading aggregates; ML "insights" with no sample-size floor. |
| Trust / honesty | **D** | Fake live ticker, README/Privacy claims not backed by code. |
| Testing & types | **D** | `strict: false`, `strictNullChecks: false`, 102 ESLint errors, 1 test file. |
| Native / PWA craft | **B-** | Solid PWA setup; manifest ships one icon at wrong declared sizes; API responses cached 7 days. |

---

## 3. UX Audit (by screen, highest-signal issues)

**Workout logging (`LogWorkout.tsx` + `SetBySetCard`, `ExerciseReview`, `RestTimer`, `WorkoutTimer`)** — the crown jewel, with sharp edges:
- **`window.confirm()` to discard completed sets** on exercise swap (`LogWorkout.tsx:378`). Not accessible, not themeable, easy to mis-tap on mobile. Replace with the existing `AlertDialog`. **[verified]**
- **"Saved offline — will sync" toast fires before any persistence is confirmed** (`LogWorkout.tsx:461`). If the offline enqueue itself throws, the user is told their workout is safe when it isn't. **[verified]**
- **Double-submit guard is logic-only** (`if (isCreating) return`, `:438`) — the Finish button is not visually disabled, so on a slow network users tap repeatedly. **[verified]**
- Rest/Workout timers correctly anchor to wall-clock and recompute on `visibilitychange` — **done well.** **[verified]**

**Onboarding (`OnboardingFlow.tsx`)** — defaults are thoughtful (Mifflin-St Jeor calorie estimate, water from bodyweight), but steps can be advanced with empty critical fields, so a user can finish onboarding with no bodyweight and silently inherit a generic 2000 kcal / 3 L target. **[confirm]**

**Settings (`Settings.tsx`, `DataManagementSection.tsx`)** — CSV export/import exists (good, portability-friendly), but **there is no account-deletion control anywhere in the app**, while `Privacy.tsx:83` explicitly promises "You can delete your account and all associated data." That is a written GDPR/CCPA commitment with no implementation. **[verified]**

**Cross-cutting:** no React error boundary (a single render throw white-screens the app); inconsistent empty/loading states (History shows "No workouts yet" during load); no `prefers-reduced-motion` handling on landing/Feature animations.

---

## 4. Engineering Audit

**Mobile / rendering**
- `useWaterLogs` recreates `todayStart`/`todayEnd` (`toISOString()`) on **every render**, puts `todayStart` in the React Query key, and lists it in a realtime-subscription `useEffect` dependency array (`useWaterLogs.ts:19-23,82`). Result: the query key changes constantly (refetch pressure) and the realtime channel is torn down and re-subscribed repeatedly — battery and socket churn. **[verified]**
- Several hooks (`useExerciseSets`, others) set no `staleTime`, so revisiting History/Insights refetches expensive joins on every mount. **[verified]**

**Backend / data**
- Unbounded `select()` calls (`useCalorieHistory`, `useDailyMetrics` with `1900-01-01`→`2100-01-01` fallbacks) rely on PostgREST's implicit 1000-row cap; power users silently lose history with no error. **[verified]**
- `createWorkout` writes workout → exercises → habits → calorie_burns as **four separate non-transactional statements** (`useWorkouts.ts:146-182`). A failure after the first insert leaves a workout with no sets. There is no DB function wrapping these in one transaction. **[verified]**

**Offline sync (`useOfflineSync` + `offlineSyncQueue`)** — the durable IndexedDB queue with grouped, ordered replay is the right design. But:
- The online-recovery `useEffect` depends on `[isOnline, pendingCount, processQueue]`; `processQueue`'s identity changes via `refreshCount`, opening a window where two `processQueue` runs both observe `syncingRef.current === false` and replay the same items → **duplicate inserts** on a flaky connection. Use a real mutex/promise lock. **[verified]**
- Offline workouts are enqueued with a client `crypto.randomUUID()` as the row id but **no `user_id` is attached for `exercises`/`habits`** beyond the temp `workout_id`; replay depends entirely on RLS accepting whatever the payload carries. Worth a replay-path integration test. **[confirm]**

**Type safety** — `tsconfig.app.json` has `strict: false` and `noImplicitAny: false`; `tsconfig.json` sets `strictNullChecks: false`. This is *why* the null/`NaN` bugs below exist at all — the compiler is configured not to catch them. ESLint reports **102 errors / 15 warnings**, almost all `no-explicit-any`. **[verified]**

---

## 5. Security Audit

| # | Finding | Sev | Evidence |
|---|---|---|---|
| S1 | Signup-breaking orphaned trigger after `api_keys` drop | **P0** | `…20260610172910….sql:1` drops table; trigger from `…20260127181737….sql:62` + function never dropped. **[verified]** |
| S2 | `morning_checkins` readable by *any* authenticated user (OR'd "Deny anonymous" policy) | **P0** | `…20260206160000_security_and_cleanup.sql:6-10`. **[verified]** |
| S3 | `meal-photos` bucket public + blanket public-read policy | **P0** | `…20260125123057….sql:113-118`. **[verified]** |
| S4 | No server-side rate limiting on any AI edge function; `analyze-food` uses costly `gpt-4o`/`detail:high` | **P1** | All 5 functions read; none implement a limiter. README claims limits that don't exist. **[verified]** |
| S5 | Account/email **enumeration** via `check_email_exists` RPC granted to `anon` | **P1** | `…20260207074156….sql:19` `GRANT … TO anon`; called pre-auth in `Auth.tsx:94`. **[verified]** |
| S6 | UPDATE policies lack `WITH CHECK` → a crafted update can reassign `user_id` to another user | **P1** | e.g. `…20260108080024….sql:54` (`FOR UPDATE USING` only, no `WITH CHECK`). **[verified]** |
| S7 | No CSP / X-Frame-Options / X-Content-Type-Options; `Access-Control-Allow-Origin: *` on all functions | **P1** | `index.html` (no meta), every edge function `getCorsHeaders()`. **[verified]** |
| S8 | Prompt-injection surface: user `context` string concatenated into `analyze-food` system prompt | **P2** | `analyze-food/index.ts:43`. Low blast radius (affects own analysis), but unbounded. **[verified]** |
| S9 | API-response Service Worker cache (`NetworkFirst`, 7-day) can serve another device's stale data after logout if SW cache isn't cleared | **P2** | `vite.config.ts:27-40`. **[verified]** |
| S10 | Numeric columns (`calories`, `pullups`, weights, `sleep_hours`) lack `CHECK (>= 0)` | **P2** | initial schema + metric migrations. **[verified]** |

**Threat model in one line:** the most valuable assets here are health data (sleep, weight, glucose, BP, food photos) and an OpenAI billing key. S2/S3 expose the former across the user base; S4 exposes the latter to cost abuse. Both are reachable today.

---

## 6. Accessibility Audit (WCAG 2.2 AA — currently failing)

- **Icon-only controls without `aria-label`**: `BottomNav` actions, set-card prev/next/skip/add, header buttons. Screen readers announce "button." **[verified for BottomNav/SetBySetCard via sub-audit]**
- **Touch targets < 44×44 px** on set-card and review controls (Apple HIG / WCAG 2.5.5). **[confirm]**
- **`window.confirm`** for a destructive action is non-AT-friendly. **[verified]**
- **Contrast**: chart axis labels rendered at ~50% opacity fall below 4.5:1 in light mode. **[confirm]**
- **No `prefers-reduced-motion`** gate on auto-advancing landing carousel and Framer animations. **[verified]**
- **Theme FOUC**: theme class applied in `useEffect`, not pre-paint, so dark-mode users get a white flash on load (`ThemeContext.tsx`). **[verified]**

Estimated automated-axe pass rate today: **~55-65%**. None of these are hard fixes; they're discipline.

---

## 7. Analytics Audit (the metrics quietly lie)

- **Efficiency = average of per-workout (volume/duration)** instead of `Σvolume / Σduration` (`EfficiencyChart.tsx`). Mixing a 50-min and a 100-min session overstates efficiency by up to ~50%. **[confirm]**
- **Y-axis truncation** on weight/vitals (`DailyVitalsChart.tsx` dynamic `padding`) turns a 2 kg drift into a dramatic cliff — manufactured anxiety. **[confirm]**
- **Hydration chart hard-codes `domain={[0,5]}`** so anyone drinking >5 L is clipped off-chart with no indication. **[confirm]**
- **Averages exclude missing days** rather than surfacing logging frequency, so a 2-day-out-of-30 logger looks "consistent." **[confirm]**
- **Range reps parsed with `parseInt("10-12") → 10`** across PR dedupe and volume math (`usePersonalRecords`, `useCorrelationAnalysis`) → systematic volume undercount and wrong PR comparisons. **[verified]**
- **ML/correlation features have no minimum-sample-size floor** — "insights" generate from 1-2 days of data, producing pseudo-statistics that flip when more data arrives. **[confirm]**

**Missing instrumentation:** there is essentially no product analytics (funnel events for install→signup→activation→habit→retention). You cannot diagnose churn you cannot see.

---

## 8. Behavioral Audit

What works: the streak/progress header, PR auto-detection, and draft "resume" create a real completion loop. What's missing or risky:
- **Streak math sits on the broken UTC date key** — a correct streak engine on wrong dates still mis-counts. Fix dates first.
- **No recovery/forgiveness loop** — a single missed day visibly breaks the streak with no "freeze"/grace mechanic, which research (and Duolingo's own data) shows drives rage-churn.
- **No trigger layer** — no push notifications, no reminders, so the app relies on the user *remembering* to open it. The product is named "reps-and-reminders" but ships no reminders.
- **Anxiety risk** from the truncated-axis charts (Section 7) — the visuals exaggerate normal fluctuation.

---

## 9. Competitive Benchmark

| App | Their moat | Where this app stands |
|---|---|---|
| **Strong / Hevy** | Frictionless set logging, massive exercise DB, social feed | Logging is competitive; exercise DB and community are not |
| **Fitbod** | Adaptive next-workout recommendations from your history | You have the data (`exercise_sets`, `last-used`) but only static templates + a one-shot AI generator |
| **MyFitnessPal** | Barcode + huge verified food DB | You have AI photo/text estimation (nice) but no verified DB or barcode; accuracy unbounded |
| **Whoop / Oura** | Recovery, HRV, strain, wearable-native | You have `recovery_metrics`/`deload_weeks` tables but no wearable ingestion |
| **Apple Fitness+ / Nike** | Content + ecosystem | Not a content play; shouldn't try to be |

**Category today:** a workout logger with nutrition and analytics bolted on.
**Category it should own:** the *adaptive* layer — "tell me what to do next and why," computed from my own logged history. That's the one thing the incumbents do worst and you're closest to.

---

## 10. Current Product Weaknesses (ranked)

1. Data-layer safety (S1-S3) — existential.
2. Timezone correctness — corrupts everything date-shaped.
3. Metric integrity — erodes the core value prop (trustworthy progress).
4. Trust/honesty gaps — fake live ticker, undelivered deletion promise, doc drift.
5. No test net + `strict: false` — every fix risks a regression you won't catch.
6. No reminder/notification layer — the retention engine is absent.
7. Accessibility — closes the door on a meaningful user segment and app-store features.

---

## 11. Future Market Requirements (2026-2030)

- **Now (table stakes):** wearable import (Apple Health / Health Connect), barcode nutrition, reliable reminders, trustworthy charts, account deletion.
- **12 months:** adaptive next-session recommendations, auto-progression, recovery-aware deloads, natural-language logging ("did 5×5 at 100"), conversational coach with memory.
- **3-5 years:** continuous signals (CGM, HRV, sleep stages) fused into daily readiness; voice-first logging (smart glasses/earbuds); agentic coach that plans the week and renegotiates when life happens. The product becomes an **adaptive fitness OS**, not a form you fill in.

---

## 12. AI Opportunities (impact × feasibility)

| Opportunity | Impact | Effort | Risk | Priority |
|---|---|---|---|---|
| Adaptive next-workout from `exercise_sets` history (auto weight/rep progression) | High | Med | Low | **P0 of AI** |
| Natural-language set logging ("bench 5×5 @ 100") | High | Low | Low | **P0 of AI** |
| Churn prediction from logging cadence → trigger a win-back nudge | High | Med | Med | P1 |
| Recovery-aware load management (use `recovery_metrics`/`deload_weeks` that already exist) | Med | Med | Med | P1 |
| Verified-DB-backed nutrition (AI estimate → reconcile against a food DB + confidence floor) | High | High | Med | P1 |
| Coach with longitudinal memory (RAG over the user's own data, already exposed via the MCP idea) | Med | Med | Med | P2 |

Guardrails: every AI number needs a visible confidence and an easy manual override; never let `analyze-food` write a meal without a user confirm step (it already does — keep it); add the rate limiting in S4 before scaling any of this.

---

## 13. Full Product Redesign (first principles)

**Onboarding** — 4 screens, each with one decision and a sensible default: goal → experience → schedule/equipment → bodyweight+units (required, because every downstream calc needs it). End on a *generated first workout*, not a dashboard, so activation = "I did a set," not "I saw a chart."

**Home** — a single "Today" answer: the recommended next session (adaptive), a one-tap "Start," and three honest rings (move/fuel/recover). Demote vanity charts.

**Workout** — keep the set-by-set flow (it's good). Add: NL quick-log, inline (not modal) plate math, a visible disabled state on Finish, an `AlertDialog` for destructive swaps, and a real "rest done" notification.

**Nutrition** — AI photo/text estimate → **confidence-gated** confirm → reconcile against a food DB + barcode. Strip EXIF on upload. Make the bucket private with signed URLs.

**Progress** — truthful axes (zero-based or clearly annotated), frequency shown alongside averages, and "you have N days of data" sample-size labels on every insight.

**Coach** — conversational, remembers history, explains *why* ("you hit top of your rep range twice, +2.5 kg next time"). This is the differentiator.

**Subscription** — gate the *adaptive/AI* layer, never the logging. Free: unlimited logging + basic charts. Paid: adaptive programming, AI coach, wearable sync, advanced analytics.

---

## 14. New Information Architecture

```
Today (home: next session, rings, resume)
Train  → start / history / programs (adaptive)
Fuel   → log (photo/text/barcode/manual) / day / trends
Body   → weight, sleep, recovery, vitals
Coach  → conversational AI + insight feed (sample-size gated)
You    → goals, units, wearables, data export, DELETE ACCOUNT, privacy
```
Five tabs, each answering one question. "Insights" stops being a dumping ground and becomes the Coach feed.

---

## 15. New User Flows (the two that matter)

**Activation:** install → 4-screen onboarding → *generated first workout* → log one set (activation event) → finish → "resume tomorrow" reminder opt-in.

**Habit:** reminder fires → one tap → Today shows the next session pre-filled from history → log → streak with a monthly "freeze" so one slip doesn't nuke months of momentum.

---

## 16. New Screens (net-new)

Account Deletion (with export-then-delete), Wearable Connect (Apple Health / Health Connect), Barcode Scanner, Coach Chat, Reminder/Notification settings, Readiness/Recovery detail.

---

## 17. Wireframe Descriptions (Today screen)

Top: greeting + streak chip (with freeze indicator). Hero card: "Next: Push A — 6 exercises, ~52 min," primary **Start** button, secondary "Swap day." Below: three rings (Move/Fuel/Recover) each tappable to its tab. Then a single Coach insight ("Bench is stalling 3 sessions — try a deload") with a "why" disclosure. No truncated charts above the fold. Bottom: 5-tab nav with labeled, 44px, `aria-current` items.

---

## 18. Technical Architecture Recommendations

1. **Wrap multi-table writes in Postgres functions** (`create_workout_with_sets(...)`) called via RPC, so workout+sets+habits+burn are atomic. Kills the partial-write class of bugs.
2. **One date utility, used everywhere**: `localDateKey(date)` via `date-fns` `format(d,'yyyy-MM-dd')`; ban `toISOString().split('T')[0]` with an ESLint rule.
3. **Turn on `strict` + `strictNullChecks`**, fix the fallout, and make CI fail on ESLint errors. This is the highest-leverage reliability investment.
4. **Make `meal-photos` private**; serve via signed URLs; strip EXIF client-side before upload.
5. **Add `WITH CHECK (auth.uid() = user_id)` to every UPDATE policy**; delete the "Deny anonymous access" OR-policies and replace with correct owner-only ones; add `CHECK (… >= 0)` constraints.
6. **Real rate limiting** on edge functions (per-user token bucket in Postgres or Upstash); switch `analyze-food` to `gpt-4o-mini` unless accuracy testing justifies the cost.
7. **Service Worker hygiene**: drop API responses from the SW cache (or shorten to minutes) and clear caches on signOut; React Query already covers in-session caching.
8. **Add reminders**: Capacitor Local Notifications now, Web Push later.
9. **Instrument the funnel** (a lightweight analytics lib) so retention is measurable.
10. **Restore or fully remove the API-key/MCP surface** — right now it's half-deleted (table gone, trigger/types linger). Pick one.

---

## 19. Roadmap

**30 days — stop the bleeding (all P0 + top P1):**
- Drop the orphaned signup trigger/function; verify signup on a fresh account. **(S1)**
- Fix `morning_checkins`/any OR'd "Deny anonymous" policies; audit every table for the same pattern. **(S2)**
- Lock down `meal-photos` (private + signed URLs + EXIF strip). **(S3)**
- Replace all UTC date keys with a single local-date utility; add a regression test. **(Timezone)**
- Add rate limiting + downgrade the food model. **(S4)**
- Ship account deletion (export-then-delete) to match the Privacy Policy. **(Legal)**
- Remove or relabel the fake "live" ticker. **(Trust)**

**90 days — trust the numbers:**
- Fix chart aggregation/axis/range-parse bugs; add sample-size labels and an ML data floor.
- Turn on TS strict; gate CI on lint/types/tests; write tests for date utils, calorie math, offline replay, PR dedupe.
- Accessibility pass (labels, 44px, contrast, reduced-motion, AlertDialog, theme FOUC).
- Wrap workout writes in an atomic RPC; fix `useWaterLogs`/`useOfflineSync` races.

**180 days — the adaptive layer:**
- Apple Health / Health Connect import; barcode + verified food DB.
- Adaptive next-workout + auto-progression from history; NL set logging.
- Local notification reminders + streak-freeze loop.

**365 days — the wedge:**
- Conversational coach with longitudinal memory; churn prediction → win-back; recovery-aware deloads; subscription gating the AI/adaptive tier.

---

## 20. Complete Prioritized Fix List

**P0 (data loss / security / legal — do now)**
1. Orphaned signup trigger after `api_keys` drop — breaks all new signups. **[verified]**
2. `morning_checkins` cross-user read via OR'd policy. **[verified]**
3. Public `meal-photos` bucket + blanket read policy. **[verified]**
4. UTC date keys corrupt streaks/today/charts for non-UTC users. **[verified]**
5. Account deletion promised in Privacy Policy but not implemented. **[verified]**

**P1 (major — this quarter)**
6. No rate limiting on AI endpoints; `analyze-food` on `gpt-4o`/high-detail (cost abuse). **[verified]**
7. `check_email_exists` granted to `anon` → enumeration. **[verified]**
8. UPDATE policies missing `WITH CHECK` → `user_id` reassignment. **[verified]**
9. No CSP / security headers; `ACAO: *`. **[verified]**
10. Non-atomic workout write → orphaned workouts on partial failure. **[verified]**
11. Offline-sync duplicate-replay race + over-optimistic "saved offline" toast. **[verified]**
12. `useWaterLogs` render-thrash (query key + realtime re-subscribe). **[verified]**
13. Unbounded `select()` (implicit 1000-row truncation) in history/metrics. **[verified]**
14. Chart correctness: efficiency avg-of-avgs, axis truncation, hydration clip, range-parse undercount. **[verified for range-parse; confirm others]**
15. Fake "live activity" ticker — trust/FTC risk. **[verified]**
16. No route-level auth guard on `/app/*` (logged-out users see shells; RLS protects data, so UX/info-disclosure not breach). **[verified]**
17. `window.confirm` for destructive set-discard. **[verified]**

**P2 (important)**
18. `strict:false` / `strictNullChecks:false`; 102 ESLint errors. **[verified]**
19. Numeric `CHECK (>=0)` constraints missing. **[verified]**
20. SW API cache 7-day staleness + not cleared on logout. **[verified]**
21. Accessibility set (labels/targets/contrast/reduced-motion/theme FOUC). **[verified/confirm]**
22. ML insights lack sample-size floor; "AI" silently falls back to heuristics with no signal to user. **[confirm]**
23. Onboarding lets critical fields stay empty → generic defaults. **[confirm]**
24. EXIF/orientation not handled on meal uploads (rotation + location leak). **[confirm]**
25. README/docs drift (model names, "MCP/API" features partially deleted, claimed rate limits). **[verified]**

**P3 (polish)**
26. `console.log` in production paths (water logs, finish-workout, offline). **[verified]**
27. Manifest ships a single `favicon.png` declared at both 192 and 512 + maskable (icon distortion, failed install criteria). **[verified]**
28. No error boundary (single throw → white screen). **[verified]**
29. History calorie mode + other view prefs don't persist. **[confirm]**
30. Hardcoded magic numbers (water default 3 L, calorie default 2000, MET values in `useWorkouts`/`useCalorieBurn`) should be derived/configurable. **[verified]**

---

### Things genuinely done well (keep these)
- RLS enabled on every table with a correct owner pattern as the baseline. **[verified]**
- API keys were hashed (SHA-256 + prefix + column REVOKE) before the table was removed — good instinct. **[verified]**
- `SECURITY DEFINER` functions pin `search_path` — correct hardening. **[verified]**
- Multi-layer draft persistence (interval + `visibilitychange` + `pagehide` + `beforeunload`) and wall-clock-anchored timers. **[verified]**
- Durable IndexedDB offline queue with grouped, ordered replay. **[verified]**
- `historyCalories` is the one well-tested module (13 passing tests covering negatives/null/zero) — make the rest of the codebase look like this. **[verified]**

---

*Two sub-audit claims were corrected during verification: (a) the repo has exactly **one** test file, not zero (`src/lib/historyCalories.test.ts`); (b) the `morning_checkins` "Deny anonymous" policy is a **real cross-user read**, not a cosmetic smell — Postgres ORs permissive policies, so there is no "owner policy wins" ordering. The signup-trigger P0 should be confirmed against the live database, since migration files don't capture any manual dashboard fixes.*
