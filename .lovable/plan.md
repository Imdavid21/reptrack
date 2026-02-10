

## Enhance AI Workout Generator for Full Muscle Sub-Group Coverage

### Problem
The current AI prompt in the workout generator is generic — it says "focus on compound movements" but doesn't guide the AI to ensure comprehensive sub-muscle-group coverage across paired days. For example, Push A and Push B together should collectively target:
- **Chest**: upper (incline), mid (flat), lower (decline/dips)
- **Shoulders**: front delts, side delts, rear delts
- **Triceps**: long head, lateral head, medial head

Similarly for Pull and Legs days. Right now, the AI might generate two nearly identical days or miss important sub-groups like rear delts or hamstrings.

### Solution
Update the system prompt in the `generate-workout` edge function to include explicit muscle sub-group coverage requirements for each split type.

### Changes

**1. `supabase/functions/generate-workout/index.ts`** — Enhanced system prompt

Add a new section to the system prompt with split-specific sub-group coverage rules:

```
MUSCLE COVERAGE RULES:
- For Push days: Ensure exercises collectively target upper chest (incline), mid chest (flat), 
  front delts (pressing), side delts (lateral raises), and triceps (pushdowns/extensions). 
  If there are two Push days (A & B), vary the emphasis — e.g., Push A = chest-heavy, Push B = shoulder-heavy — 
  but both must include at least one exercise for each sub-group across the pair.

- For Pull days: Cover upper back/lats (vertical pulls like pulldowns/pull-ups), mid back/rhomboids 
  (horizontal rows), rear delts (face pulls/reverse fly), biceps (curls with varied grip — supinated, 
  neutral/hammer), and forearms. If two Pull days, alternate between back thickness (rows/deadlifts) 
  and back width (pulldowns/pull-ups) emphasis.

- For Legs days: Include quad-dominant (squats, leg press, extensions), hamstring-dominant 
  (RDLs, leg curls), glutes (hip thrusts, lunges), and calves. If two Legs days, alternate 
  squat-pattern vs hinge-pattern as the primary movement.

- For Upper days: Balance push and pull movements. Include at least one horizontal push, one vertical push, 
  one horizontal pull, one vertical pull, plus isolation for side delts and arms.

- For Full Body days: Each session must include a squat pattern, a hinge pattern, an upper push, 
  and an upper pull. Vary the specific exercises across days.
```

Also add a rule ensuring variation between A/B day pairs:
```
VARIATION RULE: When creating paired days (A & B), use different exercises for the same muscle group. 
For example, if Push A has Barbell Bench Press, Push B should use Dumbbell Press or Incline Press as 
the primary chest movement. Do NOT repeat the same exercise across paired days.
```

### Technical Details

- Only the edge function prompt changes — no frontend or database changes needed
- The existing JSON output format stays the same
- The AI model (gpt-4o-mini) already supports these detailed instructions within context limits
- This is backward compatible — the response structure is unchanged

### Outcome
AI-generated routines will ensure every muscle sub-group is covered across paired training days, producing more balanced and effective programs.
