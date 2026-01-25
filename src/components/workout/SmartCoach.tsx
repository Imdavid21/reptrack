import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getExerciseTaxonomy } from '@/lib/exerciseTaxonomy';
import { useRecoveryMetrics } from '@/hooks/useRecoveryMetrics';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartCoachProps {
  exerciseName: string;
  category: 'Push' | 'Pull' | 'Legs';
  personalRecord?: { weight: number; reps: number } | null;
  lastWorkout?: { weight: number; reps: number; date: string } | null;
  currentSet?: { setNumber: number; targetWeight: number; targetReps: number };
  previousSetsToday?: { weight: number; reps: number; completed: boolean }[];
}

interface CoachingCue {
  cue: string;
  cue_type: 'form' | 'intensity' | 'recovery' | 'pr_attempt' | 'progressive_overload';
  intensity_modifier: 'maintain' | 'push_harder' | 'back_off' | 'deload';
  suggested_weight?: number;
  suggested_reps?: number;
  confidence?: number;
}

const CUE_TYPE_ICONS = {
  form: Target,
  intensity: TrendingUp,
  recovery: AlertTriangle,
  pr_attempt: Sparkles,
  progressive_overload: TrendingUp,
};

const CUE_TYPE_COLORS = {
  form: 'text-muted-foreground',
  intensity: 'text-foreground',
  recovery: 'text-yellow-500',
  pr_attempt: 'text-primary',
  progressive_overload: 'text-green-500',
};

export function SmartCoach({
  exerciseName,
  category,
  personalRecord,
  lastWorkout,
  currentSet,
  previousSetsToday,
}: SmartCoachProps) {
  const [cue, setCue] = useState<CoachingCue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { todayMetrics } = useRecoveryMetrics();
  
  // Get taxonomy for this exercise
  const taxonomy = getExerciseTaxonomy(exerciseName);

  const fetchCoachingCue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('smart-coach', {
        body: {
          exercise: exerciseName,
          category,
          movementPattern: taxonomy?.movementPattern || 'push',
          primaryMuscles: taxonomy?.primaryMuscles || [],
          formCues: taxonomy?.formCues || [],
          personalRecord: personalRecord || undefined,
          lastWorkout: lastWorkout || undefined,
          currentSet,
          previousSetsToday,
          recoveryScore: todayMetrics?.recovery_score,
          fatigueLevel: todayMetrics?.fatigue_level,
          muscleSoreness: todayMetrics?.muscle_soreness,
          sleepQuality: todayMetrics?.sleep_quality,
        },
      });

      if (fnError) throw fnError;
      setCue(data as CoachingCue);
    } catch (err) {
      console.error('Smart coach error:', err);
      // Fallback to taxonomy form cues
      if (taxonomy?.formCues?.length) {
        setCue({
          cue: taxonomy.formCues[0],
          cue_type: 'form',
          intensity_modifier: 'maintain',
        });
      } else {
        setError('Unable to get coaching cue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cue when exercise or set changes
  useEffect(() => {
    fetchCoachingCue();
  }, [exerciseName, currentSet?.setNumber]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Getting coaching cue...</span>
      </div>
    );
  }

  if (error || !cue) {
    return null;
  }

  const Icon = CUE_TYPE_ICONS[cue.cue_type] || Target;
  const colorClass = CUE_TYPE_COLORS[cue.cue_type] || 'text-muted-foreground';

  return (
    <div className="border border-border p-3 bg-muted/30 animate-fade-in">
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colorClass)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{cue.cue}</p>
          
          {/* Suggestions */}
          {(cue.suggested_weight || cue.suggested_reps) && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {cue.suggested_weight && (
                <span className="text-muted-foreground">
                  Weight: <span className="text-foreground font-medium">{cue.suggested_weight}kg</span>
                </span>
              )}
              {cue.suggested_reps && (
                <span className="text-muted-foreground">
                  Reps: <span className="text-foreground font-medium">{cue.suggested_reps}</span>
                </span>
              )}
            </div>
          )}
          
          {/* Intensity indicator */}
          {cue.intensity_modifier !== 'maintain' && (
            <div className={cn(
              "text-xs mt-2 font-medium",
              cue.intensity_modifier === 'push_harder' && 'text-green-500',
              cue.intensity_modifier === 'back_off' && 'text-yellow-500',
              cue.intensity_modifier === 'deload' && 'text-red-500',
            )}>
              {cue.intensity_modifier === 'push_harder' && '↑ PUSH IT'}
              {cue.intensity_modifier === 'back_off' && '↓ EASE OFF'}
              {cue.intensity_modifier === 'deload' && '⚠️ DELOAD RECOMMENDED'}
            </div>
          )}
        </div>
        
        {/* Refresh button */}
        <button
          onClick={fetchCoachingCue}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Get new cue"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
