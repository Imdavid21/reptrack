/**
 * Shared chart style tokens.
 *
 * Every recharts surface in the app (Insights, Dataroom, Dashboard) pulls its
 * axes, grid, tooltip, reference line, dot and bar styling from here so the
 * charts read as one family instead of a dozen slightly different dialects.
 * Values are expressed with design-system CSS variables, so they follow the
 * light/dark theme automatically.
 */

export const CHART_HEIGHT = {
  spark: 56,
  xs: 120,
  sm: 160,
  md: 200,
  lg: 256,
  xl: 288,
} as const;

export type ChartHeight = keyof typeof CHART_HEIGHT;

/** Horizontal-only grid, low contrast so the data stays dominant. */
export const chartGrid = {
  stroke: 'hsl(var(--border))',
  strokeOpacity: 0.45,
  vertical: false,
} as const;

export const chartAxisTick = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
} as const;

/** Spread onto every XAxis/YAxis: no axis line, no tick line, muted 11px ticks. */
export const chartAxisProps = {
  tick: chartAxisTick,
  axisLine: false,
  tickLine: false,
  tickMargin: 8,
} as const;

export const chartMargin = { top: 8, right: 8, left: -12, bottom: 0 } as const;

export const chartTooltipContentStyle = {
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px hsl(var(--foreground) / 0.08)',
  padding: '8px 10px',
} as const;

export const chartTooltipLabelStyle = {
  color: 'hsl(var(--foreground))',
  fontWeight: 600,
  marginBottom: 2,
} as const;

export const chartTooltipItemStyle = {
  color: 'hsl(var(--muted-foreground))',
  padding: 0,
} as const;

export const chartCursor = { fill: 'hsl(var(--muted) / 0.12)' } as const;
export const chartLineCursor = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeOpacity: 0.4,
  strokeDasharray: '3 3',
} as const;

export const chartReferenceLine = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeDasharray: '4 4',
  strokeOpacity: 0.7,
} as const;

/** One stroke width, one dot size, one curve type for every line/area series. */
export const chartLineProps = {
  type: 'monotone',
  strokeWidth: 2.5,
  connectNulls: true,
} as const;

export const chartDot = (color = 'hsl(var(--foreground))') => ({
  r: 3,
  fill: 'hsl(var(--background))',
  stroke: color,
  strokeWidth: 2,
});

export const chartActiveDot = (color = 'hsl(var(--foreground))') => ({
  r: 5,
  fill: color,
  stroke: 'hsl(var(--background))',
  strokeWidth: 2,
});

export const chartBarProps = {
  radius: [4, 4, 0, 0] as [number, number, number, number],
  maxBarSize: 28,
} as const;

/**
 * Series palette. Neutral foreground is the primary series everywhere; the
 * accents are only used where a metric already owns a colour in the app.
 */
export const chartPalette = {
  primary: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  water: 'hsl(var(--water))',
  recover: 'hsl(var(--recover))',
  positive: 'hsl(var(--insight-mint))',
  negative: 'hsl(var(--insight-coral))',
} as const;

const chartNumberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const formatChartNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? chartNumberFormat.format(number) : String(value ?? '');
};

export const chartTooltipFormatter = (value: number | string, name: string) =>
  [formatChartNumber(value), name] as [string, string];
