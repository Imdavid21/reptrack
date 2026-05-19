import { useQuery } from '@tanstack/react-query';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Beef } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { cn } from '@/lib/utils';

interface ProteinPoint {
  date: string;
  protein: number;
}

function useProteinHistory() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['protein-history', user?.id, startDateStr, endDateStr],
    queryFn: async (): Promise<ProteinPoint[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from('meals')
        .select('date, protein')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      const byDate: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        byDate[m.date] = (byDate[m.date] || 0) + Number(m.protein || 0);
      });

      return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return { date: dateStr, protein: Math.round(byDate[dateStr] || 0) };
      });
    },
    enabled: !!user,
  });
}

export function ProteinChart() {
  const { data = [], isLoading } = useProteinHistory();
  const { preferences } = useUserPreferences();
  const { data: metricsData } = useDailyMetrics({ from: new Date(Date.now() - 30 * 86400000), to: new Date() });

  const bodyweight = metricsData?.totals?.avgBodyweight || preferences?.weight_goal || 70;
  // Standard target: 1.6 g/kg bodyweight (training minimum)
  const dailyTarget = Math.round(bodyweight * 1.6);

  const loggedDays = data.filter(d => d.protein > 0);
  const avgProtein = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length)
    : 0;

  const chartData = data.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
    shortDate: format(parseISO(d.date), 'd'),
  }));

  const maxValue = Math.max(...chartData.map(d => d.protein), dailyTarget, 50);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/50 rounded w-1/3" />
          <div className="h-32 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const pct = Math.round((d.protein / dailyTarget) * 100);
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1.5">{d.displayDate}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-insight-mint">Protein</span>
          <span className="text-sm font-semibold tabular-nums">{d.protein}g</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{pct}% of {dailyTarget}g target</div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-sm border border-border/50 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-insight-mint/15">
            <Beef className="h-4 w-4 text-insight-mint" />
          </div>
          <h3 className="text-sm font-semibold">Daily Protein</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Target</div>
          <div className="text-sm font-semibold tabular-nums">{dailyTarget}g</div>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="shortDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, Math.ceil(maxValue * 1.1)]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v}g`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
            <ReferenceLine
              y={dailyTarget}
              stroke="hsl(var(--insight-mint))"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
            <Bar dataKey="protein" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`p-${index}`}
                  fill="hsl(var(--insight-mint))"
                  fillOpacity={entry.protein >= dailyTarget ? 0.85 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-3 rounded-xl text-center bg-muted/30">
          <div className={cn(
            "text-2xl font-bold tabular-nums",
            avgProtein >= dailyTarget ? "text-insight-mint" : "text-foreground"
          )}>
            {avgProtein}g
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Daily Avg</div>
        </div>
        <div className="p-3 rounded-xl text-center bg-muted/30">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {loggedDays.filter(d => d.protein >= dailyTarget).length}
            <span className="text-sm text-muted-foreground">/{data.length}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Days Hit Target</div>
        </div>
      </div>
    </motion.div>
  );
}
