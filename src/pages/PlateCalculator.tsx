import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedLabData, useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { Input } from '@/components/ui/input';
import { plateLoad } from '@/lib/advanced/engine';

function Plates({ value }: { value: number[] }) {
  if (!value.length) return <span className="type-caption">Bar only</span>;
  return <div className="flex flex-wrap gap-1.5">{value.map((plate, index) => <span key={`${plate}-${index}`} className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold tabular-nums">{plate}</span>)}</div>;
}

export default function PlateCalculator() {
  const { settings } = useAdvancedMode();
  const lab = useAdvancedLabData(settings.enabled);
  const exerciseSets = useExerciseSets();
  const gym = lab.gyms.find(item => item.isDefault) ?? lab.gyms[0];
  const [target, setTarget] = useState(100);
  const bar = gym?.barWeightKg ?? 20;
  const denominations = gym?.platesKg?.length ? gym.platesKg : [25,20,15,10,5,2.5,1.25];
  const result = plateLoad(target, bar, denominations);

  const historical = useMemo(() => {
    const map = new Map<number, { weight: number; lastDate: string; count: number }>();
    (exerciseSets.data?.sets ?? []).filter(set => Number(set.actual_weight) > bar).forEach(set => {
      const weight = Number(set.actual_weight);
      const current = map.get(weight) ?? { weight, lastDate: set.workout_date || '', count: 0 };
      current.count += 1;
      if ((set.workout_date || '') > current.lastDate) current.lastDate = set.workout_date || '';
      map.set(weight, current);
    });
    return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate)).slice(0, 20);
  }, [exerciseSets.data?.sets, bar]);

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  return <MainLayout showBack backTo="/app/lab" hideNav>
    <div className="mx-auto max-w-[720px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">Plates</h1><p className="type-caption mt-1">{gym?.name || 'Default'} · {bar} kg bar</p></header>

      <section className="rounded-[20px] border border-border bg-card p-5 mb-5"><div className="grid grid-cols-[1fr_auto] gap-4 items-end"><div><div className="type-caption mb-1">Total load</div><Input type="number" inputMode="decimal" step="0.5" value={target} onChange={event => setTarget(Number(event.target.value) || 0)} className="h-14 text-2xl font-semibold tabular-nums"/></div><div className="pb-3 text-sm font-semibold">kg</div></div><div className="mt-5 border-y border-border py-4"><div className="type-caption mb-2">Each side</div><Plates value={result.perSide}/></div><div className="mt-4 grid grid-cols-2 gap-4"><div><div className="type-caption">Loaded</div><div className="text-xl font-semibold tabular-nums">{result.loadedKg} kg</div></div><div><div className="type-caption">Delta</div><div className="text-xl font-semibold tabular-nums">{result.deltaKg > 0 ? '+' : ''}{result.deltaKg} kg</div></div></div></section>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden"><div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3"><span className="text-sm font-semibold">From old logs</span>{exerciseSets.isLoading && <span className="type-caption">Loading…</span>}</div><div className="divide-y divide-border">{historical.map(item => { const plates = plateLoad(item.weight, bar, denominations); return <button key={item.weight} onClick={() => setTarget(item.weight)} className="w-full p-4 text-left hover:bg-muted/30"><div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold tabular-nums">{item.weight} kg</div><div className="type-caption mt-0.5">{item.lastDate} · {item.count} sets</div></div><Plates value={plates.perSide}/></div></button>; })}{!exerciseSets.isLoading && !historical.length && <div className="p-4 type-caption">No plate-loaded history found.</div>}</div></section>
    </div>
  </MainLayout>;
}
