import type { ReactNode } from 'react';
import { chartTooltipContentStyle } from '@/lib/chartStyles';

/**
 * Shared tooltip shell for custom recharts tooltips. Matches the styling that
 * default tooltips get from `chartTooltipContentStyle`, so charts with custom
 * content still look identical to the rest.
 */
export function ChartTooltipShell({ children }: { children: ReactNode }) {
  return <div style={chartTooltipContentStyle}>{children}</div>;
}

export function ChartTooltipLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: 12 }}>{children}</div>
  );
}

export function ChartTooltipRow({
  label,
  value,
  color,
}: {
  label?: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'hsl(var(--muted-foreground))',
        marginTop: 2,
      }}
    >
      {color ? (
        <span
          style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}
        />
      ) : null}
      {label ? <span>{label}</span> : null}
      <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{value}</strong>
    </div>
  );
}
