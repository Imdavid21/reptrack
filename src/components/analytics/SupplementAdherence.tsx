import { useMemo } from 'react';
import { useHabitsData } from '@/hooks/useHabitsData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays, startOfWeek, eachWeekOfInterval } from 'date-fns';

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
  const { data, isLoading } = useHabitsData(28); // 4 weeks

  const { weeklyGrid, adherenceStats } = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) {
      return { weeklyGrid: [], adherenceStats: [] };
    }

    const supplements = Object.keys(SUPPLEMENT_LABELS);
    
    // Build date -> supplements map
    const dateMap = new Map<string, Record<string, boolean>>();
    data.dataPoints.forEach(d => {
      dateMap.set(d.date, d.supplements);
    });

    // Generate last 4 weeks
    const endDate = new Date();
    const startDate = subDays(endDate, 27);
    const weeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { weekStartsOn: 1 }
    );

    // Build weekly grid for each supplement
    const weeklyGrid = supplements.map(supp => {
      const weekData = weeks.map((weekStart, weekIdx) => {
        // Count days taken in this week
        let taken = 0;
        let total = 0;
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          if (day > endDate) break;
          
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayData = dateMap.get(dateKey);
          
          if (dayData) {
            total++;
            if (dayData[supp as keyof typeof dayData]) taken++;
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

    // Calculate overall adherence stats
    const adherenceStats = supplements.map(supp => ({
      key: supp,
      label: SUPPLEMENT_LABELS[supp],
      percent: data.supplementAdherence[supp] ?? 0,
    })).sort((a, b) => b.percent - a.percent);

    return { weeklyGrid, adherenceStats };
  }, [data]);

  if (isLoading) {
    return (
      <div className="border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (adherenceStats.length === 0) {
    return (
      <div className="border border-border p-4">
        <h3 className="section-header">SUPPLEMENT ADHERENCE</h3>
        <p className="text-sm text-muted-foreground">
          No supplement data yet. Log your first workout with habits!
        </p>
      </div>
    );
  }

  const getIntensityClass = (percent: number) => {
    if (percent === 0) return 'bg-[hsl(var(--heat-0))]';
    if (percent <= 25) return 'bg-[hsl(var(--heat-1))]';
    if (percent <= 50) return 'bg-[hsl(var(--heat-2))]';
    if (percent <= 75) return 'bg-[hsl(var(--heat-3))]';
    return 'bg-[hsl(var(--heat-4))]';
  };

  return (
    <div className="border border-border p-4">
      <h3 className="section-header">SUPPLEMENT ADHERENCE (4 WEEKS)</h3>

      {/* Adherence bars */}
      <div className="space-y-2 mb-6">
        {adherenceStats.map(({ key, label, percent }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-16 text-xs truncate">{label}</div>
            <div className="flex-1 h-4 bg-muted border border-border overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  percent >= 70 ? 'bg-foreground' : 'bg-muted-foreground'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="w-10 text-xs text-right tabular-nums">
              {percent}%
            </div>
          </div>
        ))}
      </div>

      {/* Weekly grid */}
      <div className="text-xs text-muted-foreground mb-2">WEEKLY BREAKDOWN</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal text-muted-foreground pb-2 pr-2"></th>
              {weeklyGrid[0]?.weeks.map((w, i) => (
                <th key={i} className="text-center font-normal text-muted-foreground pb-2 px-1">
                  W{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklyGrid.map(({ key, label, weeks }) => (
              <tr key={key}>
                <td className="py-1 pr-2 whitespace-nowrap">{label}</td>
                {weeks.map((w, i) => (
                  <td key={i} className="text-center py-1 px-1">
                    <div
                      className={cn(
                        'w-6 h-6 mx-auto flex items-center justify-center border border-border text-[10px]',
                        getIntensityClass(w.percent)
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
  );
}
