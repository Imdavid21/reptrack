import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, TrendingUp, Check, Moon, ArrowRight, Clock3, Dumbbell } from 'lucide-react';
import { useNextWorkout } from '@/hooks/useNextWorkout';
import { haptic } from '@/lib/haptics';

export function NextWorkoutCard() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const next = useNextWorkout();

  if (!next) return null;

  const openWorkout = () => {
    haptic(next.isRestDay ? 'light' : 'medium');
    navigate(`/app/log?day=${encodeURIComponent(next.dayKey)}`);
  };

  if (next.completedToday) {
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[28px] border border-energy/25 bg-gradient-to-br from-energy-soft via-card to-card p-5 shadow-[0_18px_50px_hsl(var(--energy)/0.12)]"
      >
        <div aria-hidden className="absolute -right-10 -top-14 h-32 w-32 rounded-full bg-energy/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-energy text-energy-foreground shadow-lg shadow-energy/20">
            <Check className="h-5 w-5" strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-[-0.015em]">Training complete</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Recover now. {next.dayName} is ready for your next session.
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (next.isRestDay) {
    return (
      <motion.button
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        onClick={openWorkout}
        className="group relative w-full overflow-hidden rounded-[28px] border border-recover/25 bg-gradient-to-br from-recover-soft via-card to-card p-5 text-left shadow-[0_18px_50px_hsl(var(--recover)/0.1)]"
      >
        <div aria-hidden className="absolute -right-8 -top-12 h-28 w-28 rounded-full bg-recover/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-recover-soft text-recover-ink">
            <Moon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-recover-ink">Today</div>
            <div className="mt-0.5 text-xl font-bold tracking-[-0.025em]">Rest and recover</div>
            <div className="mt-1 text-xs text-muted-foreground">Feeling strong? {next.dayName} is still available.</div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </motion.button>
    );
  }

  const estMinutes = Math.max(20, next.totalExercises * 8);
  const upgrades = next.exercises.filter(e => e.trend === 'up').slice(0, 2);

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 34 }}
      className="relative overflow-hidden rounded-[30px] border border-energy/25 bg-gradient-to-br from-energy-soft via-card to-card shadow-[0_22px_60px_hsl(var(--energy)/0.14)]"
      aria-labelledby="next-workout-title"
    >
      <div aria-hidden className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-energy/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-water/10 blur-3xl" />

      <div className="relative p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-energy-ink">
              <Dumbbell className="h-3.5 w-3.5" />
              Your next session
            </div>
            <h2 id="next-workout-title" className="display-type mt-2 truncate text-[2rem] font-bold">
              {next.dayName}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{next.focus}</p>
          </div>
          {next.upgrades > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-energy/20 bg-background/70 px-2.5 py-1.5 text-[11px] font-bold text-energy-ink backdrop-blur">
              <TrendingUp className="h-3.5 w-3.5" />
              {next.upgrades} targets
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full bg-background/65 px-2.5 py-1.5 backdrop-blur">
            <Dumbbell className="h-3.5 w-3.5" />
            {next.totalExercises} exercises
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-background/65 px-2.5 py-1.5 backdrop-blur">
            <Clock3 className="h-3.5 w-3.5" />
            About {estMinutes} min
          </span>
        </div>

        {upgrades.length > 0 && (
          <div className="mt-4 rounded-2xl border border-foreground/5 bg-background/55 p-3 backdrop-blur">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Progress targets
            </div>
            <div className="space-y-2">
              {upgrades.map(ex => (
                <div key={ex.name} className="flex items-center gap-2 text-xs">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-energy-soft text-energy-ink">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="min-w-0 flex-1 truncate font-semibold">{ex.name}</span>
                  <span className="shrink-0 font-bold tabular-nums text-energy-ink">{ex.weight} × {ex.reps}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative px-3 pb-3">
        <motion.button
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          onClick={openWorkout}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-foreground px-5 text-sm font-bold text-background shadow-lg shadow-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Start {next.dayName}
          <ArrowRight className="ml-1 h-4 w-4 opacity-60" />
        </motion.button>
      </div>
    </motion.section>
  );
}
