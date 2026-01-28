import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type InsightColor = 1 | 2 | 3 | 4 | 5;

interface InsightStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  color?: InsightColor;
  description?: string;
}

const colorClasses: Record<InsightColor, { bg: string; icon: string }> = {
  1: { bg: 'bg-[hsl(var(--chart-1)/0.15)]', icon: 'text-[hsl(var(--chart-1))]' },
  2: { bg: 'bg-[hsl(var(--chart-2)/0.15)]', icon: 'text-[hsl(var(--chart-2))]' },
  3: { bg: 'bg-[hsl(var(--chart-3)/0.15)]', icon: 'text-[hsl(var(--chart-3))]' },
  4: { bg: 'bg-[hsl(var(--chart-4)/0.15)]', icon: 'text-[hsl(var(--chart-4))]' },
  5: { bg: 'bg-[hsl(var(--chart-5)/0.15)]', icon: 'text-[hsl(var(--chart-5))]' },
};

export function InsightStatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 1,
  description,
}: InsightStatCardProps) {
  const { bg, icon } = colorClasses[color];

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', bg)}>
          <Icon className={cn('h-5 w-5', icon)} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full',
              trend > 0 
                ? 'bg-[hsl(var(--chart-1)/0.15)] text-foreground' 
                : 'bg-[hsl(var(--chart-4)/0.15)] text-foreground'
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
          {label}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground/70 mt-1">{description}</div>
        )}
      </div>
    </div>
  );
}
