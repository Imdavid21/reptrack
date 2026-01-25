import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useHealthAnalytics } from '@/hooks/useHealthAnalytics';
import { HealthInsightsCard } from '@/components/health/HealthInsightsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function HealthAnalytics() {
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  const { vitals, calories, bloodPressure, bloodSugar, weeklySummaries, isLoading } = useHealthAnalytics(timeRange);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="border border-border bg-card p-2 text-xs">
        <p className="font-medium mb-1">{formatDate(label)}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.stroke || p.fill }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <MainLayout title="HEALTH ANALYTICS">
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days as 30 | 60 | 90)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                timeRange === days
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>

        {/* AI Health Insights */}
        <HealthInsightsCard />


        {/* Weekly Summaries */}
        {weeklySummaries.length > 0 && (
          <div className="card-brutalist">
            <h3 className="section-header">WEEKLY SUMMARIES</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">WEEK</th>
                    <th className="text-right py-2">SLEEP</th>
                    <th className="text-right py-2">ENERGY</th>
                    <th className="text-right py-2">STEPS</th>
                    <th className="text-right py-2">CAL</th>
                    <th className="text-right py-2">WORKOUTS</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummaries.slice(0, 4).map((week, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 text-muted-foreground">
                        {week.weekStart} - {week.weekEnd}
                      </td>
                      <td className="text-right tabular-nums">
                        {week.avgSleep?.toFixed(1) || '-'}h
                      </td>
                      <td className="text-right tabular-nums">
                        {week.avgEnergy?.toFixed(1) || '-'}/10
                      </td>
                      <td className="text-right tabular-nums">
                        {week.totalSteps.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums">
                        {week.avgCalories?.toFixed(0) || '-'}
                      </td>
                      <td className="text-right tabular-nums font-bold">
                        {week.workoutCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sleep & Energy Chart */}
        <div className="card-brutalist">
          <h3 className="section-header">SLEEP & ENERGY</h3>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : vitals.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitals}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="sleep"
                    orientation="left"
                    domain={[0, 12]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="energy"
                    orientation="right"
                    domain={[0, 10]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Line
                    yAxisId="sleep"
                    type="monotone"
                    dataKey="sleepHours"
                    name="Sleep (hrs)"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="energy"
                    type="monotone"
                    dataKey="energyLevel"
                    name="Energy"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sleep or energy data yet
            </p>
          )}
          <div className="flex justify-center gap-6 text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-foreground" />
              <span>Sleep (hrs)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-muted-foreground" />
              <span>Energy (1-10)</span>
            </div>
          </div>
        </div>

        {/* Heart Rate & Oxygen */}
        <div className="card-brutalist">
          <h3 className="section-header">VITALS</h3>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : vitals.filter(v => v.heartRate || v.oxygenLevel).length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitals}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="hr"
                    orientation="left"
                    domain={[40, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="o2"
                    orientation="right"
                    domain={[90, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="heartRate"
                    name="Heart Rate (BPM)"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="o2"
                    type="monotone"
                    dataKey="oxygenLevel"
                    name="Oxygen (%)"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No vitals data yet
            </p>
          )}
          <div className="flex justify-center gap-6 text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-destructive" />
              <span>Heart Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-accent" />
              <span>Oxygen</span>
            </div>
          </div>
        </div>

        {/* Steps & Activity */}
        <div className="card-brutalist">
          <h3 className="section-header">DAILY STEPS</h3>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : vitals.filter(v => v.steps).length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vitals}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={renderTooltip} />
                  <Bar
                    dataKey="steps"
                    name="Steps"
                    fill="hsl(var(--foreground))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No step data yet
            </p>
          )}
        </div>

        {/* Calories */}
        <div className="card-brutalist">
          <h3 className="section-header">DAILY CALORIES</h3>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : calories.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calories}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Area
                    type="monotone"
                    dataKey="breakfast"
                    name="Breakfast"
                    stackId="1"
                    stroke="hsl(var(--foreground))"
                    fill="hsl(var(--foreground))"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="lunch"
                    name="Lunch"
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="dinner"
                    name="Dinner"
                    stackId="1"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="snack"
                    name="Snacks"
                    stackId="1"
                    stroke="hsl(var(--border))"
                    fill="hsl(var(--border))"
                    fillOpacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No calorie data yet
            </p>
          )}
        </div>

        {/* Blood Pressure */}
        <div className="card-brutalist">
          <h3 className="section-header">BLOOD PRESSURE HISTORY</h3>
          {bloodPressure.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bloodPressure}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 160]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--destructive))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--foreground))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No blood pressure readings yet
            </p>
          )}
          <div className="flex justify-center gap-6 text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-destructive" />
              <span>Systolic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-[2px] bg-foreground" />
              <span>Diastolic</span>
            </div>
          </div>
        </div>

        {/* Blood Sugar */}
        <div className="card-brutalist">
          <h3 className="section-header">BLOOD SUGAR HISTORY</h3>
          {bloodSugar.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bloodSugar}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[60, 180]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderTooltip} />
                  <Line
                    type="monotone"
                    dataKey="glucose"
                    name="Glucose (mg/dL)"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--foreground))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No blood sugar readings yet
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
