import { usePerformanceCorrelations, useProgressionTrends, useDeloadRecommendation } from '@/hooks/usePerformanceCorrelations';
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, Activity, Moon, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IntelligenceInsights() {
  const { correlations, isLoading: correlationsLoading } = usePerformanceCorrelations();
  const { data: trends, isLoading: trendsLoading } = useProgressionTrends();
  const { data: deload, isLoading: deloadLoading } = useDeloadRecommendation();

  const isLoading = correlationsLoading || trendsLoading || deloadLoading;

  if (isLoading) {
    return (
      <div className="border border-border p-4">
        <div className="text-xs text-muted-foreground">Analyzing performance data...</div>
      </div>
    );
  }

  // PR attempts ready
  const prReady = trends?.filter(t => t.prAttemptReady) || [];
  
  // Stalling exercises
  const stalling = trends?.filter(t => t.stalling) || [];

  // Strong correlations only
  const strongCorrelations = correlations?.filter(c => c.strength === 'strong' || c.strength === 'moderate') || [];

  const hasContent = prReady.length > 0 || stalling.length > 0 || strongCorrelations.length > 0 || deload?.recommended;

  if (!hasContent) {
    return (
      <div className="border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4" />
          <h3 className="text-sm font-bold">INTELLIGENCE</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Log more workouts to unlock performance insights and predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Activity className="h-4 w-4" />
        <h3 className="text-sm font-bold">INTELLIGENCE</h3>
      </div>

      {/* Deload Alert */}
      {deload?.recommended && (
        <div className={cn(
          'p-4 border-b border-border',
          deload.urgency === 'high' && 'bg-destructive/10',
          deload.urgency === 'medium' && 'bg-warning/10'
        )}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              deload.urgency === 'high' && 'text-destructive',
              deload.urgency === 'medium' && 'text-warning'
            )} />
            <div>
              <div className="text-sm font-medium">
                {deload.urgency === 'high' ? 'DELOAD RECOMMENDED' : 'CONSIDER DELOAD'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {deload.reason}
              </div>
              {deload.indicators.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {deload.indicators.map((ind, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-muted-foreground/50">→</span> {ind}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PR Attempts Ready */}
      {prReady.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">PR ATTEMPTS READY</span>
          </div>
          <div className="space-y-2">
            {prReady.slice(0, 3).map((t) => (
              <div key={t.exerciseName} className="flex items-center justify-between text-sm">
                <span>{t.exerciseName}</span>
                <span className="font-mono text-primary">
                  Try {t.prSuggestion}kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stalling Exercises */}
      {stalling.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">STALLING</span>
          </div>
          <div className="space-y-2">
            {stalling.slice(0, 3).map((t) => (
              <div key={t.exerciseName} className="flex items-center justify-between text-sm">
                <span>{t.exerciseName}</span>
                <span className="text-xs text-muted-foreground">
                  Stuck at {t.currentWeight}kg
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Consider: volume increase, variation, or deload
          </p>
        </div>
      )}

      {/* Correlations */}
      {strongCorrelations.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">CORRELATIONS</span>
          </div>
          <div className="space-y-3">
            {strongCorrelations.slice(0, 3).map((c, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  {c.variable1 === 'Sleep' && <Moon className="h-3 w-3 text-muted-foreground" />}
                  {c.variable1 === 'Pre-workout Energy' && <Zap className="h-3 w-3 text-muted-foreground" />}
                  <span className="font-medium">
                    {c.variable1} → {c.variable2}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5',
                    c.strength === 'strong' && 'bg-primary/10 text-primary',
                    c.strength === 'moderate' && 'bg-muted text-muted-foreground'
                  )}>
                    r={c.coefficient.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 pl-5">
                  {c.insight}
                </div>
                <div className="text-xs mt-1 pl-5">
                  → {c.actionable}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progression Summary */}
      {trends && trends.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">PROGRESSION TRENDS</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {trends.slice(0, 4).map((t) => (
              <div key={t.exerciseName} className="flex items-center justify-between">
                <span className="truncate">{t.exerciseName}</span>
                <span className={cn(
                  t.weeklyIncrease > 0 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {t.weeklyIncrease > 0 ? '+' : ''}{t.weeklyIncrease}kg/wk
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
