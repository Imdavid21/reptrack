# RepTrack Data Room Visual Overhaul

This branch implements the first production pass of the mobile-first Data Room overhaul for the iPhone PWA.

## Product intent

The Data Room should answer four questions quickly:

1. Where am I now?
2. What changed?
3. What evidence supports that read?
4. Where can I inspect the underlying data?

The redesign keeps RepTrack's existing analytical restraint. Missing evidence remains missing, logged nutrition is not assumed complete, recovery is not collapsed into a fabricated score, and relationship plots remain exploratory rather than causal.

## Primary mobile target

- iPhone 15 Pro Max PWA reference viewport: 430 × 932 CSS px
- Responsive down to narrower modern iPhone widths
- `viewport-fit=cover` + CSS safe-area insets
- Fixed bottom navigation retained
- Sticky Data Room range control on mobile
- 44 px minimum interactive target where practical
- Charts preserve vertical page scrolling while allowing horizontal inspection

## Shared interaction model

### Inspect

Charts expose a fixed Inspector above the plotting area rather than hover-only tooltips. Dragging horizontally updates the Inspector.

### Range

The existing `7D / 30D / 3M / 6M / 1Y` model remains the source of truth.

### Missing data

Missing days are not rendered as observed zero values. Coverage views distinguish observation from absence.

### Drilldown

Overview visuals link to domain pages, exercise pages, workouts, or timeline history instead of packing every detail into one screen.

## Implemented surfaces

### Data Room home

- current-read hero
- domain trajectory rail
- synchronized body/training/protein/sleep/activity timeline
- evidence matrix
- previous-period dumbbell comparisons
- decision-relevant finding cards
- domain drilldowns

### Body & physique

- raw + trend bodyweight chart
- target reference when available
- anatomical measurement map
- measurement-history bottom sheet
- recorded body-fat entry kept explicit and non-interpolated

### Training

- workout consistency matrix
- muscle exposure body map
- population reference bullet charts
- exercise progression sparklines
- pain/ROM/post-workout context summary

### Nutrition

- logging-evidence matrix
- protein consistency bars against current target
- logged-calorie bars
- macro small multiples
- raw logged-day evidence list

### Recovery

- synchronized sleep/fatigue/soreness/motivation/training tracks
- first-vs-latest subjective signal comparisons
- latest subjective context cards
- pain/joint-discomfort flags

### Activity & mobility

- activity distribution bars
- activity evidence calendar
- knee-to-wall bilateral symmetry gauge
- hip 90/90 bilateral symmetry gauge
- latest movement context

### Exercise detail

- estimated-strength trend
- load trend
- observed rep ladder
- raw comparable exposure history
- exact-vs-family PR semantics retained

### Records

- recent-record carousel
- monthly PR activity visual
- full exact-record list retained

### Timeline

- Visual/List modes
- synchronized weight/sleep/food/workout/activity history
- visual selection opens the exact detailed date
- edit behavior remains in List mode

### Explore

- evidence-gated relationship scatterplots
- minimum 10 paired observations before rendering
- no fitted causal/regression claim
- existing deep-dive analysis retained

## Visualization grammar

- trajectory → line / sparkline
- distribution → bars / body map
- consistency → calendar / matrix
- comparison → dumbbell / bullet
- relationship → scatter
- evidence → matrix / confidence markers

Avoid 3D, dual-axis charts, decorative radial dashboards, and visual encodings that imply precision the data does not support.

## Remaining follow-up work

The initial implementation deliberately leaves several items for a second pass after device QA:

- physique photo filmstrip + before/after comparison once storage URL handling is confirmed
- muscle × week exposure matrix once weekly muscle attribution is factored into a reusable selector
- set-by-set exercise matrix using full raw workout set history
- PR staircase using historical all-time record events rather than the current record snapshot
- shared selected-date context across independent domain pages
- richer VoiceOver chart table fallback
- below-the-fold intersection-based lazy mounting for the heaviest charts
- optional offline `last synced` timestamp where query cache metadata is available

## QA gate

Before merge:

- TypeScript build passes
- lint passes
- no horizontal page overflow at 375, 390, 393, 402, and 430 px widths
- standalone iOS safe areas verified
- vertical scroll does not accidentally trigger chart drag
- all critical chart insights have textual equivalents
- reduced motion is respected by existing app motion settings
- missing values are never visually presented as recorded zeroes
