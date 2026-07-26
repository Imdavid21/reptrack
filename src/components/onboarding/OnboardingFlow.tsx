import { useState, useCallback } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Droplets, Dumbbell, Moon, Target, ArrowRight, Check } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { localDateKey } from '@/lib/dateKey';
import { TrainingSplit } from '@/lib/splitTemplates';
import { calculateBMR } from '@/lib/metabolism';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type GoalType = 'lose' | 'gain' | 'maintain';
type Gender = 'male' | 'female';

interface ProfileData {
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: Gender | null;
}

interface OnboardingData {
  weight_goal_type: GoalType | null;
  profile: ProfileData;
  daily_water_goal: number;
  weekly_workout_goal: number;
  training_split: TrainingSplit;
  sleep_goal: number;
  daily_calorie_goal: number;
}

const STEPS = ['goal', 'hydration', 'training', 'recovery'] as const;

// --- Smart default calculators ---

function suggestWater(weight: number | null): number {
  if (!weight) return 3;
  const liters = weight * 0.033;
  return Math.round(liters * 2) / 2; // round to nearest 0.5
}

function suggestCalories(
  weight: number | null,
  height: number | null,
  age: number | null,
  gender: Gender | null,
  goal: GoalType | null
): number {
  if (!weight || !height || !age) return 2000;

  // One-time estimate before any activity history exists, so this still uses
  // a fixed "moderate activity" multiplier rather than the real trailing
  // average useAutoMaintenanceCalories computes once there's data to average.
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = bmr * 1.55; // moderate activity

  if (goal === 'lose') return Math.round((tdee - 500) / 50) * 50;
  if (goal === 'gain') return Math.round((tdee + 300) / 50) * 50;
  return Math.round(tdee / 50) * 50;
}

function suggestSplit(workoutsPerWeek: number): TrainingSplit {
  if (workoutsPerWeek <= 3) return 'full_body3';
  if (workoutsPerWeek === 4) return 'upper_lower4';
  if (workoutsPerWeek === 5) return 'ppl5';
  return 'ppl6';
}

function suggestSleep(age: number | null): number {
  if (!age) return 8;
  if (age < 25) return 8.5;
  if (age > 65) return 7.5;
  return 8;
}

const SPLIT_LABELS: Record<TrainingSplit, string> = {
  full_body3: 'Full Body (3-day)',
  upper_lower4: 'Upper/Lower (4-day)',
  ppl5: 'Push/Pull/Legs (5-day)',
  ppl6: 'Push/Pull/Legs (6-day)',
  custom: 'Custom',
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    weight_goal_type: null,
    profile: { age: null, height_cm: null, weight_kg: null, gender: null },
    daily_water_goal: 3,
    weekly_workout_goal: 4,
    training_split: 'upper_lower4',
    sleep_goal: 8,
    daily_calorie_goal: 2000,
  });
  const { completeOnboarding } = useUserPreferences();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When moving to step 2, auto-suggest water based on weight
  const applySmartDefaults = useCallback((nextStep: number, currentData: OnboardingData) => {
    const updated = { ...currentData };
    const { profile, weight_goal_type } = currentData;

    if (nextStep === 1) {
      updated.daily_water_goal = suggestWater(profile.weight_kg);
    }
    if (nextStep === 2) {
      updated.daily_calorie_goal = suggestCalories(
        profile.weight_kg, profile.height_cm, profile.age, profile.gender, weight_goal_type
      );
      updated.training_split = suggestSplit(updated.weekly_workout_goal);
    }
    if (nextStep === 3) {
      updated.sleep_goal = suggestSleep(profile.age);
    }

    return updated;
  }, []);

  const handleNext = () => {
    haptic('light');
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      const updatedData = applySmartDefaults(nextStep, data);
      setData(updatedData);
      setStep(nextStep);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const { profile, training_split, ...prefs } = data;

      // Save preferences (standard fields)
      await completeOnboarding({
        ...prefs,
        training_split,
        routine_setup_completed: true,
      });

      // Save profile fields directly to user_preferences
      if (user) {
        await supabase.from('user_preferences').update({
          age: profile.age,
          height_cm: profile.height_cm,
          gender: profile.gender,
        }).eq('user_id', user.id);
      }

      // Save initial bodyweight to daily_metrics
      if (profile.weight_kg && user) {
        const today = localDateKey();
        await supabase.from('daily_metrics').upsert({
          user_id: user.id,
          date: today,
          bodyweight: profile.weight_kg,
        }, { onConflict: 'user_id,date' });
      }

      haptic('success');
      toast.success('Welcome to Reptrack Fitness');
      onComplete();
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) {
      const { weight_goal_type, profile } = data;
      return (
        weight_goal_type !== null &&
        profile.gender !== null &&
        profile.age !== null && profile.age > 0 &&
        profile.height_cm !== null && profile.height_cm > 0 &&
        profile.weight_kg !== null && profile.weight_kg > 0
      );
    }
    return true;
  };

  const updateProfile = (field: keyof ProfileData, value: any) => {
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
  };

  const handleWorkoutsChange = (v: number) => {
    setData(prev => ({
      ...prev,
      weekly_workout_goal: v,
      training_split: suggestSplit(v),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-border shrink-0">
        <Logo size="sm" />
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-8 h-1 transition-colors ${i <= step ? 'bg-foreground' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {step === 0 && (
          <GoalProfileStep
            goalType={data.weight_goal_type}
            profile={data.profile}
            onGoalSelect={(type) => setData({ ...data, weight_goal_type: type })}
            onProfileChange={updateProfile}
          />
        )}
        {step === 1 && (
          <HydrationStep
            value={data.daily_water_goal}
            weight={data.profile.weight_kg}
            onChange={(v) => setData({ ...data, daily_water_goal: v })}
          />
        )}
        {step === 2 && (
          <TrainingStep
            workouts={data.weekly_workout_goal}
            calories={data.daily_calorie_goal}
            split={data.training_split}
            onWorkoutsChange={handleWorkoutsChange}
            onCaloriesChange={(v) => setData({ ...data, daily_calorie_goal: v })}
            onSplitChange={(v) => setData({ ...data, training_split: v })}
          />
        )}
        {step === 3 && (
        <RecoveryStep
            value={data.sleep_goal}
            age={data.profile.age}
            onChange={(v) => setData({ ...data, sleep_goal: v })}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-border shrink-0">
        <Button
          className="w-full h-12"
          onClick={handleNext}
          disabled={!canProceed() || isSubmitting}
        >
          {step === STEPS.length - 1 ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Setting up...' : 'Get Started'}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Step 1: Goal + Profile ---

function GoalProfileStep({
  goalType,
  profile,
  onGoalSelect,
  onProfileChange,
}: {
  goalType: GoalType | null;
  profile: ProfileData;
  onGoalSelect: (type: GoalType) => void;
  onProfileChange: (field: keyof ProfileData, value: any) => void;
}) {
  const goals: { type: GoalType; label: string; description: string }[] = [
    { type: 'lose', label: 'Lose Weight', description: 'Cut fat while preserving muscle' },
    { type: 'maintain', label: 'Maintain', description: 'Stay consistent and healthy' },
    { type: 'gain', label: 'Build Muscle', description: 'Gain strength and size' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono uppercase tracking-wider">
          <Target className="w-4 h-4" />
          Step 1 of 4
        </div>
        <h1 className="text-2xl font-bold tracking-tight">About you</h1>
        <p className="text-muted-foreground">
          This helps us personalize your goals and targets.
        </p>
      </div>

      {/* Goal selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your goal</Label>
        <div className="space-y-2">
          {goals.map((goal) => (
            <button
              key={goal.type}
              onClick={() => {
                haptic('light');
                onGoalSelect(goal.type);
              }}
              className={`w-full p-3 text-left border rounded-xl transition-colors ${goalType === goal.type
                ? 'border-foreground bg-accent'
                : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="font-medium text-sm">{goal.label}</div>
              <div className="text-xs text-muted-foreground">{goal.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-4 pt-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Profile</Label>

        {/* Gender */}
        <div className="flex gap-2">
          {(['male', 'female'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                haptic('light');
                onProfileChange('gender', g);
              }}
              className={`flex-1 py-3 text-sm font-medium border rounded-xl transition-colors capitalize ${profile.gender === g
                ? 'border-foreground bg-accent'
                : 'border-border hover:border-muted-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Age, Height, Weight in a row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Age</Label>
            <Input
              type="number"
              placeholder="25"
              value={profile.age ?? ''}
              onChange={(e) => onProfileChange('age', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 input-terminal text-center"
              min={13}
              max={100}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height (cm)</Label>
            <Input
              type="number"
              placeholder="175"
              value={profile.height_cm ?? ''}
              onChange={(e) => onProfileChange('height_cm', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 input-terminal text-center"
              min={100}
              max={250}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
            <Input
              type="number"
              placeholder="70"
              value={profile.weight_kg ?? ''}
              onChange={(e) => onProfileChange('weight_kg', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 input-terminal text-center"
              min={30}
              max={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step 2: Hydration ---

function HydrationStep({
  value,
  weight,
  onChange,
}: {
  value: number;
  weight: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono uppercase tracking-wider">
          <Droplets className="w-4 h-4" />
          Step 2 of 4
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Daily water goal</h1>
        <p className="text-muted-foreground">
          {weight
            ? `Based on your weight, we suggest ${suggestWater(weight)}L per day.`
            : 'How much water do you want to drink each day?'}
        </p>
      </div>

      <div className="pt-8 space-y-8">
        <div className="text-center">
          <div className="text-6xl font-bold tracking-tighter">{value}L</div>
          <div className="text-muted-foreground mt-2">per day</div>
        </div>

        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={1}
          max={5}
          step={0.5}
          className="w-full"
        />

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>1L</span>
          <span>5L</span>
        </div>
      </div>
    </div>
  );
}

// --- Step 3: Training & Nutrition ---

function TrainingStep({
  workouts,
  calories,
  split,
  onWorkoutsChange,
  onCaloriesChange,
  onSplitChange,
}: {
  workouts: number;
  calories: number;
  split: TrainingSplit;
  onWorkoutsChange: (v: number) => void;
  onCaloriesChange: (v: number) => void;
  onSplitChange: (v: TrainingSplit) => void;
}) {
  const availableSplits: TrainingSplit[] = ['full_body3', 'upper_lower4', 'ppl5', 'ppl6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono uppercase tracking-wider">
          <Dumbbell className="w-4 h-4" />
          Step 3 of 4
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Training & nutrition</h1>
        <p className="text-muted-foreground">
          We've suggested targets based on your profile. Adjust as needed.
        </p>
      </div>

      <div className="pt-4 space-y-8">
        {/* Workouts per week */}
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Workouts per week</span>
            <span className="text-2xl font-bold">{workouts}</span>
          </div>
          <Slider
            value={[workouts]}
            onValueChange={([v]) => onWorkoutsChange(v)}
            min={1}
            max={7}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1</span>
            <span>7</span>
          </div>
        </div>

        {/* Training split */}
        <div className="space-y-3">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Training split</span>
          <div className="grid grid-cols-2 gap-2">
            {availableSplits.map((s) => (
              <button
                key={s}
                onClick={() => {
                  haptic('light');
                  onSplitChange(s);
                }}
                className={`p-3 text-left border rounded-xl transition-colors text-sm ${split === s
                  ? 'border-foreground bg-accent'
                  : 'border-border hover:border-muted-foreground'
                }`}
              >
                {SPLIT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Calories */}
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Daily calories</span>
            <span className="text-2xl font-bold">{calories.toLocaleString()}</span>
          </div>
          <Slider
            value={[calories]}
            onValueChange={([v]) => onCaloriesChange(v)}
            min={1200}
            max={4000}
            step={50}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1,200</span>
            <span>4,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step 4: Recovery ---

function RecoveryStep({
  value,
  age,
  onChange,
}: {
  value: number;
  age: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono uppercase tracking-wider">
          <Moon className="w-4 h-4" />
          Step 4 of 4
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sleep goal</h1>
        <p className="text-muted-foreground">
          We recommend {suggestSleep(age)}h based on your age. Adjust if you'd like.
        </p>
      </div>

      <div className="pt-8 space-y-8">
        <div className="text-center">
          <div className="text-6xl font-bold tracking-tighter">{value}h</div>
          <div className="text-muted-foreground mt-2">per night</div>
        </div>

        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={5}
          max={10}
          step={0.5}
          className="w-full"
        />

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>5h</span>
          <span>10h</span>
        </div>
      </div>

      <div className="pt-4 p-4 border border-border bg-accent/50 rounded-xl">
        <div className="text-sm font-medium">You're all set!</div>
        <div className="text-sm text-muted-foreground mt-1">
          You can adjust these goals anytime in Insights.
        </div>
      </div>
    </div>
  );
}
