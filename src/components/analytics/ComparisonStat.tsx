import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonStatProps {
  label: string;
  currentValue: number | string | null;
  previousValue: number | string | null;
  unit?: string;
  formatValue?: (val: number) => string;
  higherIsBetter?: boolean;
}

export function ComparisonStat({
  label,
  currentValue,
  previousValue,
  unit = '',
  formatValue = (v) => v.toString(),
  higherIsBetter = true,
}: ComparisonStatProps) {
  const current = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
  const previous = typeof previousValue === 'string' ? parseFloat(previousValue) : previousValue;
  
  const hasBoth = current !== null && previous !== null && !isNaN(current) && !isNaN(previous);
  const diff = hasBoth ? current - previous : 0;
  const percentChange = hasBoth && previous !== 0 
    ? Math.round((diff / previous) * 100) 
    : 0;

  const isPositive = diff > 0;
  const isNegative = diff < 0;
  const isGood = higherIsBetter ? isPositive : isNegative;
  const isBad = higherIsBetter ? isNegative : isPositive;

  return (
    <div className="space-y-1">
      <div className="text-lg font-bold tabular-nums">
        {current !== null ? formatValue(current) : '—'}{unit}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      
      {hasBoth && (
        <div className={cn(
          "flex items-center gap-1 text-xs",
          isGood && "text-primary",
          isBad && "text-destructive",
          !isGood && !isBad && "text-muted-foreground"
        )}>
          {isPositive ? (
            <ArrowUp className="h-3 w-3" />
          ) : isNegative ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span className="tabular-nums">
            {isPositive && '+'}{percentChange}%
          </span>
          <span className="text-muted-foreground">vs prev</span>
        </div>
      )}
    </div>
  );
}
