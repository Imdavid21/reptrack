import { useMemo } from 'react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, eachWeekOfInterval } from 'date-fns';
import { Pill } from 'lucide-react';

const SUPPLEMENT_LABELS: Record<string, string> = {
  whey: 'Whey',
  casein: 'Casein',
  creatine: 'Creatine',
  omega3: 'Omega-3',
  vitaminD: 'Vit D',
  magnesium: 'Mg',
  zinc: 'Zinc',
};

export function SupplementAdherence() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  const { weeklyGrid, adherenceStats, daysWithData } = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) {
      return { weeklyGrid: [], adherenceStats: [], daysWithData: 0 };
    }

    const supplements = Object.keys(SUPPLEMENT_LABELS);
    
    const dateMap = new Map<string, Record<string, boolean>>();
    data.dataPoints.forEach(d => {
      if (d.supplements) {
        dateMap.set(d.date, d.supplements as Record<string, boolean>);
      }
    });

    const weeks = eachWeekOfInterval(
      { start: dateRange.from, end: dateRange.to },
      { weekStartsOn: 1 }
    );

    const weeklyGrid = supplements.map(supp => {
      const weekData = weeks.map((weekStart) => {
        let taken = 0;
        let total = 0;
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          if (day > dateRange.to) break;
          if (day < dateRange.from) continue;
          
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = dateMap.get(dateKey);
          
          if (dayData) {
            total++;
            if (dayData[supp]) taken++;
          }
        }

        return {
          weekLabel: format(weekStart, 'MMM d'),
          taken,
          total,
          percent: total > 0 ? Math.round((taken / total) * 100) : 0,
        };
      });

      return {
        key: supp,
        label: SUPPLEMENT_LABELS[supp],
        weeks: weekData,
      };
    });

    const adherenceStats = supplements.map(supp => ({
      key: supp,
      label: SUPPLEMENT_LABELS[supp],
      percent: data.supplementAdherence[supp] ?? 0,
    })).sort((a, b) => b.percent - a.percent);

    return { weeklyGrid, adherenceStats, daysWithData: data.totals.daysWithData };
  }, [data, dateRange]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold mb-4">Supplement Adherence</h3>
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  if (adherenceStats.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-insight-pink/15">
            <Pill className="h-4 w-4 text-insight-pink" />
          </div>
          <h3 className="text-sm font-semibold">Supplement Adherence</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          No supplement data yet. Log your first workout with habits!
        </p>
      </div>
    );
  }

  const getBarColor = (percent: number) => {
    if (percent >= 80) return 'bg-insight-mint';
    if (percent >= 50) return 'bg-insight-blue';
    if (percent >= 25) return 'bg-insight-yellow';
    return 'bg-insight-coral';
  };

  const getCellColor = (percent: number) => {
    if (percent === 0) return 'bg-muted/30';
    if (percent <= 25) return 'bg-insight-coral/30';
    if (percent <= 50) return 'bg-insight-yellow/30';
    if (percent <= 75) return 'bg-insight-blue/30';
    return 'bg-insight-mint/30';
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-insight-pink/15">
            <Pill className="h-4 w-4 text-insight-pink" />
          </div>
          <h3 className="text-sm font-semibold">Supplement Adherence</h3>
        </div>
        <div className="text-xs text-muted-foreground">{daysWithData} days logged</div>
      </div>

      {/* Adherence bars */}
      <div className="space-y-3 mb-5">
        {adherenceStats.map(({ key, label, percent }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-14 text-xs truncate text-muted-foreground">{label}</div>
            <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  getBarColor(percent)
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="w-10 text-xs text-right tabular-nums font-medium">
              {percent}%
            </div>
          </div>
        ))}
      </div>

      {/* Weekly grid */}
      <div className="pt-4 border-t border-border/30">
        <div className="text-xs text-muted-foreground mb-3">Weekly Breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-normal text-muted-foreground pb-2 pr-2"></th>
                {weeklyGrid[0]?.weeks.map((_, i) => (
                  <th key={i} className="text-center font-normal text-muted-foreground pb-2 px-1">
                    W{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyGrid.map(({ key, label, weeks }) => (
                <tr key={key}>
                  <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground">{label}</td>
                  {weeks.map((w, i) => (
                    <td key={i} className="text-center py-1 px-1">
                      <div
                        className={cn(
                          'w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-[10px] font-medium',
                          getCellColor(w.percent)
                        )}
                        title={`${w.weekLabel}: ${w.taken}/${w.total} days`}
                      >
                        {w.taken > 0 ? w.taken : ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
