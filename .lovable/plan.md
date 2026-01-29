
# Plan: Redesign Calorie Tracker Quick Actions

## Current State

The CalorieTrackerCompact component has 4 buttons for meal types:
```
[ ☕ ] [ ☀️ ] [ 🌅 ] [ 🍪 ]
  B       L       D      S
```

## Desired State (from reference)

Replace meal type buttons with **input method buttons** that directly trigger logging:
```
[ 📷 CAMERA ] [ + GALLERY ] [ 🍴 DESCRIBE ]
      ─────────────────────────────────
      Manual entry (food + calories)
```

## Solution

### 1. Auto-detect Meal Type
Use `getMealTypeByTime()` (already exists in QuickActionsBar.tsx) to automatically categorize meals based on time:
- 5-11: Breakfast
- 11-15: Lunch  
- 15-20: Dinner
- 20-5: Snack

### 2. Replace Button Row
Change from meal type buttons to input method buttons:

**Current (lines 226-246):**
```tsx
<div className="flex gap-2 mt-auto pt-3">
  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
    const Icon = MEAL_ICONS[type];
    return <button onClick={() => handleOpenDialog(type)}>...</button>
  })}
</div>
```

**After:**
```tsx
<div className="space-y-2 mt-auto pt-3">
  <div className="grid grid-cols-3 gap-2">
    <button onClick={() => handleCameraClick()}>
      <Camera /> CAMERA
    </button>
    <button onClick={() => handleGalleryClick()}>
      <Plus /> GALLERY
    </button>
    <button onClick={() => handleDescribeClick()}>
      <Utensils /> DESCRIBE
    </button>
  </div>
  <button onClick={() => handleManualClick()}>
    Manual entry (food + calories)
  </button>
</div>
```

### 3. Simplify Dialog Flow
Remove meal type selector from dialog since it's auto-detected. The dialog will:
1. Skip the initial "choose input method" screen (already chosen)
2. Go directly to the selected mode (camera/text/manual)
3. Auto-assign meal type based on time when saving

### 4. Files to Modify
- `src/components/health/CalorieTrackerCompact.tsx`

### 5. Technical Changes

```tsx
// Add getMealTypeByTime function
function getMealTypeByTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 20) return 'dinner';
  return 'snack';
}

// New handlers that set mode directly
const handleCameraClick = () => {
  setSelectedMealType(getMealTypeByTime());
  setIsDialogOpen(true);
  // Immediately trigger camera input
  setTimeout(() => cameraInputRef.current?.click(), 100);
};

const handleGalleryClick = () => {
  setSelectedMealType(getMealTypeByTime());
  setIsDialogOpen(true);
  setTimeout(() => galleryInputRef.current?.click(), 100);
};

const handleDescribeClick = () => {
  setSelectedMealType(getMealTypeByTime());
  setTextMode(true);
  setIsDialogOpen(true);
};

const handleManualClick = () => {
  setSelectedMealType(getMealTypeByTime());
  setManualMode(true);
  setIsDialogOpen(true);
};
```

### 6. Visual Result

**Before:**
```
┌─────────────────────────────────┐
│ TODAY'S CALORIES          🍴   │
│ 0 / 2000                   ▼   │
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│ [☕] [☀️] [🌅] [🍪]             │
└─────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────┐
│ TODAY'S CALORIES          🍴   │
│ 0 / 2000                   ▼   │
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│ [📷 CAMERA][+ GALLERY][🍴 DESC]│
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│    Manual entry (food + cal)   │
└─────────────────────────────────┘
```

## User Flow Change

**Before:**
1. Tap breakfast/lunch/dinner/snack button
2. Dialog opens with input method options
3. Choose camera/gallery/describe/manual
4. Log meal

**After:**
1. Tap Camera/Gallery/Describe/Manual button
2. Camera opens immediately OR dialog opens in describe/manual mode
3. Log meal (meal type auto-detected)

This removes one tap from the flow and matches the reference design.
