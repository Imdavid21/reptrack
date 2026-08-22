import { Coffee } from 'lucide-react';
import type { CaffeineAnalytics } from '@/hooks/useCaffeineData';

export function CaffeineEvidenceCard({ data, dailyLimit }: { data?: CaffeineAnalytics; dailyLimit: number }) {
  const tracked = data?.dailyData.filter(day => day.logs > 0) ?? [];
  if (!tracked.length) return null;

  const peak = Math.max(dailyLimit, ...tracked.map(day => day.totalMg), 1);
  const latest = tracked.at(-1);

  return <section className="border-y border-border py-4" aria-labelledby="caffeine-evidence-title">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="type-eyebrow flex items-center gap-2"><Coffee className="h-3.5 w-3.5" />Caffeine context</p>
        <h3 id="caffeine-evidence-title" className="mt-1 type-component-title">Food-log caffeine evidence</h3>
      </div>
      <span className="type-meta tabular-nums">Current limit ≤{Math.round(dailyLimit)} mg</span>
    </div>

    <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
      <div className="bg-card p-3"><p className="type-meta">Tracked-day average</p><p className="mt-1 type-card-title tabular-nums">{Math.round(data?.totals.avgDailyMg ?? 0)} mg</p></div>
      <div className="bg-card p-3"><p className="type-meta">Tracked days</p><p className="mt-1 type-card-title tabular-nums">{tracked.length}</p></div>
      <div className="bg-card p-3"><p className="type-meta">Latest tracked day</p><p className="mt-1 type-card-title tabular-nums">{Math.round(latest?.totalMg ?? 0)} mg</p></div>
    </div>

    <div className="mt-4 flex h-20 items-end gap-1" aria-label="Caffeine totals from food and drink logs">
      {tracked.slice(-30).map(day => <div key={day.date} className="flex-1 rounded-t bg-fuel/60" style={{ height: `${Math.max(4, Math.min(100, day.totalMg / peak * 100))}%` }} title={`${day.displayDate}: ${Math.round(day.totalMg)} mg`} />)}
    </div>
    <p className="mt-2 type-supporting">Caffeine comes from the same food and drink records used for calories and macros. Historical limit comparisons live in Insights, where each day is judged against the limit that applied on that date. RepTrack does not infer sleep, recovery, or performance effects from caffeine alone.</p>
  </section>;
}
