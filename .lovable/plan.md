
# Insights Page Visual Redesign

## Overview
Transform the Insights page from the current brutalist/terminal aesthetic to a modern, soft, and visually rich analytics dashboard inspired by the reference designs.

---

## Design Direction

### Color Palette (Soft Pastels)
New CSS variables for the insights page:
- **Mint/Teal**: `hsl(158, 64%, 52%)` - for positive trends, growth metrics
- **Lavender**: `hsl(263, 70%, 76%)` - for workout/performance data
- **Coral/Peach**: `hsl(15, 80%, 68%)` - for calories, energy burn
- **Soft Yellow**: `hsl(48, 95%, 76%)` - for sleep, recovery
- **Soft Pink**: `hsl(330, 70%, 76%)` - for heart rate, vitals
- **Card backgrounds**: Slightly elevated with soft shadows

### Card Styling
- Replace sharp corners with `rounded-2xl` or `rounded-xl`
- Add subtle box shadows (`shadow-sm` or custom soft shadow)
- Lighter background with gradient overlays
- Soft border or borderless cards with shadows

### Charts
- Use gradient fills with transparency (Area charts instead of Line where appropriate)
- Rounded bar corners
- Softer grid lines (nearly invisible)
- Pastel color schemes for data series

---

## Technical Changes

### 1. New CSS Variables (src/index.css)
Add soft color palette tokens for insights:

```text
--insight-mint: 158 64% 52%
--insight-lavender: 263 70% 76%
--insight-coral: 15 80% 68%
--insight-yellow: 48 95% 76%
--insight-pink: 330 70% 76%
--insight-blue: 210 80% 70%
--card-shadow: 0 4px 24px rgba(0, 0, 0, 0.06)
```

### 2. Insights Page Layout (src/pages/Insights.tsx)
Restructure to include:
- **Summary Stats Row**: 4 horizontal stat cards at top with icons, values, and trend percentages
- **Tab navigation**: Softer pill-style tabs with rounded corners
- **Grid layout**: 2-column responsive grid for chart cards

### 3. New InsightStatCard Component
Create a reusable stat card with:
- Icon with soft colored background circle
- Large stat value
- Label and description
- Trend indicator with percentage change
- Optional mini sparkline

### 4. Updated Chart Components
Modify each chart component:

**StrengthProgressionChart**:
- Use Area chart with gradient fill
- Soft lavender/purple color scheme
- Rounded card container with shadow

**VolumeChart**:
- Stacked area chart with pastel colors
- Mint, lavender, coral for push/pull/legs
- Semi-circular progress ring for distribution

**EnergyBalanceCard**:
- Horizontal bar comparison (intake vs burn)
- Coral for intake, mint for burn
- Clean percentage-based visualization

**SleepEnergyChart**:
- Dual-axis area chart with yellow (sleep) and blue (energy)
- Gradient fills with transparency

**BodyweightChart**:
- Smooth area chart with subtle gradient
- Trend line with soft shadow

**HydrationChart**:
- Soft blue bar chart with rounded bars
- Progress indicator for daily goal

**VitalsTab Charts**:
- Heart rate: Soft pink area chart
- Steps: Mint gradient area chart

### 5. Tab Styling Update
- Pill-shaped tabs with rounded corners
- Soft hover states
- Active state with subtle shadow/elevation

---

## Component-by-Component Changes

### InsightsContent
```text
- Add summary stat cards at top (4 cards: Sessions, Volume, Streak, Progress)
- Update tab styling to rounded pills
- Add subtle page background gradient
```

### PerformanceTab
```text
- Redesign stat blocks as modern stat cards with icons
- Add trend indicators (+X% from last period)
- Update AICoachInsights card styling
```

### BodyTab
```text
- Grid layout for cards (2 columns on desktop)
- EnergyBalanceCard with donut or bar visualization
- Soft colored macro progress bars
```

### VitalsTab
```text
- Heart rate card with pink gradient area chart
- Steps card with mint bar chart
- Oxygen level as circular gauge
```

### AITab
```text
- Clean insight cards with colored left borders
- Softer background colors for insight types
```

---

## Files to Modify

1. **src/index.css** - Add soft color palette and card shadow utilities
2. **src/pages/Insights.tsx** - Restructure layout, add summary cards, update tabs
3. **src/components/analytics/StrengthProgressionChart.tsx** - Gradient area chart, soft colors
4. **src/components/analytics/VolumeChart.tsx** - Soft stacked area, pastel palette
5. **src/components/analytics/SleepEnergyChart.tsx** - Gradient fills, yellow/blue scheme
6. **src/components/analytics/BodyweightChart.tsx** - Area chart with shadow, trend display
7. **src/components/analytics/HydrationChart.tsx** - Soft blue bars, rounded corners
8. **src/components/analytics/PullupAccumulator.tsx** - Modern bar styling
9. **src/components/analytics/AICoachInsights.tsx** - Softer card styling
10. **src/components/health/EnergyBalanceCard.tsx** - Horizontal bar visualization
11. **src/components/health/NutritionInsights.tsx** - Gradient progress bars
12. **src/components/health/HealthInsightsCard.tsx** - Soft colored insight cards

---

## New Component

### InsightStatCard (src/components/analytics/InsightStatCard.tsx)
```text
Props:
- icon: Lucide icon component
- label: string
- value: string | number
- trend?: number (percentage change)
- color: 'mint' | 'lavender' | 'coral' | 'yellow' | 'pink' | 'blue'
- sparkData?: number[] (optional mini chart data)

Features:
- Rounded corners with soft shadow
- Colored icon background circle
- Large bold value
- Trend arrow with percentage (green up, red down)
- Optional mini sparkline in corner
```

---

## Visual Summary

```text
┌─────────────────────────────────────────────────────┐
│  Date Range: [Last 30 Days ▼]                       │
├─────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│  │ 24   │  │ 45k  │  │ 7.2h │  │ 85%  │  ← Summary │
│  │ SESS │  │ VOL  │  │ SLEEP│  │ PROG │    Cards   │
│  │ +12% │  │ +8%  │  │ +0.5 │  │ ──   │            │
│  └──────┘  └──────┘  └──────┘  └──────┘            │
├─────────────────────────────────────────────────────┤
│  ┌─PERF─┐ ┌─BODY─┐ ┌─VITALS┐ ┌──AI──┐  ← Pill Tabs │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Strength Prog  │  │  Weekly Volume  │  ← Grid  │
│  │  ~~~~~~~~~~~~   │  │  ▓▓▓▓▓▓▓▓▓▓▓   │    Layout │
│  │  gradient area  │  │  stacked bars   │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────────────────────────┐           │
│  │  AI Coach Insights                   │          │
│  │  → Personalized recommendations...   │          │
│  └─────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

This redesign maintains all existing functionality while transforming the visual presentation to be modern, soft, and visually engaging with the soft pastel color palette requested.
