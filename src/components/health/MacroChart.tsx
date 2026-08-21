import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Beef, Wheat, Droplet, Leaf, Candy, Waves, Banana, Pencil, Check, X, LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { cn } from '@/lib/utils';

export type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium' | 'potassium';

interface MacroConfig {
  label: string;
  unit: string;
  column: MacroKey;
  goalKey: 'daily_protein_goal' | 'daily_carbs_goal' | 'daily_fat_goal' | 'daily_fiber_goal' | 'daily_sugar_goal' | 'daily_sodium_goal' | 'daily_potassium_goal';
  defaultGoal: number;
  colorVar: string;
  icon: LucideIcon;
  /** 'atLeast' (default) - meeting/exceeding the target is the goal, e.g.
   *  protein. 'atMost' - staying at/under the target is the goal, e.g. sugar
   *  and sodium, where "hit target" would otherwise mean "ate more of it". */
  direction?: 'atLeast' | 'atMost';
  /** Upper bound for the editable target input. Defaults to 1000 (fits every
   *  gram-scale macro); sodium needs its own since it's measured in mg. */
  maxTarget?: number;
}

const MACRO_CONFIGS: Record<MacroKey, MacroConfig> = {
  protein: { label: 'Protein', unit: 'g', column: 'protein', goalKey: 'daily_protein_goal', defaultGoal: 180, colorVar: '--insight-mint', icon: Beef },
  carbs: { label: 'Carbs', unit: 'g', column: 'carbs', goalKey: 'daily_carbs_goal', defaultGoal: 250, colorVar: '--insight-coral', icon: Wheat },
  fat: { label: 'Fat', unit: 'g', column: 'fat', goalKey: 'daily_fat_goal', defaultGoal: 70, colorVar: '--insight-amber', icon: Droplet },
  fiber: { label: 'Fiber', unit: 'g', column: 'fiber', goalKey: 'daily_fiber_goal', defaultGoal: 30, colorVar: '--insight-violet', icon: Leaf },
  sugar: { label: 'Sugar', unit: 'g', column: 'sugar', goalKey: 'daily_sugar_goal', defaultGoal: 50, colorVar: '--insight-rose', icon: Candy, direction: 'atMost' },
  sodium: { label: 'Sodium', unit: 'mg', column: 'sodium', goalKey: 'daily_sodium_goal', defaultGoal: 2300, colorVar: '--insight-sky', icon: Waves, direction: 'atMost', maxTarget: 10000 },
  potassium: { label: 'Potassium', unit: 'mg', column: 'potassium', goalKey: 'daily_potassium_goal', defaultGoal: 3400, colorVar: '--insight-mint', icon: Banana, maxTarget: 10000 },
};

interface DataPoint {
  date: string;
  value: number;
}

function useMacroHistory(macro: MacroKey) {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
  const endDateStr = format(dateRange.to, 'yyyy-MM-dd');
  const cfg = MACRO_CONFIGS[macro];

  return useQuery({
    queryKey: ['macro-history', macro, user?.id, startDateStr, endDateStr],
    queryFn: async (): Promise<DataPoint[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('meals')
        .select(`date, ${cfg.column}`)
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      // Surface failures instead of rendering them as an all-zero chart - a
      // missing column (unapplied migration) looked identical to "no data".
      if (error) throw error;

      const byDate: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        byDate[m.date] = (byDate[m.date] || 0) + Number(m[cfg.column] || 0);
      });

      return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return { date: dateStr, value: Math.round(byDate[dateStr] || 0) };
      });
    },
    enabled: !!user,
  });
}

export function MacroChart({ macro }: { macro: MacroKey }) {
  const cfg = MACRO_CONFIGS[macro];
  const { data = [], isLoading } = useMacroHistory(macro);
  const { preferences } = useUserPreferences();
  const { resolveGoal, setGoal } = useGoalHistory();

  const dailyTarget = (preferences as any)?.[cfg.goalKey] ?? cfg.defaultGoal;
  const isAtMost = cfg.direction === 'atMost';
  // v > 0 guards against an unlogged (zero) day reading as "good" for atMost
  // macros - 0 is trivially <= any target, which would otherwise paint a day
  // with no data logged the same as a deliberately low-sugar/low-sodium day.
  // No-op for atLeast macros: a zero value was never >= a positive target anyway.
  const isGood = (v: number, target: number) => v > 0 && (isAtMost ? v <= target : v >= target);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(dailyTarget));

  const saveTarget = async () => {
    const v = Math.max(1, Math.min(cfg.maxTarget ?? 1000, Math.round(Number(draft) || 0)));
    if (v !== dailyTarget) {
      await setGoal(cfg.goalKey, v, dailyTarget);
    }
    setEditing(false);
  };

  // Each day gets the target that was actually active on it (via goal_history),
  // not today's live value - so changing a target doesn't retroactively rewrite
  // whether past days "hit" it. The reference line and editor above still show
  // the current target, since that's what you're aiming for right now.
  const dataWithTargets = useMemo(
    () => data.map(d => ({ ...d, target: resolveGoal(cfg.goalKey, d.date, dailyTarget) })),
    [data, resolveGoal, cfg.goalKey, dailyTarget],
  );

  const loggedDays = dataWithTargets.filter(d => d.value > 0);
  const avg = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.value, 0) / loggedDays.length)
    : 0;

  const chartData = dataWithTargets.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
    shortDate: format(parseISO(d.date), 'd'),
  }));

  const maxValue = Math.max(...chartData.map(d => d.value), ...chartData.map(d => d.target), dailyTarget, 50);
  const Icon = cfg.icon;
  const color = `hsl(var(${cfg.colorVar}))`;

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
    const pct = Math.round((d.value / d.target) * 100);
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1.5">{d.displayDate}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color }}>{cfg.label}</span>
          <span className="text-sm font-semibold tabular-nums">{d.value}{cfg.unit}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{pct}% of {d.target}{cfg.unit} {isAtMost ? 'limit' : 'target'}</div>
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
          <div className="p-2 rounded-xl" style={{ backgroundColor: `hsl(var(${cfg.colorVar}) / 0.15)` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <h3 className="text-sm font-semibold">Daily {cfg.label}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{isAtMost ? 'Limit' : 'Target'}</div>
          {editing ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTarget();
                  if (e.key === 'Escape') { setEditing(false); setDraft(String(dailyTarget)); }
                }}
                autoFocus
                className="w-16 bg-muted/40 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums text-right outline-none border border-border"
              />
              <span className="text-sm font-semibold">{cfg.unit}</span>
              <button onClick={saveTarget} className="p-1 rounded-md hover:bg-muted/50" aria-label="Save target">
                <Check className="h-3.5 w-3.5" style={{ color }} />
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(String(dailyTarget)); }}
                className="p-1 rounded-md hover:bg-muted/50"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(String(dailyTarget)); setEditing(true); }}
              className="flex items-center gap-1.5 text-sm font-semibold tabular-nums hover:opacity-80 transition-opacity"
              aria-label={`Edit ${cfg.label} target`}
            >
              {dailyTarget}{cfg.unit}
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="shortDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, Math.ceil(maxValue * 1.1)]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v}${cfg.unit}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
            <ReferenceLine y={dailyTarget} stroke={color} strokeDasharray="3 3" strokeOpacity={0.6} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`m-${index}`} fill={color} fillOpacity={isGood(entry.value, entry.target) ? 0.85 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-3 rounded-xl text-center bg-muted/30">
          <div
            className={cn("text-2xl font-bold tabular-nums", isGood(avg, dailyTarget) ? "" : "text-foreground")}
            style={isGood(avg, dailyTarget) ? { color } : undefined}
          >
            {avg}{cfg.unit}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Daily Avg</div>
        </div>
        <div className="p-3 rounded-xl text-center bg-muted/30">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {loggedDays.filter(d => isGood(d.value, d.target)).length}
            <span className="text-sm text-muted-foreground">/{data.length}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{isAtMost ? 'Days Within Limit' : 'Days Hit Target'}</div>
        </div>
      </div>
    </motion.div>
  );
}
