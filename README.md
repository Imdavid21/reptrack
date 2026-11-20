# RepTrack

> **App version:** 6.0  
> **MCP server:** 1.3.0  
> **Platform:** React PWA + Capacitor native shell  
> **Production:** https://reptrack.fitness  
> **Source:** https://github.com/Imdavid21/reptrack  
> **Last updated:** 24 August 2026

RepTrack is a personal fitness operating system for training, nutrition, bodyweight, hydration, recovery, energy balance, progress analysis, and external ChatGPT coaching.

The product is built around three questions:

- **Today:** What should I do now?
- **Train:** What is my next set?
- **Dataroom:** Is what I am doing working, why, and what should change?

An optional **Advanced Mode** adds progression automation, training blocks, specialization, deload signals, food and plate utilities, experiments, simulations, coach-event triggers, and deeper MCP evidence without changing the normal logging flow.

---

## Table of contents

1. [Product structure](#product-structure)
2. [Complete feature inventory](#complete-feature-inventory)
3. [Use cases](#use-cases)
4. [Today](#today)
5. [Train](#train)
6. [Dataroom](#dataroom)
7. [Advanced Mode](#advanced-mode)
8. [Nutrition, hydration and energy](#nutrition-hydration-and-energy)
9. [Settings](#settings)
10. [Imports and exports](#imports-and-exports)
11. [ChatGPT and MCP](#chatgpt-and-mcp)
12. [Data and analytical rules](#data-and-analytical-rules)
13. [Session durability and offline behaviour](#session-durability-and-offline-behaviour)
14. [Database](#database)
15. [Architecture and stack](#architecture-and-stack)
16. [Testing and release model](#testing-and-release-model)
17. [Development](#development)

---

## Product structure

### Primary navigation

| Destination | Job |
|---|---|
| **Today** | Daily state, bodyweight, sleep, water, food, deficit/energy, activity, check-ins, and next workout. |
| **Train** | Start or resume a session, log sets quickly, follow targets, use rest timing, and finish safely. |
| **Dataroom** | Understand trends, progression, nutrition, recovery, activity, records, history, and evidence. |

### Secondary surfaces

| Surface | Purpose |
|---|---|
| **Settings** | Profile, goals, nutrition targets, deficit mode, device behaviour, data management, MCP and advanced controls. |
| **Performance Lab** | Advanced Mode home for progression, blocks, cut control, specialization, recovery, experiments, utilities and coach evidence. |
| **Workout detail** | Review or edit a completed workout and its sets. |
| **Timeline** | Chronological cross-domain history. |
| **Exercise detail** | Exercise-level history and progression evidence. |

Legacy Progress, Insights, Analytics and History entry points resolve into the Dataroom hierarchy rather than existing as separate analytical products.

---

# Complete feature inventory

## Training core

| Feature | What it does |
|---|---|
| Adaptive PPL rotation | Push A, Pull A, Legs A, Push B, Pull B, Legs B sequence with persisted next-session state and local fallback. |
| One-tap normal start | Starts the next programmed session without forcing setup screens in normal mode. |
| Exact resume | Returns to the saved workout draft, exercise and set position. |
| Set-by-set logger | Previous, target and actual are visible together with fast weight and rep controls. |
| Previous-load prefill | Uses recent exercise history to reduce typing. |
| Timed and bodyweight exercises | Supports non-load movements without pretending every movement is a weighted lift. |
| Rest timer | Integrated into the session and recovered from wall-clock time after backgrounding. |
| Wake lock | Optional keep-screen-awake behaviour during workouts. |
| Pause and resume | Persists workout state and pause intervals instead of counting all background time as training time. |
| Add/edit/delete sets | Direct manipulation of the actual workout log. |
| Add/edit exercises | Completed sessions and active sessions remain editable. |
| Exercise history sheet | Quick access to previous performance without leaving the session. |
| PR detection | Detects meaningful weight/rep improvements and first logs using exercise-family semantics. |
| Exercise families | Related movement names can share relevant progression and PR context. |
| Workout completion review | Completed session view with previous-session comparison and editable details. |
| Skip session | Records the skip and advances the rotation without fabricating a workout duration. |
| Duplicate-tab protection | Prevents two active browser tabs from silently editing the same live session. |
| Offline workout save | Queues mutations for replay when connectivity returns. |
| Idempotent save | Stable identifiers prevent retry duplication. |

## Daily logging

| Feature | What it does |
|---|---|
| Bodyweight | Direct kg logging from Today. |
| Sleep | Direct sleep-duration logging. |
| Water | Fast hydration logging and daily total. |
| Food | Text-first entry, photo option, manual entry and review-before-save. |
| Activity | Walk, run, cycle and related cardio entries with distance/time and estimated burn where appropriate. |
| Physique check-in | Optional structured check-in without making it part of the required daily flow. |
| Mobility check-in | Optional mobility state capture. |
| Daily state | Today surfaces the current state without turning missing data into zeroes. |

## Energy and fat-loss features

| Feature | What it does |
|---|---|
| Personal Energy Engine | Calculates resting/baseline needs from stored profile and effective bodyweight. |
| Deficit Mode | Reframes the Today calorie experience around the configured deficit target. |
| Manual calorie target | User can override the automatic target; the target becomes explicitly locked. |
| Automatic calorie target | User can return from manual control to automatic calculations. |
| Manual protein target | Same explicit manual/automatic behaviour as calories. |
| Goal history | Changes to tracked goals keep effective dates so historical comparisons do not use today's goal retroactively. |
| Activity burn | Records activity and workout burn separately from intake. |
| Logged-day nutrition averages | Dataroom labels averages as based on logged days rather than claiming complete intake coverage. |

## Analysis and history

| Feature | What it does |
|---|---|
| Bodyweight trend | Raw measurements plus a 7-day trend view. |
| Training frequency | Workouts and training days over the selected range. |
| Set distribution | Factual exposure by muscle/body area. |
| Exercise progression | Session-to-session movement history and progression state. |
| Records | Personal-record review separated from the main analysis feed. |
| Nutrition analysis | Logged calories, protein, macros and target adherence with coverage awareness. |
| Recovery analysis | Sleep and related training/recovery evidence. |
| Activity analysis | Stored cardio/activity totals and duration. |
| Cross-domain timeline | Workouts, body, nutrition, recovery and activity in one history surface. |
| Evidence disclosures | Analytical findings can show signal, evidence, interpretation and confidence. |
| Range control | Shared date-range behaviour across Dataroom surfaces. |

## Platform and reliability

| Feature | What it does |
|---|---|
| PWA | Installable web app with service worker and update flow. |
| Offline queue | IndexedDB mutation queue replays data when connectivity returns. |
| Update protection | PWA update prompts are suppressed while a resumable workout draft is at risk. |
| Safe-area layout | Mobile safe-area handling for modern phones. |
| Reduced motion | Respects reduced-motion preference. |
| Theme | Light/dark appearance. |
| Haptics | Used selectively for workout interactions on supported devices. |
| Auth | Supabase authentication with supported identity providers. |
| Account deletion | User-controlled data deletion flow. |

---

# Use cases

## Fat loss / cutting

RepTrack can be used to:

- log bodyweight and follow the 7-day trend rather than reacting to one weigh-in;
- run Deficit Mode with a chosen daily deficit;
- compare observed weight-loss rate with the configured direction;
- track calories and protein while keeping incomplete food logging explicit;
- combine training, recovery and activity evidence before changing calories;
- use Advanced Cut Control and Goal Runway to see whether the current trajectory is directionally aligned;
- simulate a different calorie deficit before changing the real target;
- export a Coach Report or pull the same evidence through MCP for an external ChatGPT review.

## Hypertrophy and physique development

RepTrack can be used to:

- follow a PPL program and preserve exercise progression history;
- identify exercises that are progressing, stable or regressing;
- view set exposure by muscle group;
- mark up to several specialization areas in Advanced Mode;
- add extra specialization volume at session-planning time while retaining manual override;
- review weak-point evidence with ChatGPT rather than treating set count as a biological score;
- run 6-week training blocks and compare performance across blocks;
- track PRs and exercise trends over time.

## Strength progression

RepTrack can be used to:

- compare latest performance with the previous session;
- use estimated 1RM as an analytical estimate, not as a claimed max;
- receive a deterministic next-load suggestion when evidence supports progression;
- use the Smart Plate Calculator for the current load or historical logged loads;
- configure different gym bars and available plates;
- export exercise evidence to ChatGPT for a deeper progression decision.

## Training when time is limited

Advanced session preflight supports:

- **30 min** compressed sessions;
- **45 min** sessions;
- **Full** programmed sessions;
- a manual `-1 / 0 / +1` set-per-exercise override before starting.

The actual Train screen remains minimal after the plan is chosen.

## Recovery / deload decisions

RepTrack can combine:

- recent sleep;
- readiness data where available;
- exercise regression count;
- recent workout density;

into a deload signal. It is deliberately a review signal rather than an automatic claim that the user is overtrained.

## External ChatGPT coaching

A connected MCP client can:

- read profile, bodyweight, workouts, exercise history, nutrition, sleep and activity;
- read live workout state;
- log or correct meals, workouts and activities;
- log water;
- set in-session workout triggers;
- send a live coach note;
- retrieve progression, Cut Control, weak-point, goal-runway and weekly-review evidence;
- poll RepTrack-generated coach events after a workout.

This lets the app stay compact while more complex interpretation happens in ChatGPT.

## Moving from another workout tracker

Advanced Mode can import workout CSV files from **Strong** and **Hevy**. Sessions already present with the same date/name identity are skipped instead of silently duplicated.

## Sharing with a coach

The Advanced Coach Report exports:

- Markdown for human reading;
- JSON for machine-readable evidence.

It includes training, progression, bodyweight trend, recovery, logged nutrition, active blocks, specialization and experiments.

---

# Today

`/app`

Today is the daily operating surface.

### Daily body state

- bodyweight;
- sleep;
- water;
- physique/mobility check-in entry points;
- missing values remain missing rather than being rendered as successful zeroes.

### Food and energy

The main calorie surface shows:

- food logged today;
- calories;
- protein;
- target state;
- energy breakdown;
- activity contribution;
- deficit-mode framing when enabled.

### Activity

Quick activity logging supports common cardio activities with distance and/or time. Estimated calorie burn is marked as an estimate.

### Next workout

Normal mode provides a direct start button.

With Advanced Mode enabled, the same button becomes **Review & start**, opening a compact session preflight before entering the same minimal workout logger.

### Active workout

A resumable workout takes priority. The resume action returns to the saved session rather than starting a duplicate.

---

# Train

`/app/train`

Train is intentionally narrower than Dataroom or Settings.

### Active-session header

Shows the session, elapsed time, exercise position and session state without turning the page into an analytics dashboard.

### Set logging

For the current set:

- **Previous** shows relevant historical performance;
- **Target** shows the prescription;
- **Actual** is the editable live result.

Weights and reps are designed for quick taps. Bodyweight and timed movements use suitable controls.

### Rest

Rest timing is integrated into the logger. Wall-clock reconstruction keeps the timer correct after backgrounding.

### Editing

The user can still override the plan:

- weight;
- reps;
- exercise ordering/replacement where supported;
- set count;
- completion state.

Advanced Mode changes planning before the session, not the visual density of the live logger.

### Live MCP state

During training, the app can publish the current session state for external MCP clients and evaluate locally stored coach triggers.

---

# Dataroom

`/app/dataroom`

Dataroom is the single analytical layer of RepTrack.

It replaces the old mental model of separate Progress, Insights, Analytics and Data Room pages.

## Dataroom home

The home combines:

1. **Current Read**
2. **What Changed**
3. **What Matters**
4. **Evidence**
5. **Explore**
6. **Timeline**

The product aims to answer the question before asking the user to inspect charts.

## Body

`/app/dataroom/body`

- latest bodyweight;
- raw weight series;
- 7-day trend;
- range change;
- observed direction/rate where data is sufficient;
- no automatic body-fat inference from weight alone.

## Training

`/app/dataroom/training`

- workouts;
- working sets;
- average duration;
- training distribution;
- exercise progression;
- recent sessions;
- deep links to exercise and workout history.

## Exercise

`/app/dataroom/exercise/:exercise`

- historical sessions;
- comparable load/rep evidence;
- estimated strength trend;
- record context;
- exercise-family semantics where appropriate.

## Nutrition

`/app/dataroom/nutrition`

- logged days;
- calories per logged day;
- protein per logged day;
- macros;
- target-hit evidence;
- coverage-aware interpretation.

## Recovery

`/app/dataroom/recovery`

- sleep history;
- recent recovery evidence;
- training/recovery patterns where enough data exists;
- no causal claim merely because two metrics move together.

## Activity

`/app/dataroom/activity`

- logged activities;
- duration;
- distance;
- stored/estimated active calories where available.

## Records

`/app/dataroom/records`

A focused PR surface instead of mixing every record into the Dataroom home.

## Explore

`/app/dataroom/explore`

Deeper analytics and secondary visualisations live here so the main Dataroom remains readable.

## Timeline

`/app/dataroom/timeline`

Chronological history across training, body, nutrition, recovery and activity.

## Workout detail

`/app/dataroom/workout/:workoutId`

Read-first workout review with an explicit edit mode, set-level changes and completion comparison.

---

# Advanced Mode

Advanced Mode is opt-in from **Settings → Advanced Mode**. It is off by default.

When enabled, `/app/lab` becomes available.

## Performance Lab

The Lab is a visual control surface rather than a second dashboard full of prose.

It links to:

- ChatGPT / MCP;
- What-if simulator;
- Food Autopilot;
- Smart Plate Calculator;
- Gym Profiles;
- Flight Recorder;
- Coach Report;
- data import/export.

## Progression Autopilot

For each repeatedly logged exercise it derives:

- latest comparable performance;
- previous comparable performance;
- estimated 1RM change;
- state: `learning`, `progressing`, `stable` or `regressed`;
- a conservative next-load suggestion when progression evidence supports it.

It does not overwrite completed logs.

## Training blocks

Advanced Mode can create named blocks with:

- focus;
- start date;
- end date;
- state: planned, active or completed.

Starting a new active block completes the previous active block rather than allowing multiple conflicting active blocks.

## Cut Control

Cut Control combines observed bodyweight trend with the configured weight goal and deficit context.

It reports states such as:

- learning;
- slow;
- on track;
- fast;
- gaining.

It does not assume incomplete nutrition logs represent complete intake.

## Goal Runway

Goal Runway estimates time to the configured goal only when:

- enough bodyweight evidence exists;
- the observed rate is meaningful;
- the observed direction actually points toward the goal.

Otherwise ETA is intentionally blank.

## Weak-point radar

Shows factual muscle-group set exposure and highlights selected specialization areas.

Set exposure is **not** labelled as a hypertrophy score or biological optimum.

## Specialization Mode

The user can choose priority muscles. The Advanced session planner can add specialization volume while keeping the user in control.

No progress photos are required.

## Deload signal

A deload review can be raised when multiple independent signals stack up, including poor sleep, poor readiness, exercise regressions and unusually dense recent training.

The feature asks for review rather than automatically replacing the training program.

## Recovery pattern

Compares recent sleep with the preceding period and exposes the delta as evidence for the wider decision process.

## Advanced session preflight

`/app/lab/session`

Before a workout the user can choose:

- 30 min;
- 45 min;
- Full.

The planner compresses working volume around the available time and preserves a sensible floor for major movements.

A manual `-1 / 0 / +1` set-per-exercise override remains available.

## Warm-up Autopilot

Builds a short warm-up ramp from the working load, typically around:

- 40%;
- 60%;
- 80%.

The load is informed by logged history when available. Warm-ups remain outside the main working-set logger.

## Exercise purpose

Advanced preflight gives each programmed movement a short reason such as:

- chest compound;
- back volume;
- shoulders priority.

This is intentionally compact.

## Food Autopilot

`/app/lab/food`

Uses the user's own food history to surface:

- frequent foods;
- recurring breakfast/lunch/dinner/snack combinations;
- historical average calories and protein;
- one-tap logging of a reconstructed option.

Autopilot-generated logs are excluded from the learning source so repeated one-tap use does not create a self-reinforcing feedback loop.

No photography is required for this feature.

## Gym Profiles

`/app/lab/gyms`

Stores per-user gym configurations:

- gym name;
- bar weight;
- plate denominations;
- default gym.

Useful when switching between gyms with different bars or plate inventories.

## Smart Plate Calculator

`/app/lab/plates`

Given a total desired load, it calculates plates per side from the selected gym profile.

It also derives plate layouts for historical logged weights at read time, so old workout rows do not need to be rewritten.

## What-if simulator

`/app/lab/simulator`

Lets the user change:

- goal weight;
- daily deficit;

and see a static scenario for:

- calorie target;
- approximate weekly weight rate from the explicit energy assumption;
- approximate time to target.

It is labelled as a scenario, not a prediction.

## Experiments

Advanced Mode can track lightweight experiments with:

- name;
- metric;
- baseline;
- target;
- start/end dates;
- planned/active/completed/cancelled state.

Example uses:

- increase pull-up reps over 6 weeks;
- test a higher sleep target;
- monitor bench performance during a cut;
- compare a specialization block with baseline performance.

## Flight Recorder

`/app/lab/recorder`

Shows recent sessions and coach-event history, including:

- completed set count;
- duration;
- plan-vs-actual changes;
- pain flags when stored;
- completion percentage when available;
- new coach events waiting for external review.

## Session-quality coach events

When Advanced Mode is enabled and a workout completes, RepTrack can enqueue a user-scoped event such as:

- `workout_completed`;
- `session_review_required`.

The payload contains compact session evidence such as planned/completed sets, duration, changed sets and review flags.

These events are exposed through MCP with incremental `after_id` polling for an external ChatGPT workflow.

This is a queue/poll model, not an unsolicited outbound message from the browser.

---

# Nutrition, hydration and energy

## Food logging

Normal food logging supports:

- natural-language description;
- image analysis;
- manual entry;
- review and editing before save;
- calories, protein, carbs, fat and other stored nutrients.

The primary interaction asks **what did you eat?** rather than forcing a logging method first.

## Food estimates

AI-estimated nutrition is presented as an estimate and remains editable before save.

## Water

Hydration is stored as individual events and rolled up to daily totals.

The Settings editor normalises the historically mixed stored water-goal representation into litres for display/editing.

## Personal Energy Engine

Energy calculations use stored profile data, bodyweight and non-exercise lifestyle context.

The engine can operate with date of birth or an age fallback.

Manual targets and automatic targets are explicitly distinguished.

## Deficit Mode

Settings can enable a fixed daily deficit target. Today then foregrounds deficit progress and remaining energy rather than a generic calorie-budget view.

---

# Settings

`/app/settings`

## Account & profile

- name;
- date of birth;
- age fallback;
- height;
- initial measured weight;
- gender input used by the existing energy formula;
- non-exercise lifestyle;
- sign-in email;
- password reset;
- connected sign-in methods;
- sign out.

## Goals

- weight direction: lose, maintain or gain;
- goal weight;
- workouts per week;
- sleep goal;
- calorie target;
- protein target;
- water target.

Changing tracked goals records their effective date in goal history.

## Nutrition target mode

Calorie and protein goals can be manually locked or returned to automatic calculation.

## Training device behaviour

- keep screen awake during workouts.

## Deficit Mode

- on/off;
- 250, 500 or 750 kcal daily deficit presets.

## Advanced Mode

- off by default;
- enables Performance Lab and its advanced surfaces.

## Health & Data

Contains data management plus Advanced exports/imports when Advanced Mode is enabled.

## Advanced Settings

Engineering and maintenance surfaces are intentionally separated from normal Settings, including MCP, lifecycle/PWA/diagnostic-style controls and maintenance tools.

---

# Imports and exports

## RepTrack data management

Existing account data-management tools remain under **Settings → Health & Data**.

## Coach Report export

`/app/settings/data/coach-report`

Available in Advanced Mode.

Formats:

- **Markdown** for human review;
- **JSON** for machine/LLM workflows.

Selectable periods:

- 7 days;
- 30 days;
- 90 days.

Evidence includes training, progression, bodyweight, recovery, logged nutrition, activity, active block, experiments, specialization and gym context.

## Strong / Hevy import

`/app/settings/data/import-workouts`

Advanced Mode accepts CSV exports from Strong and Hevy.

Importer behaviour:

- detects common Strong/Hevy header shapes;
- groups sets into exercises and sessions;
- preserves date, workout name, duration where available, load and reps;
- skips sessions already present with the same date/workout-name identity;
- imports through the normal RepTrack workout creation path so downstream history is available to Dataroom.

---

# ChatGPT and MCP

RepTrack exposes a private Model Context Protocol server for external ChatGPT/MCP clients.

Transport: **Streamable HTTP**  
Authentication: **Supabase OAuth / bearer token**  
Mode: **read/write, scoped to approved fitness operations**

## Read tools

### Core fitness tools

1. `get_fitness_profile`
2. `get_bodyweight_history`
3. `get_workouts`
4. `get_exercise_history`
5. `get_training_summary`
6. `get_nutrition`
7. `get_sleep`
8. `get_activity`
9. `get_progress_summary`
10. `get_recent_fitness_data`
11. `get_live_workout`
12. `list_workout_triggers`

### Advanced Mode evidence tools

13. `get_advanced_snapshot`
14. `get_progression_autopilot`
15. `get_cut_control`
16. `get_weak_point_radar`
17. `get_weekly_coach_review`
18. `get_goal_runway`
19. `get_advanced_config`
20. `list_coach_events`

## Write tools

1. `log_meal`
2. `update_meal`
3. `log_water`
4. `log_workout`
5. `update_workout`
6. `log_activity`
7. `update_activity`
8. `set_workout_trigger`
9. `cancel_workout_trigger`
10. `send_coach_note`

## MCP guardrails

- no generic SQL tool;
- no shell tool;
- no arbitrary URL fetch tool;
- no destructive workout/meal delete tool;
- future-date writes are rejected;
- past-date writes are allowed;
- large responses are capped and marked as truncated instead of failing silently;
- transient database failures retry;
- deterministic failures return stable error categories;
- MCP calls are written to a sanitised audit log;
- Advanced coach events can be polled incrementally using event IDs.

## Live workout triggers

An external coach can arm conditions such as:

| Trigger | Meaning |
|---|---|
| `exercise_started` | Fire when the specified exercise becomes current. |
| `weight_at_least` | Fire when a completed set meets the load threshold. |
| `reps_at_least` | Fire when a completed set meets the rep threshold. |
| `elapsed_minutes` | Fire when session time crosses the threshold. |
| `completed_sets` | Fire when completed set count crosses the threshold. |
| `session_volume` | Fire when session volume crosses the threshold. |

Triggers can be one-time or repeating and can expire.

Evaluation is local during the session after the trigger has been stored, so a pre-armed cue does not need a network round trip at the moment it fires.

---

# Data and analytical rules

RepTrack intentionally distinguishes facts, estimates and interpretation.

## Missing is not zero

An unlogged meal, missing sleep entry or absent bodyweight is not treated as a successful zero-value day.

## Nutrition completeness is unknown unless known

Logged calories are described as logged intake. A day with one logged meal is not automatically treated as complete intake.

## Weight trend before weight noise

The 7-day trend is preferred for bodyweight interpretation while raw values remain visible.

## Estimated 1RM is an estimate

Progression analysis may use the Epley formula as a comparison tool. It is not presented as an observed one-rep max.

## Set exposure is not muscle growth

Muscle-group set distribution describes logged resistance-training exposure. It is not labelled as a hypertrophy score, recovery score or measured optimum.

## Correlation is not causation

Recovery and cross-domain patterns are observational unless the evidence supports a stronger statement.

## Goal ETA is conditional

Goal Runway only returns an ETA when observed movement is meaningful and points toward the goal.

## Simulator is scenario modelling

The What-if tool applies explicit assumptions. It is not a forecast of biological outcome.

## Advanced Mode does not rewrite history

New calculations such as plate layouts and advanced progression states are derived from old logs at read time wherever possible.

---

# Session durability and offline behaviour

| Scenario | Behaviour |
|---|---|
| Navigate away mid-workout | The user can keep going, pause/exit or discard rather than silently losing the session. |
| Resume | Restores draft, exercise index, set index and elapsed-session context. |
| Background app | Draft is persisted and timers recover from wall-clock time. |
| Close tab/app | Draft persistence protects recent work; active-session navigation protection is used where available. |
| Offline | Local draft remains available; supported writes queue for replay. |
| Partial save / retry | Stable IDs make retry idempotent. |
| PWA update during workout | Update prompt is suppressed while a resumable draft could be harmed. |
| Duplicate browser tab | Session lock prevents silent concurrent editing; takeover is explicit. |
| Old draft | Staleness is based on save time rather than the workout's backdated date. |

---

# Database

Postgres data is user-scoped with Row Level Security.

## Core tables

| Table | Purpose |
|---|---|
| `profiles` | Minimal account profile. |
| `user_preferences` | Profile context, goals, targets and mode settings. |
| `workouts` | Workout sessions and session metadata. |
| `exercises` | Exercise-level workout rows. |
| `exercise_sets` | Normalised set-level history. |
| `exercise_templates` | Exercise definitions and user library. |
| `training_state` | Next-session state. |
| `daily_metrics` | Bodyweight, sleep and daily body/recovery data. |
| `meals` | Food and nutrient logs. |
| `water_logs` | Hydration events. |
| `calorie_burns` | Activity/workout burn rows. |
| `energy_model_states` | Point-in-time energy model state. |
| `energy_targets` | Generated energy/protein targets. |
| `goal_history` | Effective-dated tracked goals. |
| `live_workout_sessions` | Current live workout state used by MCP. |
| `workout_triggers` | External coach cues for the active session. |
| `workout_pauses` | Explicit pause intervals. |
| `mcp_audit_logs` | Sanitised MCP execution audit. |
| `readiness_checkins` | Pre-session readiness evidence. |
| `post_workout_checkins` | Post-session state. |
| `physique_checkins` | Optional physique check-ins. |
| `mobility_assessments` | Mobility check-ins. |
| `recovery_metrics` | Recovery evidence where available. |
| `deload_weeks` | Stored deload state/history. |
| `custom_routines` | User-created routines. |
| `adaptive_lifecycles` | Exercise/program lifecycle data. |
| `adaptive_session_logs` | Adaptive session records. |

## Advanced Mode tables

The Advanced Mode migration is additive and does not rewrite existing fitness rows.

| Table | Purpose |
|---|---|
| `advanced_settings` | Opt-in state, specialization muscles and default session-volume modifier. |
| `gym_profiles` | User gym, bar and plate configurations. |
| `training_blocks` | Named training blocks with focus and date range. |
| `training_experiments` | User-defined experiments, metric and target. |
| `coach_events` | User-scoped queue of RepTrack-generated events for external coach review. |

Advanced Mode tests verify that its migration does not drop, truncate, delete from or rewrite existing public tables.

---

# Architecture and stack

## Frontend

- React 18;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Tailwind CSS;
- MUI;
- Framer Motion;
- Recharts and custom SVG visualisations where appropriate.

## Backend

- Supabase/Postgres;
- Row Level Security;
- Supabase Auth;
- Supabase Edge Functions;
- private storage for applicable uploaded assets;
- OAuth-compatible MCP access.

## AI integrations

RepTrack uses AI for selected interpretation/parsing tasks while keeping deterministic fitness calculations separate from generated text.

External ChatGPT is intentionally a major Advanced Mode interface: RepTrack provides structured evidence through MCP, while ChatGPT can perform the larger coaching conversation outside the app.

## Native / installable app

- Progressive Web App;
- service worker;
- offline mutation queue;
- Capacitor shell support.

## Route map

```text
/app
/app/train

/app/dataroom
/app/dataroom/body
/app/dataroom/training
/app/dataroom/exercise/:exercise
/app/dataroom/nutrition
/app/dataroom/recovery
/app/dataroom/activity
/app/dataroom/records
/app/dataroom/explore
/app/dataroom/timeline
/app/dataroom/workout/:workoutId

/app/lab
/app/lab/session
/app/lab/food
/app/lab/plates
/app/lab/simulator
/app/lab/gyms
/app/lab/recorder

/app/settings
/app/settings/account
/app/settings/data
/app/settings/data/coach-report
/app/settings/data/import-workouts
/app/settings/advanced
/app/settings/mcp
/app/settings/advanced/lifecycle
```

Old Progress/Insights/Analytics/History URLs redirect to the relevant Dataroom route for compatibility.

---

# Testing and release model

The repository contains unit/integration coverage for core behaviour including:

- adaptive program logic;
- progression calculations;
- goal runway and scenario calculations;
- meal-history reconstruction;
- Strong/Hevy import parsing;
- MCP permissions and safety;
- payload truncation and retry behaviour;
- Advanced Mode migration additivity;
- workout and Dataroom supporting logic.

Pull requests run frontend quality checks including tests, production build and changed-file linting.

---

# Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

---

## Product principles

RepTrack is designed around a few rules:

- **Autopilot with a log underneath.** The normal action should be fast, but the evidence must remain inspectable.
- **Decision compression.** The app should reduce the number of fitness decisions, not create another dashboard to manage.
- **Facts before interpretation.** Stored values and deterministic calculations are the source of truth.
- **Missing is not zero.** Incomplete data stays incomplete.
- **No fake precision.** Estimated burn, estimated strength, correlations and goal runway are labelled appropriately.
- **History remains editable.** The user can correct what actually happened.
- **Advanced is optional.** The base product stays usable without Performance Lab complexity.
- **ChatGPT is an interface, not the database.** MCP exposes structured evidence and scoped write actions; RepTrack still owns the fitness records.
