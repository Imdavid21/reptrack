import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { parseDateKey } from '@/lib/dateKey';
import { buildSessionRatingHistory, type HistorySet, type HistoryWorkout } from '@/lib/sessionRatingHistory';
import { cn } from '@/lib/utils';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const PADDING = 12;

export function SessionRatingTrend({
  workouts,
  sets,
  sleepByDate,
  inDeficit,
}: {
  workouts: HistoryWorkout[];
  sets: HistorySet[];
  sleepByDate?: Record<string, number | null | undefined>;
  inDeficit?: boolean;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const history = useMemo(
    () => buildSessionRatingHistory({ workouts, sets, sleepByDate, inDeficit }),
    [workouts, sets, sleepByDate, inDeficit],
  );

  if (history.sessions.length === 0) {
    return <p className="border-y border-border py-5 type-caption">No scored sessions in this range. Log a workout with completed sets to start the trend.</p>;
  }

  const sessions = history.sessions;
  const step = sessions.length > 1 ? (CHART_WIDTH - PADDING * 2) / (sessions.length - 1) : 0;
  const points = sessions.map((session, index) => ({
    session,
    x: PADDING + step * index + (sessions.length === 1 ? (CHART_WIDTH - PADDING * 2) / 2 : 0),
    y: PADDING + (1 - session.rating.score / 100) * (CHART_HEIGHT - PADDING * 2),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const active = points.find(point => point.session.id === selected) || points[points.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-5 border-y border-border py-5 md:grid-cols-4">
        <div><div className="type-caption">Scored sessions</div><div className="mt-1 text-xl font-semibold tabular-nums">{sessions.length}</div></div>
        <div><div className="type-caption">Average score</div><div className="mt-1 text-xl font-semibold tabular-nums">{history.average}</div></div>
        <div>
          <div className="type-caption">Trend</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{history.trend == null ? 'Not enough data' : `${history.trend > 0 ? '+' : history.trend < 0 ? '−' : ''}${Math.abs(history.trend)}`}</div>
          {history.trend != null && <div className="type-caption mt-0.5">recent vs early sessions</div>}
        </div>
        <div>
          <div className="type-caption">Weakest area</div>
          <div className="mt-1 text-sm font-semibold">{history.weakestDimension?.label ?? '—'}</div>
          {history.weakestDimension && <div className="type-caption mt-0.5">{history.weakestDimension.averagePercent}% of available points</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-border p-3">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-40 w-full" role="img" aria-label="Session score trend">
          {[25, 50, 75].map(value => {
            const y = PADDING + (1 - value / 100) * (CHART_HEIGHT - PADDING * 2);
            return <line key={value} x1={PADDING} x2={CHART_WIDTH - PADDING} y1={y} y2={y} className="stroke-border" strokeWidth="1" opacity="0.45" />;
          })}
          {sessions.length > 1 && <path d={line} fill="none" className="stroke-foreground" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
          {points.map(point => (
            <g key={point.session.id}>
              <circle
                cx={point.x} cy={point.y} r={point.session.id === active?.session.id ? 5 : 3}
                className={cn('cursor-pointer fill-background stroke-foreground')}
                strokeWidth="2"
                onClick={() => setSelected(point.session.id)}
              />
              <circle cx={point.x} cy={point.y} r={14} fill="transparent" className="cursor-pointer" onClick={() => setSelected(point.session.id)} />
            </g>
          ))}
        </svg>
        {active && (
          <button
            type="button"
            onClick={() => navigate(`/app/dataroom/workout/${active.session.id}`)}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-muted/30"
          >
            <span className="text-xl font-semibold tabular-nums">{active.session.rating.score}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{active.session.dayName} · {active.session.rating.label}</span>
              <span className="type-caption block">{format(parseDateKey(active.session.date), 'EEE, MMM d')}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="divide-y divide-border border-y border-border">
        {[...sessions].reverse().slice(0, 12).map(session => (
          <button
            key={session.id}
            type="button"
            onClick={() => navigate(`/app/dataroom/workout/${session.id}`)}
            className="flex w-full items-center gap-3 py-3 text-left hover:bg-muted/20"
          >
            <span className="w-9 text-base font-semibold tabular-nums">{session.rating.score}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{session.dayName}</span>
              <span className="type-caption block">{format(parseDateKey(session.date), 'MMM d')} · {session.rating.label}{session.rating.provisional ? ' · provisional' : ''}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
