import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useWorkoutCorrelations } from '@/hooks/useWorkoutCorrelations';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Zap, Brain, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricType = 'energy' | 'motivation' | 'soreness';

const METRIC_CONFIG = {
  energy: {
    label: 'Energy',
    icon: Zap,
    color: 'hsl(var(--chart-1))',
    description: 'Pre-workout energy level',
  },
  motivation: {
    label: 'Motivation',
    icon: Brain,
    color: 'hsl(var(--chart-2))',
    description: 'Pre-workout motivation',
  },
  soreness: {
    label: 'Soreness',
    icon: Activity,
    color: 'hsl(var(--chart-3))',
    description: 'Muscle soreness (higher = more sore)',
  },
};

export function PreWorkoutCorrelationChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useWorkoutCorrelations(dateRange);
  const [activeMetric, setActiveMetric] = useState<MetricType>('energy');

  const chartData = useMemo(() => {
    if (!data) return [];

    switch (activeMetric) {
      case 'energy':
        return data.energyCorrelation;
      case 'motivation':
        return data.motivationCorrelation;
      case 'soreness':
        return data.sorenessCorrelation;
      default:
        return [];
    }
  }, [data, activeMetric]);

  const formatVolume = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${value}`;
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const item = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="font-semibold text-foreground mb-2">
          {METRIC_CONFIG[activeMetric].label}: {item.value}/10
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            Avg Volume: <span className="font-medium text-foreground">{formatVolume(item.avgVolume)} kg</span>
          </p>
          {item.avgSatisfaction > 0 && (
            <p className="text-muted-foreground">
              Avg Satisfaction: <span className="font-medium text-foreground">{item.avgSatisfaction}/10</span>
            </p>
          )}
          <p className="text-muted-foreground">
            Workouts: <span className="font-medium text-foreground">{item.workoutCount}</span>
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const hasData = data && data.workouts.length > 0;
  const insights = data?.insights || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-header">PRE-WORKOUT CORRELATIONS</h2>
      </div>

      {!hasData ? (
        <div className="stat-block text-center py-8">
          <p className="text-muted-foreground">
            No pre-workout check-in data yet. Complete workouts with pre-workout ratings to see correlations.
          </p>
        </div>
      ) : (
        <>
          {/* Insights Cards */}
          {insights.length > 0 && (
            <div className="grid gap-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'stat-block flex items-center gap-3 border-l-2',
                    insight.correlation === 'positive' && 'border-l-accent',
                    insight.correlation === 'negative' && 'border-l-muted-foreground'
                  )}
                >
                  {insight.correlation === 'positive' ? (
                    <TrendingUp className="h-5 w-5 text-accent shrink-0" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <p className="text-sm">{insight.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Metric Selector */}
          <div className="flex gap-2">
            {(Object.keys(METRIC_CONFIG) as MetricType[]).map((metric) => {
              const config = METRIC_CONFIG[metric];
              const Icon = config.icon;
              return (
                <button
                  key={metric}
                  onClick={() => setActiveMetric(metric)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeMetric === metric
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div className="stat-block">
            <p className="text-xs text-muted-foreground mb-4">
              {METRIC_CONFIG[activeMetric].description} → Average workout volume
            </p>
            
            {chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Not enough data for {METRIC_CONFIG[activeMetric].label.toLowerCase()} correlation
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="value"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v}`}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatVolume}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={renderTooltip} />
                  <Bar
                    dataKey="avgVolume"
                    name="Avg Volume"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={METRIC_CONFIG[activeMetric].color}
                        fillOpacity={0.3 + (entry.value / 10) * 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            <p className="text-xs text-muted-foreground text-center mt-2">
              {METRIC_CONFIG[activeMetric].label} Rating (1-10)
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-block text-center">
              <div className="stat-value">{data.workouts.length}</div>
              <div className="stat-label">Workouts</div>
            </div>
            <div className="stat-block text-center">
              <div className="stat-value">
                {data.workouts.filter(w => w.pre_energy !== null).length}
              </div>
              <div className="stat-label">With Check-ins</div>
            </div>
            <div className="stat-block text-center">
              <div className="stat-value">{insights.length}</div>
              <div className="stat-label">Insights</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
