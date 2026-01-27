import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type InsightColor = 'mint' | 'lavender' | 'coral' | 'yellow' | 'pink' | 'blue';

interface InsightStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  color: InsightColor;
  description?: string;
}

const colorClasses: Record<InsightColor, { bg: string; icon: string }> = {
  mint: { bg: 'bg-insight-mint/15', icon: 'text-insight-mint' },
  lavender: { bg: 'bg-insight-lavender/15', icon: 'text-insight-lavender' },
  coral: { bg: 'bg-insight-coral/15', icon: 'text-insight-coral' },
  yellow: { bg: 'bg-insight-yellow/15', icon: 'text-insight-yellow' },
  pink: { bg: 'bg-insight-pink/15', icon: 'text-insight-pink' },
  blue: { bg: 'bg-insight-blue/15', icon: 'text-insight-blue' },
};

export function InsightStatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
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
              trend > 0 ? 'bg-insight-mint/15 text-insight-mint' : 'bg-insight-coral/15 text-insight-coral'
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
