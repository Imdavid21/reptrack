

# Landing Page Rework — Mobile-First with Live Elements

## Overview

A complete content and UX overhaul of `src/pages/Landing.tsx` following your 8-point brief. Every string, section order, and micro-interaction is addressed. The page will feel alive on mobile with subtle animated elements while staying clean and honest in tone.

---

## Section-by-Section Changes

### 1. Hero Section — Fix the Promise

**Copy changes:**
- Badge: "Built for consistency"
- H1: "One place to track training, recovery, and intake."
- Paragraph: "Log workouts set by set. Track water, calories, sleep, and weight. Reptrack turns your daily logs into weekly insights so you know what's working."
- Primary CTA: "Get started" (remove "Start Free" and the ArrowRight icon)
- Keep "Sign In" secondary button as-is

**Live element:** Add a subtle animated counter/ticker in the hero that cycles through sample stats (e.g., "3 sets logged", "2.1L water", "7.5h sleep") using framer-motion AnimatePresence to give the page life.

### 2. PWA Line Under Hero CTAs

Add a new motion block directly below the CTA buttons:
- "Works like an app." with Apple + Smartphone icons + "Add to Home Screen."
- Sub-line: "Free forever. No ads. No credit card."
- Note: Lucide does not export an `Apple` icon. Will use a custom inline SVG for the Apple logo and `Smartphone` from lucide for Android.

### 3. NEW — "How It Works" Section (between Hero and Features)

**Title:** "Track in minutes. Learn in weeks."

**3-step horizontal cards:**
1. Icon: Dumbbell | "Log workouts" | "Add sets, reps, and weight as you train."
2. Icon: Droplets | "Track daily basics" | "Water, calories, sleep, and weight in seconds."
3. Icon: BarChart3 | "Get weekly insights" | "See what moves your performance forward."

**Live element:** Each step card will have a subtle number badge (1, 2, 3) that animates in sequence with staggered delays, giving a "step-by-step" feel on scroll.

### 4. Features Grid — Restructured Copy

**Section header:**
- H2: "Everything you actually track. In one system."
- Paragraph: "Your workouts, intake, and recovery shouldn't be split across 4 different apps."

**Updated 6 cards (same layout, new copy):**
1. Workout Tracking — "Log workouts set by set. Track PRs, volume, and progression automatically."
2. Hydration Tracking — "Quick-add water in seconds. See daily progress at a glance."
3. Calorie Tracking — "Track meals and macros without overthinking it. Stay aware, not obsessed."
4. Sleep & Vitals — "Log sleep and energy. Track weight trends and recovery patterns."
5. Advanced Analytics — "See trends across weeks. Spot what improves performance."
6. Smart Routines — "Follow structured routines like PPL. Stay consistent and progress faster."

**Live element:** Feature cards get a subtle hover/tap lift animation with a micro-scale transform and a gentle border glow on interaction.

### 5. AI Section — Remove "Machine Learning" Language

**Changes:**
- Pill label: "AI Insights" (was "AI-Powered")
- H2: "Automatic insights from your logs." (was "Intelligence built in")
- Paragraph: "Reptrack turns your training, sleep, and intake history into simple weekly takeaways. No spreadsheets. No guesswork."
- Bullet list updated to:
  - "Weekly insights based on your last 4 weeks"
  - "Auto-detected PRs, trends, and plateaus"
  - "Shows which habits move your performance"

**InsightCard component:** Add optional `meta` prop for credibility:
- Card 1: "Your training volume is 23% higher when sleep exceeds 7 hours." | meta: "Based on last 28 days"
- Card 2: "Consider adding rest days after 3 consecutive training days." | meta: "Based on last 28 days"
- Card 3: "Bench press trending up 8% over the last 4 weeks." | meta: "Based on last 28 days"

**Live element:** The InsightCards panel will have a subtle pulsing dot indicator (like a live data feed) to suggest real-time intelligence.

### 6. AI Agent Section — Make it Feel Optional

**Paragraph updated to:** "Use Claude, ChatGPT, or automations to log workouts, pull stats, and generate summaries. MCP and API support are built in."

**Add disclaimer below the grid:** "Developer features are optional. The core app works without any setup." (styled as `text-xs text-muted-foreground text-center mt-8`)

### 7. PWA Section — Fix "Under 2MB" Claim

- "Lightweight" description changed from "Under 2MB total" to "Loads fast"
- Section H2 changed from "No app store required" to "Works like an app. No app store."

### 8. Final CTA — Remove Unverifiable Claims

- H2: "Start tracking today." (keep as-is)
- Paragraph: "Built for busy people who want one system for fitness. Free forever. No ads. No credit card."
- Button: "Create account" (remove "Free" and ArrowRight icon)

---

## Live / Interactive Elements Summary

| Section | Element | Animation |
|---|---|---|
| Hero | Cycling stat ticker | AnimatePresence with fade/slide, 3s interval |
| How It Works | Step number badges | Staggered fadeInUp on scroll |
| Features | Card interactions | Scale + border glow on hover/tap |
| AI Insights | Live pulse dot | CSS pulse animation on the panel header |
| All sections | Scroll reveal | Existing whileInView animations retained |

---

## Technical Details

### File modified
- `src/pages/Landing.tsx` — full rewrite of content, add new "How It Works" section, update all sub-components

### Import changes
- Remove: `Apple` (doesn't exist in lucide-react)
- Keep all existing lucide imports
- Add: `ClipboardList` for "How It Works" step if needed (or reuse existing icons)

### New sub-components (inside Landing.tsx)
- `HowItWorksStep` — numbered step card
- `LiveStatTicker` — animated cycling stat display
- Updated `InsightCard` — with `meta` prop
- `PulseDot` — small CSS-animated indicator

### Mobile-first approach
- All grid layouts use `grid-cols-1` as base, scaling up with `md:` and `lg:` breakpoints
- Touch-friendly tap targets (min 44px)
- Padding optimized for mobile viewports (px-4 base)
- "How It Works" section: single column on mobile, 3-column on desktop

