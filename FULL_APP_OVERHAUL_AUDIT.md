# RepTrack Full-App Overhaul Audit

Date: 2026-08-23
Scope: authenticated product surfaces, interaction architecture, frontend state, derived analytics, PWA/offline behavior, accessibility, and design system.
Constraint: **zero database/schema changes**.

## Product diagnosis

RepTrack already has most of the difficult underlying capability: durable workout drafts, deterministic workout programming, exercise history, personal records, energy/nutrition logs, bodyweight, sleep, activity, adaptive training logic, offline queueing, PWA update handling, analytics, settings, MCP surfaces, and history editing. The main product debt is that these capabilities are exposed as separate product concepts instead of being compressed into a few decisions.

The overhaul therefore follows one rule: **reuse existing truth, reduce visible administration.**

## Current authenticated IA

| Current element | Decision | Destination / treatment | Reason |
|---|---|---|---|
| Today / Dashboard | Improve | Today | Correct primary destination, but needs stronger state machine and one grouped daily-state surface. |
| Workout landing | Improve | Train | Keep opinionated next-session default; reduce ceremony. |
| Workout selection | Move | Train secondary action | Useful escape hatch, not a primary decision. |
| Readiness | Improve / hide by default | Train exception path | Existing green/yellow/red adaptation is useful; questionnaire should not gate normal training. |
| Warm-up preparation | Improve / hide by default | Train optional warm-up | Existing prep is valuable; default it automatically and make skip/edit secondary. |
| Active training | Major improve | Train / current | Highest-priority surface. Must center current set, previous performance, progress, and timer. |
| Rest timer | Improve | Inline in active training | Existing wall-clock implementation is strong; interaction should be integrated and simpler. |
| Exercise navigation | Improve | Active training | Keep progress/jump controls, reduce chrome, maintain next-exercise orientation. |
| Exercise editing/replacement | Improve | Active training secondary | Existing editor/library retained; variation vs alternative metadata should inform replacement ranking. |
| Workout finish | Improve | Active training endpoint | Preserve partial-session protection; completion should be less bureaucratic. |
| Cooldown | Move / optional | After workout | Never gate completed training. |
| Post-workout questions | Hide unless decision-changing | Completion exception | No survey tax. |
| Insights | Merge | Progress | Analytics are one representation of progress. |
| History | Merge | Progress | Timeline/history are another representation of progress. |
| Workout detail | Keep / improve | Progress detail | Retrospective density is appropriate here. |
| Settings | Move | top-right profile/settings control | Administration is not a primary app destination. |
| Lifecycle tracker | Demote | Settings > Advanced | Implementation/diagnostic concept. |
| MCP status | Demote | Settings > Advanced / Integrations | Useful, but not normal product navigation. |
| Food logging | Improve | Today direct action | User should express food before choosing logging technology. |
| Water | Keep / improve | Today direct row | Existing +250/+500 interaction is the right pattern. |
| Sleep | Keep / improve | Today direct sheet | Existing data supports duration only; do not invent recovery scores. |
| Bodyweight | Keep / improve | Today direct sheet | Existing two-decimal support retained. |
| Activity | Improve | Today direct row/sheet | Remove “More logs” mental model. |
| Weekly check | Demote | Today contextual / Progress review | Show only when useful; not persistent header chrome. |
| Onboarding | Keep / improve | First-run only | Existing data and returning-user bypass preserved. |
| Offline/PWA | Keep / improve | Cross-cutting | Draft recovery and offline queue are important strengths. |
| PWA update behavior | Improve | non-destructive app chrome | Never update through an active session without preserving draft. |

## Interaction debt inventory

### Navigation
- Four equally weighted tabs split one mental model into History and Trends.
- Settings is reachable from Today but route hierarchy still treats legacy destinations as peers.
- Legacy URLs need explicit compatibility redirects after IA consolidation.

### Today
- Strong pieces already exist: exact draft resume, next-workout recommendation, direct bodyweight/sleep sheets, and one-tap water.
- Daily state is still fragmented because nutrition/activity render as separate large surfaces.
- Hero does not yet fully cover workout-complete/rest-day states.
- Weekly check icon competes with Settings despite being occasional.

### Train
- Existing draft restoration is robust and should be preserved.
- Current set logger already prefills previous values, but presentation does not explicitly separate Previous / Target / Actual.
- Rest timer is technically sound but visually becomes a separate card and hides the normal set controls.
- Current exercise context is good, but next-exercise orientation and previous-session summary should be stronger.
- “Finish workout” appears as the main action at the end of the last set, which is fine; early termination should remain outside the dominant set action.
- Existing `exerciseVariants` conflates replacement options and same-pattern variants; new relationship metadata should drive clearer labels.

### Progress
- Insights is a large analytics wall with many cards/charts.
- History is a separate timeline with overlapping bodyweight/sleep/calorie concepts.
- User must know which destination contains an answer.
- Progress should begin with interpretation and period facts, then timeline/trends/deeper analytics.

### Settings
- Current screen is card-heavy and exposes too much product/engineering detail at the same level.
- Account, appearance, training, data, integrations, and advanced diagnostics should be grouped as native list sections.
- MCP/lifecycle/service-worker internals should be moved to Advanced.

### Design system
- Existing neutral palette is a good foundation.
- Product currently still contains multi-domain color concepts and older “card-brutalist” styles alongside newer quiet surfaces.
- Semantic tokens should remain neutral-first; color is reserved for action, earned progress, warnings, and errors.
- Existing reduced-motion handling and safe-area rules are strengths and should remain.

## Data / persistence decision matrix

| Feature | Existing data | Derivable | Needs new persistence | Decision |
|---|---:|---:|---:|---|
| Previous set / previous workout | yes | yes | no | implement |
| Current workout restore | local draft + existing workout state | yes | no | preserve/improve |
| Weight trend | yes | yes | no | implement |
| Weekly workout count | yes | yes | no | implement |
| Training-set distribution | yes | yes | no | retain/improve presentation |
| Nutrition averages | yes | yes, with missing-day caveat | no | implement descriptively |
| Sleep average | yes | yes | no | implement duration only |
| Activity totals | yes | yes | no | implement |
| PR categories | set history exists | partially | no | implement only valid categories |
| Actual RIR/RPE | not reliably persisted | no | yes | defer |
| Per-set pain/tempo/failure metadata | absent | no | yes | defer |
| Recovery percentage / strain score | unsupported | no | yes/unsupported | do not build |
| Nutrition-day completeness | absent | no | yes | do not infer |
| Adaptive TDEE from intake logs | incomplete source data | unsafe | no | do not build |
| Progress photos | verify storage absent | no | yes | defer |
| New persistent muscle-priority model | absent | no | yes | defer |
| UI-only preferences (collapse completed, wake lock, range) | n/a | n/a | device only | allowed |

## Implementation plan applied in this branch

1. App shell: three primary destinations Today / Train / Progress; legacy History/Insights routes preserved through redirects/deep links.
2. Today: state-aware hero, one grouped daily-state surface, direct logging, reduced header chrome.
3. Train: one-tap normal start, optional readiness/warm-up, current-set-first UI, clearer previous/target/actual context, integrated persistent rest timer behavior, wake-lock option, next-exercise orientation, safer finish flow.
4. Progress: new interpretation-first home combining recent history, weight trend, training, nutrition, sleep, and activity entry points; legacy analytics remain available deeper.
5. Settings: grouped administration with advanced diagnostics demoted.
6. Design system: quieter semantic surfaces, responsive widths, safe-area/touch-target/accessibility cleanup.
7. PWA/offline: preserve active drafts and avoid update prompts interrupting active sessions.
8. QA: add deterministic unit coverage for derived progress/state helpers and route compatibility.

## No-DB verification boundary

This branch may modify React/TypeScript/CSS/tests/documentation only. It must not touch `supabase/migrations`, schema files, SQL, edge-function persistence contracts, or existing table/column semantics. Device-local storage is permitted only for non-critical UI preferences and active-session affordances.
