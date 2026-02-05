import { useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';
import { Droplets, Dumbbell, Moon, Target, ArrowRight, Check } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type GoalType = 'lose' | 'gain' | 'maintain';

interface OnboardingData {
  weight_goal_type: GoalType | null;
  daily_water_goal: number;
  weekly_workout_goal: number;
  sleep_goal: number;
  daily_calorie_goal: number;
}

const STEPS = ['goal', 'hydration', 'training', 'recovery'] as const;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    weight_goal_type: null,
    daily_water_goal: 3,
    weekly_workout_goal: 4,
    sleep_goal: 8,
    daily_calorie_goal: 2000,
  });
  const { completeOnboarding } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    haptic('light');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding(data);
      haptic('success');
      toast.success('Welcome to reptrack.fitness');
      onComplete();
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return data.weight_goal_type !== null;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-border">
        <Logo size="sm" />
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-8 h-1 transition-colors ${i <= step ? 'bg-foreground' : 'bg-muted'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {step === 0 && (
          <GoalStep
            selected={data.weight_goal_type}
            onSelect={(type) => setData({ ...data, weight_goal_type: type })}
          />
        )}
        {step === 1 && (
          <HydrationStep
            value={data.daily_water_goal}
            onChange={(v) => setData({ ...data, daily_water_goal: v })}
          />
        )}
        {step === 2 && (
          <TrainingStep
            workouts={data.weekly_workout_goal}
            calories={data.daily_calorie_goal}
            onWorkoutsChange={(v) => setData({ ...data, weekly_workout_goal: v })}
            onCaloriesChange={(v) => setData({ ...data, daily_calorie_goal: v })}
          />
        )}
        {step === 3 && (
          <RecoveryStep
            value={data.sleep_goal}
            onChange={(v) => setData({ ...data, sleep_goal: v })}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border safe-area-bottom">
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

function GoalStep({
  selected,
  onSelect,
}: {
  selected: GoalType | null;
  onSelect: (type: GoalType) => void;
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
        <h1 className="text-2xl font-bold tracking-tight">What's your goal?</h1>
        <p className="text-muted-foreground">
          This helps us personalize your tracking experience.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        {goals.map((goal) => (
          <button
            key={goal.type}
            onClick={() => {
              haptic('light');
              onSelect(goal.type);
            }}
            className={`w-full p-4 text-left border transition-colors ${selected === goal.type
                ? 'border-foreground bg-accent'
                : 'border-border hover:border-muted-foreground'
              }`}
          >
            <div className="font-medium">{goal.label}</div>
            <div className="text-sm text-muted-foreground">{goal.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HydrationStep({
  value,
  onChange,
}: {
  value: number;
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
          How much water do you want to drink each day?
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

function TrainingStep({
  workouts,
  calories,
  onWorkoutsChange,
  onCaloriesChange,
}: {
  workouts: number;
  calories: number;
  onWorkoutsChange: (v: number) => void;
  onCaloriesChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono uppercase tracking-wider">
          <Dumbbell className="w-4 h-4" />
          Step 3 of 4
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Training & nutrition</h1>
        <p className="text-muted-foreground">
          Set your weekly training and daily calorie targets.
        </p>
      </div>

      <div className="pt-4 space-y-8">
        {/* Workouts */}
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
            step={100}
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

function RecoveryStep({
  value,
  onChange,
}: {
  value: number;
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
          How many hours of sleep do you aim for?
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

      <div className="pt-4 p-4 border border-border bg-accent/50">
        <div className="text-sm font-medium">You're all set!</div>
        <div className="text-sm text-muted-foreground mt-1">
          You can adjust these goals anytime in Settings.
        </div>
      </div>
    </div>
  );
}
