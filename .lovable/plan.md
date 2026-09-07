# Update PPL 6-Day Split to New Program

## Goal
Replace the six workout days of the `ppl6` template with the new program from the uploaded file (Push A / Pull A / Legs A / Push B / Pull B / Legs B), keeping everything else untouched.

## What changes

`src/lib/splitTemplates.ts` — replace only the `ppl6.days` block:

- **Day 1 — Push A** (heavy): Incline Barbell Bench Press 3×5–8, Flat Barbell Bench Press 3×6–10, Pec Deck 2×10–15, Dumbbell Shoulder Press 2×6–10, Lean-Away Cable Lateral Raise 3×12–20, Dumbbell Lateral Raise 2×15–25, Overhead Cable Triceps Extension 2×10–15, Single-Arm Triceps Pushdown 2×10–15, Hanging Leg Raise 3×10–20
- **Day 2 — Pull A** (heavy): Barbell Row 3×6–10, Pull-Ups 3×6–12, T-Bar Row 2×8–12, Reverse Pec Deck 3×12–20, Incline Dumbbell Curl 2×8–12, Hammer Curl 2×10–15, Wrist Extension 2×15–25, Cable Crunch 3×10–15
- **Day 3 — Legs A** (heavy): Hack Squat 3×6–10, Leg Press 2×8–12, Bulgarian Split Squat 2×8–12, Leg Extension 2×12–18, Seated Leg Curl 2×10–15, Standing Calf Raise 4×8–15, Hip Abduction 2×15–25
- **Day 4 — Push B** (volume): Incline Dumbbell Press 3×8–12, Machine Chest Press 2×8–15, Chest-Biased Dips 2×8–15, High-to-Low Cable Fly 2×12–20, Smith Machine Overhead Press 2×6–10, Cable Lateral Raise 3×10–20, Dumbbell Lateral Raise 2×15–25, Cable Rear-Delt Fly 2×15–25, Skull Crusher 2×8–12, Single-Arm Triceps Pushdown 2×12–20, Cable Woodchopper 2×12–20
- **Day 5 — Pull B** (volume): Neutral-Grip Lat Pulldown 3×8–12, Seated Cable Row 3×8–12, Straight-Arm Pulldown 2×12–15, Reverse Pec Deck 2×12–20, EZ-Bar Preacher Curl 2×8–12, Cable Reverse Curl 3×12–18, Wrist Curl 2×15–25, Dumbbell Shrug 2×10–15
- **Day 6 — Legs B** (volume): Romanian Deadlift 3×6–10, Seated Leg Curl 3×10–15, Hip Thrust 3×8–12, High/Wide Leg Press 2×10–15, Leg Extension 2×12–18, Seated Calf Raise 4×10–20, Hip Abduction 2×15–25, Hanging Knee Raise 3×10–20

Details:
- Day names stay identical (`Push A`, `Pull A`, etc.) so workout history, PRs, and day-completion checkmarks keep matching.
- First two exercises per day = `primary`, the rest = `accessory`.
- No target weights are pre-filled (the program specifies none); the app's existing last-used/PR hints guide loading. Bodyweight moves (Pull-Ups, dips, raises) get `BW`.
- Rep targets use the file's ranges, e.g. `3x5-8`, `2x8-12 each`, `2x12-20 each side`.
- Focus lines updated per day (e.g. Day 1: "Heavy chest, side delts, abs").

## What does NOT change
- Other splits (ppl5, upper_lower4, full_body3), settings screens, and the inactive-for-you custom routine in the database.
- No backend or data changes. Day 7 remains a rest day as before.

## Verification
- Typecheck + build clean.
- Open Log Workout day picker and confirm each day shows the new exercise list and counts.
