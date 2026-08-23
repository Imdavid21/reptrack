# RepTrack full-app overhaul: current-state audit

Date: 2026-08-23
Branch baseline: `main` at `2de08c2da73909faf83c56b6c028172e12736a61`
Constraint: **zero database/schema changes**. Existing stored data remains authoritative.

## Product inventory and decisions

| Current element | Keep | Improve | Move | Merge | Hide | Remove | Reason |
|---|---:|---:|---:|---:|---:|---:|---|
| `/app` Today/Dashboard | ✓ | ✓ |  |  |  |  | Correct daily entry point, but information hierarchy still splits the day into independent surfaces. |
| Resume session hero | ✓ | ✓ |  | ✓ |  |  | Correct concept; becomes the highest-priority Today state and must restore exact workout context. |
| Next workout card | ✓ | ✓ |  | ✓ |  |  | Strong autopilot primitive. Remove decorative entrance motion and expose one dominant start action. |
| Dashboard date control | ✓ | ✓ |  |  |  |  | Preserve backdating, but compact it into the Today header. |
| Weekly adaptive check-in | ✓ | ✓ | ✓ |  |  |  | Useful secondary workflow; move out of the permanent header and surface contextually. |
| Bodyweight log | ✓ | ✓ |  |  |  |  | Already direct and schema-safe. Keep hundredth precision, last value, sheet workflow. |
| Sleep log | ✓ | ✓ |  |  |  |  | Already direct and schema-safe; missing must stay distinct from zero. |
| Water quick-add | ✓ | ✓ |  |  |  |  | Correct high-frequency interaction. Remove unnecessary confirmation/toast behavior. |
| Nutrition card | ✓ | ✓ |  | ✓ |  |  | Powerful but too dashboard-like. Today should surface calories + protein first, deeper detail on demand. |
| Food photo/text/manual | ✓ | ✓ |  | ✓ |  |  | Keep one intent-first entry point: what was eaten, then input method. |
| Activity logger | ✓ | ✓ |  | ✓ |  |  | Keep direct row and short sheet; remove generic “More logs” mental model. |
| `/app/log` adaptive workout | ✓ | ✓ | ✓ |  |  |  | Core product. Conceptually becomes `/app/train`; legacy route redirects. |
| Workout picker | ✓ | ✓ |  |  | ✓ |  | Escape hatch only. Normal flow should use the next session automatically. |
| Readiness questionnaire | ✓ | ✓ |  |  | ✓ |  | Keep adaptive logic; collapse the normal-day questionnaire behind one “Feeling rough?” branch. |
| Warm-up/preparation | ✓ | ✓ |  |  |  |  | Preserve useful programming; auto-select sensible defaults and allow Skip/Edit. |
| Active set logger | ✓ | ✓ |  |  |  |  | Highest-priority interaction. Existing direct set model is strong but needs clearer Previous/Target/Actual hierarchy and larger controls. |
| Exercise progress strip | ✓ | ✓ |  |  |  |  | Keep orientation, simplify visual noise. |
| Exercise variation switch | ✓ | ✓ |  |  |  |  | Preserve; align with new variation/alternative/PR-transfer model. |
| Exercise replacement | ✓ | ✓ |  |  |  |  | Preserve as escape hatch. Search/ranking should be predictable and family-aware. |
| Rest timer | ✓ | ✓ |  |  |  |  | Keep wall-clock anchoring; make it persistent, inline, compact, and non-blocking. |
| Add set | ✓ | ✓ |  |  |  |  | Existing inheritance behavior is correct and should remain. |
| Skip set/exercise | ✓ | ✓ |  |  |  |  | Keep available but visually secondary. |
| Workout draft restoration | ✓ | ✓ |  |  |  |  | Core reliability feature. Preserve exact exercise/set context. |
| Workout finish | ✓ | ✓ |  |  |  |  | Keep supported semantics but demote during active work and protect incomplete termination. |
| Cooldown | ✓ | ✓ |  |  |  |  | Preserve as optional post-workout action, never a completion gate. |
| Post-workout feedback | ✓ | ✓ |  |  | ✓ |  | Existing adaptive inputs may remain, but only ask when the answer changes future decisions. |
| Workout completion | ✓ | ✓ |  |  |  |  | Focus on duration, working sets, progression, PRs, next session. |
| `/app/history` | ✓ | ✓ | ✓ | ✓ |  |  | History becomes a subview of Progress. Keep deep links and detail editing. |
| `/app/insights` | ✓ | ✓ | ✓ | ✓ |  |  | Merge into Progress; no separate “which analytics destination?” decision. |
| `/app/dataroom` | ✓ |  | ✓ |  | ✓ |  | Preserve specialist analysis under Progress/Advanced, not primary navigation. |
| Workout detail | ✓ | ✓ | ✓ |  |  |  | Retrospective analysis belongs under Progress. |
| Exercise progression charts | ✓ | ✓ | ✓ |  |  |  | Keep deeper; Progress home begins with interpretation, not charts. |
| Sankey volume view | ✓ |  | ✓ |  | ✓ |  | Useful exploratory view, not the default training-distribution answer. |
| Body score / opaque composite surfaces |  | ✓ | ✓ |  | ✓ |  | Demote unless every input and interpretation is inspectable and defensible. |
| Correlation/ML insight surfaces | ✓ | ✓ | ✓ |  |  |  | Keep as evidence-backed observations, always expose sample size and avoid causal language. |
| Settings | ✓ | ✓ | ✓ |  |  |  | Remove from primary nav. Native-style grouped administration behind top-right control. |
| Account/profile | ✓ | ✓ |  |  |  |  | Preserve current fields and writes. |
| Goals/preferences | ✓ | ✓ |  |  |  |  | Preserve existing persistent settings only. |
| MCP status/integration | ✓ |  | ✓ |  | ✓ |  | Advanced/integrations only. Not a normal product destination. |
| Lifecycle tracker | ✓ |  | ✓ |  | ✓ |  | Preserve diagnostic utility under Advanced. |
| Service-worker force update | ✓ |  | ✓ |  | ✓ |  | Diagnostic/admin action, never normal settings. |
| Data export/import | ✓ | ✓ |  |  |  |  | Keep under Health & data. |
| Offline banner | ✓ | ✓ |  |  |  |  | Preserve global connectivity truth without blocking normal actions. |
| PWA update prompt | ✓ | ✓ |  |  |  |  | Must never threaten an active draft. |
| Onboarding | ✓ | ✓ |  |  |  |  | Preserve existing users/routines. New-user flow remains schema-compatible. |
| Public landing/changelog/privacy | ✓ |  |  |  |  |  | Preserve public routes; do not surface them inside daily authenticated navigation. |

## Interaction debt found in current implementation

1. Bottom navigation still exposes four peers: Today, Train, History, Trends. History and Trends are one user question and should become Progress.
2. Today already has direct weight/sleep/water actions, but nutrition and activity are still separate card-like surfaces rather than one daily-state concept.
3. The next-workout card uses decorative page-entry motion and a card-first layout rather than a state-first hero.
4. Settings remains card/accordion heavy and mixes account, preferences, maintenance-calorie configuration, integration, and engineering/diagnostic concepts.
5. Active workout already has strong local-state primitives, prior history, PR context, wall-clock rest timing, add-set inheritance, and draft restoration. The overhaul should not replace these with a second logger.
6. Active set controls rely heavily on horizontally scrolling chips. They are usable, but the primary “what do I log now?” action can be more direct and more thumb-stable.
7. Rest timer is correctly wall-clock anchored but lives inside the current set card and loses visual continuity when the card/context changes.
8. Current Progress/Insights begins with multiple cards/charts and exposes advanced analytics too early.
9. Loading and empty-state semantics differ by page; missing data must never be rendered as an actual zero.
10. Existing exercise/PR architecture now distinguishes identity, family, variation, alternative, and PR transfer. The new UI must preserve that distinction.

## State ownership audit

- **Persisted truth:** Supabase workout, exercise, meal, daily metric, water, activity/calorie burn, preference, training-state, goal history, and existing related tables/fields.
- **Active workout local state:** current session key, exercise/set index, draft workout, elapsed/pause state, unsaved set inputs.
- **Derived state:** next session, calorie/energy calculations, moving weight trend, volume, e1RM, PR comparisons, training distribution, period summaries.
- **Ephemeral UI:** open sheets/dialogs, active filters, expanded sections, transient progress detail.
- **Device preference:** safe non-critical presentation controls only, e.g. last Progress range, keep-awake, local timer sound/haptic, collapsed-completed preference.

No fitness-history persistence will be moved into localStorage. No new database field/table/schema is introduced by the overhaul.
