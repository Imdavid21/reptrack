import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Check, Moon, ArrowRight } from 'lucide-react';
import { useNextWorkout } from '@/hooks/useNextWorkout';
import { haptic } from '@/lib/haptics';

/**
 * The Today hero: tells the user exactly what to train next and what to beat,
 * computed from their own history. One tap drops them straight into the session
 * pre-loaded. This is the app's core "do a little more" engine.
 */
export function NextWorkoutCard() {
  const navigate = useNavigate();
  const next = useNextWorkout();

  if (!next) return null;

  // Already trained today — celebrate, don't nag.
  if (next.completedToday) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-energy/10 border border-energy/30">
        <div className="h-9 w-9 rounded-full bg-energy flex items-center justify-center shrink-0">
          <Check className="h-5 w-5 text-energy-foreground" strokeWidth={3} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">Today's session is done</div>
          <div className="text-[11px] text-muted-foreground">Recovery is where you grow. {next.dayName} is up next time.</div>
        </div>
      </div>
    );
  }

  // Scheduled rest day — offer an optional session without pressure.
  if (next.isRestDay) {
    return (
      <button
        onClick={() => { haptic('light'); navigate(`/app/log?day=${encodeURIComponent(next.dayKey)}`); }}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border hover:bg-muted/40 active:scale-[0.99] transition-all text-left"
      >
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Moon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Rest day</div>
          <div className="text-[11px] text-muted-foreground">Feeling good? Train {next.dayName} anyway.</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  const estMinutes = Math.max(20, next.totalExercises * 8);
  const upgrades = next.exercises.filter(e => e.trend === 'up').slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Next up</div>
            <div className="text-lg font-bold leading-tight mt-0.5 truncate">{next.dayName}</div>
            <div className="text-xs text-muted-foreground truncate">{next.focus}</div>
          </div>
          {next.upgrades > 0 && (
            <span className="badge-energy shrink-0">
              <TrendingUp className="h-3 w-3" />
              {next.upgrades} to beat
            </span>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground mt-2">
          {next.totalExercises} exercises · ≈{estMinutes} min
        </div>

        {/* Progression highlights — the "do more" prompt, with an honest reason */}
        {upgrades.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {upgrades.map((ex) => (
              <div key={ex.name} className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-energy-ink shrink-0" />
                <span className="font-semibold truncate">{ex.name}</span>
                <span className="text-energy-ink font-bold tabular-nums shrink-0">{ex.weight} × {ex.reps}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => { haptic('medium'); navigate(`/app/log?day=${encodeURIComponent(next.dayKey)}`); }}
        className="w-full btn-energy rounded-none py-3.5 flex items-center justify-center gap-2"
      >
        <Play className="h-4 w-4" fill="currentColor" />
        Start workout
      </button>
    </motion.div>
  );
}
