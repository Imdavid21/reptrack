import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Lightbulb, Zap, Target, Dumbbell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
}

interface WorkoutHintProps {
  exerciseName: string;
  personalRecord?: PersonalRecord;
  recentSets?: { weight: number; reps: number }[];
}

interface Hint {
  hint: string;
  type: 'push' | 'form' | 'rest' | 'pr_attempt';
  suggested_weight?: number;
  suggested_reps?: number;
}

const HINT_ICONS = {
  push: Zap,
  form: Target,
  rest: Dumbbell,
  pr_attempt: Lightbulb,
};

const HINT_COLORS = {
  push: 'border-primary bg-primary/5',
  form: 'border-muted-foreground bg-muted/30',
  rest: 'border-warning bg-warning/5',
  pr_attempt: 'border-success bg-success/5',
};

export function WorkoutHint({ exerciseName, personalRecord, recentSets }: WorkoutHintProps) {
  const { preferences } = useUserPreferences();
  const [hint, setHint] = useState<Hint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHint = async () => {
      setIsLoading(true);
      try {
        const userProfile = preferences ? {
          age: (preferences as any).age,
          fitness_goal: (preferences as any).fitness_goal,
          activity_level: (preferences as any).activity_level,
        } : undefined;

        const { data, error } = await supabase.functions.invoke('workout-hints', {
          body: { 
            exercise: exerciseName, 
            personalRecord,
            recentSets,
            userProfile,
          },
        });

        if (!error && data) {
          setHint(data);
        }
      } catch (error) {
        console.error('Failed to fetch hint:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHint();
  }, [exerciseName, personalRecord, recentSets, preferences]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 border border-border text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Getting tip...</span>
      </div>
    );
  }

  if (!hint) return null;

  const Icon = HINT_ICONS[hint.type] || Lightbulb;
  const colorClass = HINT_COLORS[hint.type] || 'border-border';

  return (
    <div className={cn("flex items-start gap-2 p-2 border text-sm", colorClass)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <span>{hint.hint}</span>
        {(hint.suggested_weight || hint.suggested_reps) && (
          <span className="text-muted-foreground ml-1">
            ({hint.suggested_weight && `${hint.suggested_weight}kg`}
            {hint.suggested_weight && hint.suggested_reps && ' × '}
            {hint.suggested_reps && `${hint.suggested_reps} reps`})
          </span>
        )}
      </div>
    </div>
  );
}
