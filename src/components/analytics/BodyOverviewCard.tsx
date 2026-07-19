import { motion } from 'framer-motion';
import { Dumbbell, Flame, Moon, Droplets, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BodyOverview, PillarKey, PillarResult } from '@/lib/bodyScore';
import { Skeleton } from '@mui/material';

// Static class maps so Tailwind can see every class at build time.
const PILLAR_META: Record<PillarKey, {
  label: string;
  icon: typeof Dumbbell;
  text: string;
  bar: string;
  chip: string;
}> = {
  training: { label: 'Training', icon: Dumbbell, text: 'text-energy-ink', bar: 'bg-energy', chip: 'bg-energy-soft' },
  fuel: { label: 'Fuel', icon: Flame, text: 'text-fuel-ink', bar: 'bg-fuel', chip: 'bg-fuel-soft' },
  recovery: { label: 'Recovery', icon: Moon, text: 'text-recover-ink', bar: 'bg-recover', chip: 'bg-recover-soft' },
  hydration: { label: 'Hydration', icon: Droplets, text: 'text-water-ink', bar: 'bg-water', chip: 'bg-water-soft' },
};

const PILLAR_ORDER: PillarKey[] = ['training', 'fuel', 'recovery', 'hydration'];

function scoreWord(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'On track';
  if (score >= 50) return 'Needs attention';
  return 'Off track';
}

function TrendIcon({ trend }: { trend: PillarResult['trend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-energy-ink" aria-label="trending up" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-destructive" aria-label="trending down" />;
  return <Minus className="h-3 w-3 text-muted-foreground/50" aria-label="flat" />;
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={score != null ? `Body score ${score} out of 100` : 'No body score yet'}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        {score != null && (
          <motion.circle
            cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
            className="stroke-energy"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * pct) / 100 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold tabular-nums leading-none">{score ?? '—'}</span>
      </div>
    </div>
  );
}

interface Props {
  overview: BodyOverview | null;
  isLoading: boolean;
}

/**
 * North-star hero: one composite body score plus the four pillars that feed
 * it, each with its own consistent color, real value, sample size, and trend.
 */
export function BodyOverviewCard({ overview, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rounded" height={210} sx={{ borderRadius: 3 }} />;
  }

  if (!overview) return null;

  if (overview.overall == null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <div className="text-sm font-bold mb-1">Your body overview starts here</div>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Log a few workouts, meals, nights of sleep, and water to unlock your
          composite body score and personalized next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-5">
        <ScoreRing score={overview.overall} />
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight">{scoreWord(overview.overall)}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across training, fuel, recovery and hydration.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {PILLAR_ORDER.map((key) => {
          const p = overview.pillars[key];
          const meta = PILLAR_META[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className={`h-7 w-7 rounded-lg ${meta.chip} flex items-center justify-center shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{p.valueLabel}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  {p.score != null && (
                    <motion.div
                      className={`h-full rounded-full ${meta.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.score}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 w-14 justify-end">
                <TrendIcon trend={p.trend} />
                <span className="text-xs font-bold tabular-nums w-7 text-right">
                  {p.score != null ? p.score : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
