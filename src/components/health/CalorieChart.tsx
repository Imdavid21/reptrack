import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Flame, Dumbbell } from 'lucide-react';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { cn } from '@/lib/utils';

export function CalorieChart() {
  const { dateRange } = useDateRange();
  const { data: calorieData = [], isLoading } = useCalorieHistory(dateRange);

  // Today's workout info for breakdown
  const { todayWorkout } = useCalorieBurn();

  // Period stats for summary
  const totalIntake = calorieData.reduce((sum, d) => sum + d.intake, 0);
  const totalBurned = calorieData.reduce((sum, d) => sum + d.burned, 0);
  const netBalance = totalIntake - totalBurned;
  const isDeficit = netBalance < 0;
  const isSurplus = netBalance > 200;

  // Format data for diverging bar chart
  const chartData = calorieData.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
    shortDate: format(parseISO(d.date), 'd'),
    intakeValue: d.intake,
    burnedValue: -d.burned,
    net: d.intake - d.burned,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
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

  // Calculate Y-axis domain
  const maxIntake = Math.max(...calorieData.map(d => d.intake), 0);
  const maxBurned = Math.max(...calorieData.map(d => d.burned), 0);
  const maxValue = Math.max(maxIntake, maxBurned, 500);
  const yDomain = [-maxValue * 1.1, maxValue * 1.1];

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
        <h3 className="text-sm font-semibold">Energy Balance</h3>
      </div>

      {/* Today's Workout Breakdown */}
      {todayWorkout && todayWorkout.calculatedDuration > 0 && (
        <div className="mb-4 p-2.5 bg-muted/20 rounded-lg border border-border/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {todayWorkout.day_name} ({todayWorkout.calculatedDuration}min)
              </span>
            </div>
            <span className="tabular-nums font-medium text-insight-mint text-xs">
              -{todayWorkout.calculatedCalories} cal
            </span>
          </div>
        </div>
      )}

      {/* Diverging Bar Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            stackOffset="sign"
          >
            <XAxis
              dataKey="shortDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                return abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

            <Bar
              dataKey="intakeValue"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`intake-${index}`}
                  fill="hsl(var(--insight-coral))"
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            <Bar
              dataKey="burnedValue"
              radius={[0, 0, 3, 3]}
              maxBarSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`burned-${index}`}
                  fill="hsl(var(--insight-mint))"
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Calorie - Period Total */}
      <div className="p-3 rounded-xl text-center mt-4 bg-muted/30">
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()} cal
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">Net Calorie</div>
      </div>
    </motion.div>
  );
}
