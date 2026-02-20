
## Improve Food Photo Analysis Accuracy

### Problem Diagnosis

There are three root causes for poor food recognition:

1. **Model quality**: The edge function uses `gpt-4o-mini` with `detail: "low"` — this is the lowest-quality vision mode, causing it to miss individual items (e.g., 3 eggs counted as 1, or sauce not identified).
2. **Weak system prompt**: The current prompt is generic with no counting discipline or reasoning steps. It doesn't instruct the model to count items precisely, identify cooking methods, or acknowledge uncertainty.
3. **No user correction flow**: After analysis, users can only "Retry" or "Confirm" — they can't correct individual line items (wrong quantity, wrong food name, wrong calories). This means any AI mistake goes straight into the log uncorrected.

---

### The Fixes

#### 1. Edge Function — `supabase/functions/analyze-food/index.ts`

**Upgrade model from `gpt-4o-mini` to `gpt-4o`** for all vision calls. The `gpt-4o` model has significantly better visual recognition, especially for counting individual items and identifying cooking methods.

**Switch image detail from `"low"` to `"high"`** so the model actually processes the full image resolution. "Low" mode uses a 512px thumbnail — "high" allows it to see the full image in tiles.

**Rewrite the system prompt** to enforce:
- Explicit item counting ("count each individual item — if you see 3 eggs, list 3 eggs, not 'eggs'")
- Cooking method detection ("baked/fried/boiled affects calories significantly")  
- Sauce/dressing estimation ("do not ignore oils, dressings, or condiments")
- A calibration heuristic ("a standard dinner plate is ~25cm. Use plate-relative size for portions")
- Honest uncertainty ("if you cannot identify something, say 'Unknown item' and estimate 200 cal")

**Add a `context` field to the request body** so the frontend can optionally pass extra context (e.g., "restaurant meal" or "home cooked") to improve accuracy.

**Add `fiber` to the tool schema** since the `meals` table already has a `fiber` column that currently goes unused.

#### 2. Client Pipeline — `src/lib/analyzeFoodImage.ts`

**Increase compression quality from `0.75` to `0.85`** and raise max dimension from `1024px` to `1536px` in `imageCompression.ts`. Higher detail mode benefits from larger images.

**Pass optional `context` hint** through to the edge function (the `analyzeFoodImage` function signature gains an optional `contextHint?: string` param).

#### 3. UI — `src/components/health/CalorieTrackerCompact.tsx`

**Add an editable results screen**: After AI analysis, instead of just showing a read-only list with Retry/Confirm, each food line item becomes editable inline:
- Food name is a text input (tap to edit)
- Portion is a text input
- Calories is a number input (tap to edit)
- A "+ Add item" button lets users add missed items
- A trash icon on each row lets users remove wrongly detected items
- The total auto-recalculates as users edit

**Add a meal type selector** in the dialog header (the current auto-detect by time-of-day is convenient but users may want to override it).

**Add a context hint input** — a small optional text field before submitting a photo: "Add context (optional)" → placeholder "e.g., restaurant, home cooked, meal prep" → passes to the edge function for better accuracy.

---

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/analyze-food/index.ts` | Upgrade to `gpt-4o` + `detail: "high"`, rewrite system prompt, add `fiber` to schema, accept `context` hint |
| `src/lib/imageCompression.ts` | Increase max dimension to 1536px and quality to 0.85 |
| `src/lib/analyzeFoodImage.ts` | Pass optional `contextHint` to edge function |
| `src/components/health/CalorieTrackerCompact.tsx` | Editable result items, add-item button, remove-item button, live total recalc, context hint input, meal type selector in dialog |
| `src/components/health/CalorieTracker.tsx` | Same editable result items (this component is used on the Dashboard) |

---

### Technical Notes

- `gpt-4o` with `detail: "high"` costs ~3-4x more tokens per image than `gpt-4o-mini` with `detail: "low"`, but is significantly more accurate. The `OPENAI_API_KEY` is already configured.
- The editable results state will use a local `editableFoods` array copied from `analysis.foods` on mount — editing this array recalculates `editableTotal` displayed in the confirm button.
- `fiber` will be saved to the `meals` table (column already exists) when confirmed.
- The `CalorieTracker.tsx` (full-size version on Dashboard) will also receive the same editable result pattern for consistency.
