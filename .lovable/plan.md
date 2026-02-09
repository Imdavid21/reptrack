

## Fix: Keep recommendation text static in onboarding steps

### Problem
In the onboarding flow, the "We recommend Xh based on your age" text on the Sleep goal step (Step 4) updates as the user drags the slider. The recommendation should remain fixed at the initially calculated value so users always see what was suggested vs. what they chose.

### What changes

**File: `src/components/onboarding/OnboardingFlow.tsx`**

1. **RecoveryStep component** (lines 560-608): Add an `age` prop so the component can independently calculate the recommended value using the existing `suggestSleep()` function. Change line 576 from `{value}` to `{suggestSleep(age)}` so the recommendation text stays static regardless of slider position.

2. **RecoveryStep usage** (line 256-259): Pass `age={data.profile.age}` to the component.

No other steps are affected — the HydrationStep already correctly references `suggestWater(weight)` for its recommendation text, and the TrainingStep uses generic static text.

### Technical detail

- `RecoveryStep` gains a new prop: `age: number | null`
- The recommendation line becomes: `We recommend {suggestSleep(age)}h based on your age.`
- The slider value display and behavior remain unchanged
- Zero risk of regression since `suggestSleep()` is a pure function already defined in the file

