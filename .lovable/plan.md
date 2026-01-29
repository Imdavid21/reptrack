

# Plan: Fix History Page Alignment

## Problem Summary

The History page has a major misalignment between what's displayed vs. what's editable:

| Metric | Displayed | Editable | Used in Home/Insights |
|--------|-----------|----------|----------------------|
| Sleep | Yes | No | Yes (both) |
| Bodyweight | Yes | No | Yes (both) |
| Calories | No | No | Yes (both) |
| Pull-ups | Yes | Yes | No |
| Notes | Yes | Yes | No |
| Energy Level | No | No | No |

## Solution

### 1. Remove Redundant Metrics
Since **pull-ups**, **notes**, and **energy_level** are not displayed in Dashboard or Insights, they are redundant and should be removed from History.

**Files to modify:**
- `src/pages/History.tsx` - Remove display and editing of pull-ups and notes

### 2. Add Calories to History
Calories (meals) are tracked on Dashboard and Insights but missing from History. We should display daily calorie totals in the History timeline.

**Files to modify:**
- `src/pages/History.tsx` - Add calorie display using `useMeals` hook

### 3. Make Displayed Metrics Editable
Sleep and bodyweight are displayed but not editable inline. The edit mode should include these fields.

**Files to modify:**
- `src/pages/History.tsx` - Expand inline edit to include:
  - Sleep (hours + minutes inputs)
  - Bodyweight (kg input)

## Implementation Steps

### Step 1: Update History Page Structure

Remove the current inline edit state that only handles pullups/notes:

```text
// Before
const [editValues, setEditValues] = useState<{
  pullups: string;
  notes: string;
}>

// After
const [editValues, setEditValues] = useState<{
  sleepHours: string;
  sleepMinutes: string;
  bodyweight: string;
}>
```

### Step 2: Add Calorie Data Integration

Import and use the `useMeals` hook to show daily calorie totals:

```text
// Add to History.tsx
import { useMeals } from '@/hooks/useMeals';

// Get meals and group by date
const { meals } = useMeals();
const caloriesByDate = meals.reduce((acc, meal) => {
  acc[meal.date] = (acc[meal.date] || 0) + (meal.calories || 0);
  return acc;
}, {});
```

### Step 3: Update Display Grid

Replace the current metrics display:

**Remove:**
- Trophy icon + pull-ups count
- Notes display (italic quote)

**Keep:**
- Moon icon + sleep (already there)
- Scale icon + bodyweight (already there)

**Add:**
- Flame icon + calories (if logged that day)

### Step 4: Update Inline Edit Form

Replace the current pullups/notes inputs with:

```text
<Grid container>
  <Box>
    <Label>Sleep</Label>
    <Box display="flex" gap={1}>
      <TextField label="H" value={editValues.sleepHours} />
      <TextField label="M" value={editValues.sleepMinutes} />
    </Box>
  </Box>
  <Box>
    <Label>Weight</Label>
    <TextField 
      label="kg" 
      value={editValues.bodyweight}
      type="number"
    />
  </Box>
</Grid>
```

### Step 5: Update Save Logic

Modify `saveEdit` to save sleep and bodyweight:

```text
const saveEdit = async () => {
  const sleepDecimal = 
    (parseInt(editValues.sleepHours) || 0) + 
    ((parseInt(editValues.sleepMinutes) || 0) / 60);

  await upsertMetrics({
    date: editingDate,
    sleep_hours: sleepDecimal || undefined,
    bodyweight: editValues.bodyweight 
      ? parseFloat(editValues.bodyweight) 
      : undefined,
  });
};
```

## Visual Summary

**Before (History day card):**
```text
+----------------------------------+
| Tue, Jan 28              [Edit]  |
| [Push Day]  Moon 7h  Scale 72kg  |
| Trophy 15 pull-ups               |
| "feeling good today"             |
+----------------------------------+
```

**After (History day card):**
```text
+----------------------------------+
| Tue, Jan 28              [Edit]  |
| [Push Day]  Moon 7h  Scale 72kg  |
| Flame 1,850 cal                  |
+----------------------------------+
```

**After (Edit mode):**
```text
+----------------------------------+
| Tue, Jan 28                      |
| +------------------------------+ |
| | Sleep: [7]h [30]m            | |
| | Weight: [72.0] kg            | |
| |              [Cancel] [Save] | |
| +------------------------------+ |
+----------------------------------+
```

## Technical Notes

- The `useMeals` hook already supports date filtering; we need to check if it can provide data for the last 14 days
- Calories are not directly editable in History since meals are logged individually (each meal has its own entry) - only display is needed
- The `upsertMetrics` mutation already supports `sleep_hours` and `bodyweight` fields

