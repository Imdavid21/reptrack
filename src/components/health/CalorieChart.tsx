import { format, parseISO } from 'date-fns';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import {
  CHART_HEIGHT,
  chartAxisProps,
  chartCursor,
  chartGrid,
  chartMargin,
  chartPalette,
} from '@/lib/chartStyles';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, Activity } from 'lucide-react';
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
  const totalBurned = calorieData.reduce((sum, d) => sum + d.expenditure, 0);
  const totalWorkoutBurned = calorieData.reduce((sum, d) => sum + d.workoutBurned, 0);
  const totalManualBurned = calorieData.reduce((sum, d) => sum + d.manualBurned, 0);
  const netBalance = totalIntake - totalBurned;
  const isDeficit = netBalance < 0;
  const isSurplus = netBalance > 200;

  // Format data for diverging bar chart
  const chartData = calorieData.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
    shortDate: format(parseISO(d.date), 'd'),
    intakeValue: d.intake,
    burnedValue: -d.expenditure,
    net: d.net,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-popover border border-border rounded-xl p-2.5 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">{data.displayDate}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-insight-mint">Intake</span>
            <span className="text-sm font-semibold tabular-nums">+{data.intake.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-insight-coral">Normal day</span>
            <span className="text-sm font-semibold tabular-nums">-{data.baseline.toLocaleString()}</span>
          </div>
          {(data.workoutBurned > 0 || data.manualBurned > 0) && (
            <>
              {data.workoutBurned > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-insight-coral">Workout</span>
                <span className="text-sm font-semibold tabular-nums">-{data.workoutBurned.toLocaleString()}</span>
              </div>
              )}
              {data.manualBurned > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-insight-coral">Activity</span>
                <span className="text-sm font-semibold tabular-nums">-{data.manualBurned.toLocaleString()}</span>
              </div>
              )}
            </>
          )}
          <div className="border-t border-border pt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Net</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                data.net < 0 ? "text-insight-coral" : data.net > 200 ? "text-insight-mint" : ""
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
  const maxBurned = Math.max(...calorieData.map(d => d.expenditure), 0);
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
            <span className="tabular-nums font-medium text-insight-coral text-xs">
              -{todayWorkout.calculatedCalories} cal
            </span>
          </div>
        </div>
      )}

      {/* Diverging Bar Chart */}
      <div style={{ height: CHART_HEIGHT.sm }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={chartMargin}
            stackOffset="sign"
          >
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="shortDate" {...chartAxisProps} interval="preserveStartEnd" />
            <YAxis
              domain={yDomain}
              {...chartAxisProps}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                return abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={chartCursor} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

            <Bar
              dataKey="intakeValue"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`intake-${index}`}
                  fill={chartPalette.positive}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            <Bar
              dataKey="burnedValue"
              radius={[0, 0, 4, 4]}
              maxBarSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`burned-${index}`}
                  fill={chartPalette.negative}
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

      {/* Burned breakdown - only worth showing once manual activity exists in the period */}
      {totalManualBurned > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Dumbbell className="h-3 w-3" /> Workout {totalWorkoutBurned.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> Activity {totalManualBurned.toLocaleString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
