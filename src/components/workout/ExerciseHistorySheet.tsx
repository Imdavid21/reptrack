import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ExerciseHistorySheetProps {
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HistoryRow = {
  id: string;
  workout_id: string;
  name: string;
  actual_weight: string | null;
  actual_reps: string | null;
  completed: boolean;
  sort_order: number;
  workouts: { user_id: string; date: string; day_name: string } | null;
};

function baseName(name: string) {
  return name.replace(/\s*\(Set \d+\)$/, '').trim();
}

function numberLabel(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function ExerciseHistorySheet({ exerciseName, open, onOpenChange }: ExerciseHistorySheetProps) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['exercise-history-sheet', user?.id, exerciseName],
    enabled: open && !!user && !!exerciseName,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [] as HistoryRow[];
      const { data, error } = await supabase
        .from('exercises')
        .select('id,workout_id,name,actual_weight,actual_reps,completed,sort_order,workouts!inner(user_id,date,day_name)')
        .eq('workouts.user_id', user.id)
        .ilike('name', `${exerciseName}%`)
        .eq('completed', true)
        .limit(240);
      if (error) throw error;
      return (data || []) as unknown as HistoryRow[];
    },
  });

  const sessions = useMemo(() => {
    const exact = (query.data || []).filter(row => baseName(row.name).toLowerCase() === exerciseName.trim().toLowerCase());
    const grouped = new Map<string, { date: string; dayName: string; sets: Array<{ weight: number; reps: number; order: number }> }>();
    exact.forEach(row => {
      const workout = row.workouts;
      if (!workout) return;
      const current = grouped.get(row.workout_id) || { date: workout.date, dayName: workout.day_name, sets: [] };
      current.sets.push({ weight: Number.parseFloat(row.actual_weight || '0') || 0, reps: Number.parseFloat(row.actual_reps || '0') || 0, order: row.sort_order || 0 });
      grouped.set(row.workout_id, current);
    });
    return [...grouped.values()]
      .map(session => ({ ...session, sets: session.sets.sort((a, b) => a.order - b.order) }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [query.data, exerciseName]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px] max-h-[86dvh]">
        <DrawerHeader className="px-5 text-left">
          <DrawerTitle>{exerciseName}</DrawerTitle>
          <p className="type-supporting">Recent logged performance</p>
        </DrawerHeader>
        <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] overflow-y-auto">
          {query.isLoading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading exercise history…</div>
          ) : query.isError ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="font-semibold">Couldn’t load exercise history.</div>
              <button onClick={() => query.refetch()} className="mt-2 min-h-10 text-sm font-semibold underline underline-offset-4">Retry</button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8">
              <div className="font-semibold">First logged session</div>
              <p className="type-supporting mt-1">Your previous performance will appear here next time.</p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {sessions.map((session, index) => {
                const weighted = session.sets.some(set => set.weight > 0);
                const best = [...session.sets].sort((a, b) => {
                  if (weighted) {
                    const aScore = a.weight * (1 + a.reps / 30);
                    const bScore = b.weight * (1 + b.reps / 30);
                    return bScore - aScore;
                  }
                  return b.reps - a.reps;
                })[0];
                return (
                  <section key={`${session.date}-${index}`} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{format(parseISO(session.date), 'EEE, MMM d')}</div>
                        <div className="type-caption mt-0.5">{session.dayName}</div>
                      </div>
                      {best && <div className="text-right"><div className="type-caption">Best set</div><div className="text-sm font-semibold tabular-nums">{weighted ? `${numberLabel(best.weight)} kg × ${best.reps}` : `${best.reps} reps`}</div></div>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.sets.map((set, setIndex) => (
                        <span key={setIndex} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium tabular-nums">
                          {set.weight > 0 ? `${numberLabel(set.weight)} × ${set.reps}` : `${set.reps} reps`}
                        </span>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
