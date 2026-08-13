import { useState } from 'react';
import { StrengthZone } from '@/lib/adaptiveRoster';
import { cn } from '@/lib/utils';

const ZONES: { value: StrengthZone; label: string }[] = [
  { value: 'lock-out', label: 'Lock-out' },
  { value: 'mid-range', label: 'Mid-range' },
  { value: 'bottom-range', label: 'Bottom-range' },
  { value: 'stability', label: 'Stability' },
];

export interface FormBreakdownLoggerProps {
  defaultLeadingLoad: number;
  defaultLeadingReps: number;
  defaultBackoffLoad: number;
  defaultBackoffReps: number;
  onSubmit: (values: {
    leadingLoad: number;
    leadingReps: number;
    backoffLoad: number | null;
    backoffReps: number | null;
    weakPointZone: StrengthZone | null;
    formNote: string | null;
  }) => void;
  submitting: boolean;
}

/**
 * Session logging surface for a lifecycle's key movement: leading set and
 * back-off set logged as distinct numbers (spec Section 5), plus an optional
 * zone tag when form broke down — the only input the weak-point detector and
 * end-trigger checker (adaptiveEngine.ts) have to work with.
 */
export function FormBreakdownLogger({
  defaultLeadingLoad,
  defaultLeadingReps,
  defaultBackoffLoad,
  defaultBackoffReps,
  onSubmit,
  submitting,
}: FormBreakdownLoggerProps) {
  const [leadingLoad, setLeadingLoad] = useState(String(defaultLeadingLoad));
  const [leadingReps, setLeadingReps] = useState(String(defaultLeadingReps));
  const [backoffLoad, setBackoffLoad] = useState(String(defaultBackoffLoad));
  const [backoffReps, setBackoffReps] = useState(String(defaultBackoffReps));
  const [zone, setZone] = useState<StrengthZone | null>(null);
  const [note, setNote] = useState('');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="type-caption">Leading set</label>
          <div className="flex gap-1.5 mt-1">
            <input
              type="number"
              inputMode="decimal"
              value={leadingLoad}
              onChange={(e) => setLeadingLoad(e.target.value)}
              placeholder="kg"
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
            />
            <input
              type="number"
              inputMode="numeric"
              value={leadingReps}
              onChange={(e) => setLeadingReps(e.target.value)}
              placeholder="reps"
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className="type-caption">Back-off sets</label>
          <div className="flex gap-1.5 mt-1">
            <input
              type="number"
              inputMode="decimal"
              value={backoffLoad}
              onChange={(e) => setBackoffLoad(e.target.value)}
              placeholder="kg"
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
            />
            <input
              type="number"
              inputMode="numeric"
              value={backoffReps}
              onChange={(e) => setBackoffReps(e.target.value)}
              placeholder="reps"
              className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="type-caption">Form broke down at (optional)</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {ZONES.map((z) => (
            <button
              key={z.value}
              type="button"
              onClick={() => setZone(zone === z.value ? null : z.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
                zone === z.value ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional) — e.g. grip gave out before lockout"
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
      />

      <button
        type="button"
        disabled={submitting || !leadingLoad || !leadingReps}
        onClick={() =>
          onSubmit({
            leadingLoad: parseFloat(leadingLoad),
            leadingReps: parseInt(leadingReps, 10),
            backoffLoad: backoffLoad ? parseFloat(backoffLoad) : null,
            backoffReps: backoffReps ? parseInt(backoffReps, 10) : null,
            weakPointZone: zone,
            formNote: note.trim() || null,
          })
        }
        className="w-full py-2 rounded-xl bg-energy text-energy-foreground text-sm font-bold disabled:opacity-50"
      >
        {submitting ? 'Logging…' : 'Log session'}
      </button>
    </div>
  );
}
