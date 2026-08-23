import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useEnergyModel } from '@/hooks/useEnergyModel';
import { simulateCut, weightTrend } from '@/lib/advanced/engine';
import { Slider } from '@/components/ui/slider';

function Result({ label, value }: { label: string; value: string }) {
  return <div className="bg-card p-4"><div className="type-caption">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div></div>;
}

export default function AdvancedSimulator() {
  const { settings } = useAdvancedMode();
  const range = useMemo(() => ({ from: subDays(new Date(), 29), to: new Date() }), []);
  const data = useDataroomData(range);
  const energy = useEnergyModel(new Date());
  const trend = weightTrend(data.metrics.map(point => ({ date: point.date, bodyweight: point.bodyweight })));
  const currentWeight = trend.latest ?? Number(data.preferences?.initial_weight_kg || 70);
  const defaultTarget = Number(data.preferences?.weight_goal || Math.max(40, currentWeight - 4));
  const [target, setTarget] = useState(defaultTarget);
  const [deficit, setDeficit] = useState(Number(data.preferences?.daily_deficit_target || 500));
  const maintenance = energy.model?.personalBaseline ?? Number(data.preferences?.maintenance_calories || 2000);
  const result = simulateCut({ currentWeight, targetWeight: target, dailyDeficit: deficit, maintenance });

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><div className="type-page-title">Advanced Mode is off</div></div></MainLayout>;

  return <MainLayout showBack backTo="/app/lab" hideNav>
    <div className="mx-auto max-w-[680px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">What if</h1></header>

      <div className="grid grid-cols-3 gap-px rounded-[20px] overflow-hidden border border-border bg-border mb-6">
        <Result label="Calories" value={`${result.calories}`} />
        <Result label="Rate" value={`${result.weeklyRate} kg/wk`} />
        <Result label="ETA" value={result.weeks == null ? '—' : `${result.weeks} wk`} />
      </div>

      <section className="rounded-[20px] border border-border bg-card p-5 space-y-7">
        <div><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Goal weight</span><span className="text-lg font-semibold tabular-nums">{target.toFixed(1)} kg</span></div><Slider className="mt-4" min={Math.max(35, Math.floor(currentWeight - 20))} max={Math.ceil(currentWeight + 10)} step={0.5} value={[target]} onValueChange={([value]) => setTarget(value)} /></div>
        <div><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Daily deficit</span><span className="text-lg font-semibold tabular-nums">{deficit} kcal</span></div><Slider className="mt-4" min={0} max={1000} step={50} value={[deficit]} onValueChange={([value]) => setDeficit(value)} /></div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-px rounded-xl border border-border bg-border overflow-hidden"><Result label="Current" value={`${currentWeight.toFixed(1)} kg`} /><Result label="Baseline" value={`${Math.round(maintenance)} kcal`} /></div>
      <p className="type-caption mt-3">Static scenario, not a prediction.</p>
    </div>
  </MainLayout>;
}
