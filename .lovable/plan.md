

## Merge "Built for the gym" + "More than a tracker" into one section

### Current problem
Two separate sections with overlapping intent -- "Built for the gym" has 6 feature cards, "More than a tracker" has 6 small pills. They feel disconnected and the pills section renders empty due to animation issues.

### New design

**Single section** with heading:

> **Built for the gym.**
> Everything you need between sets -- and beyond.

**Layout:**
1. **Top: 6 feature cards** (existing FeatureCard grid, unchanged) -- these are the detailed features with icon + title + description
2. **Bottom: "And more" pill strip** -- the 6 small pills (Weekly trends, Auto-detected PRs, Sleep insights, AI compatible, Installable PWA, Works offline) shown as a compact row beneath the cards, with a small "And more" label above them

This keeps all content in one flowing section, removes the redundant heading, and gives "Built for the gym" more weight.

### Technical details

**File:** `src/pages/Landing.tsx`

- Remove the entire "More than a tracker" `<section>` block (lines 275-313)
- Inside the existing "Built for the gym" section (lines 218-273), after the FeatureCard grid, add:
  - A small `<p>` label: "And more"
  - The 6 feature pills in a `grid-cols-2 md:grid-cols-3` static grid (no motion wrapper to avoid visibility bugs)
- Update subtitle from "Everything you need between sets." to "Everything you need between sets -- and beyond."
- All pills use static `div` elements (no Framer Motion) to prevent the invisibility bug

