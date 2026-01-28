

## Strength Overview Chart Redesign

### Current Problems (as seen in screenshot)
- 30+ exercise toggle chips create visual clutter
- Stacked area chart becomes hard to read with many overlapping layers
- All areas use similar gray opacity, making them indistinguishable
- Legend duplicates information already in the chips
- Difficult to identify which exercises contribute most to strength gains

### Alternative Visualization Options

I recommend a **two-tier approach**: a clean aggregate view by default, with drill-down capability for individual exercises.

---

### Option A: Category-Based Sparkline Grid (Recommended)

Instead of showing all 30+ exercises at once, group them by **muscle group** (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings) and show a mini sparkline for each:

```text
+--------------------------------------------------+
| Strength Overview                         +28%   |
+--------------------------------------------------+
|  [Chest]        [Back]         [Shoulders]       |
|  32kg → 40kg    45kg → 52kg    28kg → 35kg       |
|  ~~~^~~~        ~~~^~~~        ~~~^~~~           |
|  +25%           +15%           +25%              |
+--------------------------------------------------+
|  [Biceps]       [Triceps]      [Quads]           |
|  12kg → 15kg    25kg → 30kg    80kg → 95kg       |
|  ~~~^~~~        ~~~^~~~        ~~~^~~~           |
|  +25%           +20%           +18%              |
+--------------------------------------------------+
| STRENGTH INDEX: 328.5 kg                         |
+--------------------------------------------------+
```

**Benefits**:
- 6-8 sparklines vs 30+ toggles
- Each category shows progression clearly
- Tap a category to drill into individual exercises
- Keeps the "Strength Index" summary

---

### Option B: Top Exercises Only + Simplified Line Chart

Show only the **Top 5 exercises by weight** with simple overlapping lines (no stacked areas):

```text
+--------------------------------------------------+
| Strength Overview                         +28%   |
+--------------------------------------------------+
|  ● Deadlift  ● Squat  ● Bench  ● Row  ● Press    |
+--------------------------------------------------+
|      /-------●                                   |
|     /    /---●                                   |
|    /  __/  --●                                   |
|   /__/   /---●                                   |
|  /------●                                        |
|  Jan 5    Jan 12    Jan 19    Jan 26             |
+--------------------------------------------------+
| 328.5 kg STRENGTH INDEX                          |
+--------------------------------------------------+
```

**Benefits**:
- Clean, readable lines
- Focus on compound lifts that matter most
- Dropdown/button to "View all exercises" opens a modal with full list

---

### Option C: Bar Chart + Trend (Simplest)

Show aggregated weekly strength as bars with a trend line:

```text
+--------------------------------------------------+
| Strength Overview                         +28%   |
+--------------------------------------------------+
|    █ Weekly Total                                |
|    ▬ Trend                                       |
+--------------------------------------------------+
|        ████                                      |
|    ███ ████ ████                                 |
|  █████ ████ ████ █████                           |
|  █████ ████ ████ █████ ─────●                    |
|  Jan 5    12    19    26                         |
+--------------------------------------------------+
| Top Gainers: Deadlift +10kg, Squat +5kg          |
| STRENGTH INDEX: 328.5 kg                         |
+--------------------------------------------------+
```

**Benefits**:
- Single data series - no clutter
- Highlight "Top Gainers" as text chips below
- Fastest to read

---

### Recommendation: Option A (Sparkline Grid)

This provides the best balance of:
1. **Information density** - see all muscle groups at a glance
2. **Progressive disclosure** - tap to drill into exercises
3. **Minimal UI** - no 30+ toggles
4. **Actionable insights** - clear growth % per category

---

### Implementation Details

#### Files to Modify
1. **`src/components/analytics/StrengthOverviewChart.tsx`** - Complete rewrite with new visualization

#### Data Transformation
- Group exercises by `muscleGroup` from exercise library
- Calculate weekly max weight per muscle group
- Compute growth percentage per group
- Keep total "Strength Index" calculation

#### Component Structure
```text
<MuiCard>
  <Header: "Strength Overview" + Growth Badge />
  <Grid cols=3 gap=1.5>
    {muscleGroups.map(group => (
      <SparklineCard
        key={group}
        label={group.name}
        data={group.weeklyMaxWeights}
        currentWeight={group.latestMax}
        growth={group.growthPercent}
        onClick={() => setSelectedGroup(group)}
      />
    ))}
  </Grid>
  <StrengthIndexBox value={totalStrength} />
</MuiCard>

{/* Optional drill-down dialog */}
<ExerciseBreakdownDialog
  open={!!selectedGroup}
  group={selectedGroup}
  onClose={() => setSelectedGroup(null)}
/>
```

#### Sparkline Implementation
Use Recharts `<AreaChart>` with minimal styling:
- No axes
- 40-60px height
- Solid black/white fill with transparency
- No grid lines
- Touch target for drill-down

#### Muscle Group Mapping
```typescript
const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', patterns: ['chest', 'bench', 'fly'] },
  { key: 'back', label: 'Back', patterns: ['row', 'pulldown', 'deadlift'] },
  { key: 'shoulders', label: 'Shoulders', patterns: ['shoulder', 'press', 'raise', 'delt'] },
  { key: 'arms', label: 'Arms', patterns: ['curl', 'tricep', 'bicep', 'pushdown'] },
  { key: 'legs', label: 'Legs', patterns: ['squat', 'leg', 'lunge', 'calf', 'thrust'] },
];
```

---

### Summary

| Aspect | Current | Proposed (Option A) |
|--------|---------|---------------------|
| Toggles | 30+ chips | 0 chips |
| Chart elements | 5+ stacked areas | 5-6 sparklines |
| Visual clarity | Low (overlapping) | High (isolated) |
| Drill-down | None | Tap category |
| Legend | Redundant | Integrated |

