/**
 * ML-based insights engine - uses statistical analysis instead of LLM calls
 * Generates actionable coaching insights from workout and health data
 */

export interface WorkoutSummary {
  totalWorkouts: number;
  exerciseProgress: { name: string; startWeight: number; currentWeight: number; change: number }[];
  avgSleep: number | null;
  avgEnergy: number | null;
  supplementAdherence: Record<string, number>;
  pullupTotal: number;
  volumeBreakdown: { push: number; pull: number; legs: number };
  daysActive: number;
  sleepEnergyCorrelation?: number;
  volumeTrend?: 'increasing' | 'decreasing' | 'stable';
  consistencyScore?: number;
}

interface Insight {
  category: 'strength' | 'recovery' | 'balance' | 'consistency' | 'progress';
  priority: number; // 1-5, higher = more important
  text: string;
  icon: string;
}

/**
 * Generate ML-based insights from workout summary data
 * Uses rule-based analysis and statistical thresholds
 */
export function generateMLInsights(summary: WorkoutSummary): Insight[] {
  const insights: Insight[] = [];

  // === STRENGTH PROGRESS ANALYSIS ===
  const progressingExercises = summary.exerciseProgress.filter(e => e.change > 0);
  const stalledExercises = summary.exerciseProgress.filter(e => e.change === 0);
  const regressingExercises = summary.exerciseProgress.filter(e => e.change < 0);

  if (progressingExercises.length > 0) {
    const bestGain = progressingExercises.reduce((a, b) => a.change > b.change ? a : b);
    insights.push({
      category: 'strength',
      priority: 4,
      text: `${bestGain.name} up ${bestGain.change.toFixed(1)}kg — keep progressive overload going.`,
      icon: '💪',
    });
  }

  if (stalledExercises.length >= 2) {
    insights.push({
      category: 'strength',
      priority: 3,
      text: `${stalledExercises.length} lifts plateaued — consider deload week or rep scheme change.`,
      icon: '⚠️',
    });
  }

  if (regressingExercises.length > 0) {
    insights.push({
      category: 'recovery',
      priority: 5,
      text: `Some lifts down — check sleep, nutrition, or accumulated fatigue.`,
      icon: '🔻',
    });
  }

  // === RECOVERY ANALYSIS ===
  if (summary.avgSleep !== null) {
    if (summary.avgSleep < 6) {
      insights.push({
        category: 'recovery',
        priority: 5,
        text: `${summary.avgSleep.toFixed(1)}h avg sleep is low — aim for 7-9h for gains.`,
        icon: '😴',
      });
    } else if (summary.avgSleep >= 7.5) {
      insights.push({
        category: 'recovery',
        priority: 2,
        text: `${summary.avgSleep.toFixed(1)}h avg sleep is optimal for recovery.`,
        icon: '✓',
      });
    }
  }

  if (summary.avgEnergy !== null) {
    if (summary.avgEnergy < 5) {
      insights.push({
        category: 'recovery',
        priority: 4,
        text: `Energy averaging ${summary.avgEnergy.toFixed(1)}/10 — prioritize rest days.`,
        icon: '⚡',
      });
    } else if (summary.avgEnergy >= 7) {
      insights.push({
        category: 'recovery',
        priority: 2,
        text: `High energy (${summary.avgEnergy.toFixed(1)}/10) — good recovery signals.`,
        icon: '🔋',
      });
    }
  }

  // === VOLUME BALANCE ANALYSIS ===
  const { push, pull, legs } = summary.volumeBreakdown;
  const total = push + pull + legs;
  
  if (total > 0) {
    const pushPct = (push / total) * 100;
    const pullPct = (pull / total) * 100;
    const legsPct = (legs / total) * 100;

    // Check for imbalances (>15% deviation from 33%)
    const imbalances: string[] = [];
    if (pushPct > 45) imbalances.push('heavy on push');
    if (pullPct > 45) imbalances.push('heavy on pull');
    if (legsPct > 45) imbalances.push('heavy on legs');
    if (pushPct < 20) imbalances.push('lacking push');
    if (pullPct < 20) imbalances.push('lacking pull');
    if (legsPct < 20) imbalances.push('skipping legs');

    if (imbalances.length > 0) {
      insights.push({
        category: 'balance',
        priority: 3,
        text: `Volume ${imbalances.join(', ')} — balance prevents imbalances.`,
        icon: '⚖️',
      });
    } else if (total > 10000) {
      insights.push({
        category: 'balance',
        priority: 2,
        text: `Good push/pull/legs balance at ${Math.round(pushPct)}/${Math.round(pullPct)}/${Math.round(legsPct)}%.`,
        icon: '✓',
      });
    }
  }

  // === CONSISTENCY ANALYSIS ===
  if (summary.daysActive > 0 && summary.totalWorkouts > 0) {
    if (summary.daysActive >= 4) {
      insights.push({
        category: 'consistency',
        priority: 3,
        text: `${summary.daysActive} active days — consistency drives results.`,
        icon: '📅',
      });
    } else if (summary.daysActive <= 2) {
      insights.push({
        category: 'consistency',
        priority: 4,
        text: `Only ${summary.daysActive} active days — aim for 3-4x per week minimum.`,
        icon: '📆',
      });
    }
  }

  // === SUPPLEMENT ADHERENCE ===
  const adherenceValues = Object.values(summary.supplementAdherence).filter(v => v > 0);
  if (adherenceValues.length > 0) {
    const avgAdherence = adherenceValues.reduce((a, b) => a + b, 0) / adherenceValues.length;
    
    if (avgAdherence < 50) {
      insights.push({
        category: 'consistency',
        priority: 2,
        text: `Supplement adherence at ${Math.round(avgAdherence)}% — build the habit.`,
        icon: '💊',
      });
    } else if (avgAdherence >= 80) {
      insights.push({
        category: 'consistency',
        priority: 1,
        text: `Strong supplement routine at ${Math.round(avgAdherence)}% adherence.`,
        icon: '✓',
      });
    }
  }

  // === PULL-UP PROGRESS ===
  if (summary.pullupTotal > 0) {
    if (summary.pullupTotal >= 100) {
      insights.push({
        category: 'progress',
        priority: 2,
        text: `${summary.pullupTotal} total pull-ups — excellent pulling volume.`,
        icon: '🎯',
      });
    } else if (summary.pullupTotal < 30 && summary.daysActive >= 3) {
      insights.push({
        category: 'progress',
        priority: 2,
        text: `Add more pull-up volume — aim for greasing the groove.`,
        icon: '🔝',
      });
    }
  }

  // Sort by priority and take top 5
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

