import { format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useDateRange } from '@/contexts/DateRangeContext';
import { cn } from '@/lib/utils';

export function CalorieChart() {
  const { dateRange } = useDateRange();
  const { data: calorieData = [], isLoading } = useCalorieHistory(dateRange);

  // Calculate stats
  const totalIntake = calorieData.reduce((sum, d) => sum + d.intake, 0);
  const totalBurned = calorieData.reduce((sum, d) => sum + d.burned, 0);
  const avgIntake = calorieData.length > 0 ? Math.round(totalIntake / calorieData.length) : 0;
  const avgBurned = calorieData.length > 0 ? Math.round(totalBurned / calorieData.length) : 0;
  const netBalance = totalIntake - totalBurned;
  const isDeficit = netBalance < 0;

  // Format data for chart
  const chartData = calorieData.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
    shortDate: format(parseISO(d.date), 'd'),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">{data.displayDate}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-insight-coral">Intake</span>
            <span className="text-sm font-semibold tabular-nums">+{data.intake.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-insight-mint">Burned</span>
            <span className="text-sm font-semibold tabular-nums">-{data.burned.toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Net</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                data.net < 0 ? "text-insight-mint" : data.net > 200 ? "text-insight-coral" : ""
              )}>
                {data.net >= 0 ? '+' : ''}{data.net.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/50 rounded w-1/3" />
          <div className="h-48 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-sm border border-border/50 p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-insight-coral/15">
          <Flame className="h-4 w-4 text-insight-coral" />
        </div>
        <h3 className="text-sm font-semibold">Calorie Trends</h3>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-insight-coral/10">
          <p className="text-xs text-muted-foreground mb-1">Avg Intake</p>
          <p className="text-lg font-bold tabular-nums text-insight-coral">{avgIntake.toLocaleString()}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-insight-mint/10">
          <p className="text-xs text-muted-foreground mb-1">Avg Burned</p>
          <p className="text-lg font-bold tabular-nums text-insight-mint">{avgBurned.toLocaleString()}</p>
        </div>
        <div className={cn(
          "text-center p-2 rounded-lg",
          isDeficit ? "bg-insight-mint/10" : "bg-insight-coral/10"
        )}>
          <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
          <div className="flex items-center justify-center gap-1">
            {isDeficit ? (
              <TrendingDown className="h-3.5 w-3.5 text-insight-mint" />
            ) : netBalance > 200 ? (
              <TrendingUp className="h-3.5 w-3.5 text-insight-coral" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <p className={cn(
              "text-lg font-bold tabular-nums",
              isDeficit ? "text-insight-mint" : netBalance > 200 ? "text-insight-coral" : ""
            )}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="intakeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--insight-coral))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--insight-coral))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="burnedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--insight-mint))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--insight-mint))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="shortDate" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="intake"
              stroke="hsl(var(--insight-coral))"
              strokeWidth={2}
              fill="url(#intakeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--insight-coral))' }}
            />
            <Area
              type="monotone"
              dataKey="burned"
              stroke="hsl(var(--insight-mint))"
              strokeWidth={2}
              fill="url(#burnedGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--insight-mint))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-insight-coral" />
          <span className="text-xs text-muted-foreground">Intake</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-insight-mint" />
          <span className="text-xs text-muted-foreground">Burned</span>
        </div>
      </div>
    </motion.div>
  );
}
