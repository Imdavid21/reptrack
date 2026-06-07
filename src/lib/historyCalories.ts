/**
 * Pure helpers for History page calorie display.
 * Extracted for unit testing.
 */

export interface DayCalorieEntry {
  intake: number;
  burn: number;
  net: number;
  hasCalories: boolean;
}

export function buildDayCalorieEntry(intake: number | undefined | null, burn: number | undefined | null): DayCalorieEntry {
  const i = Math.max(0, Math.round(Number(intake) || 0));
  const b = Math.max(0, Math.round(Number(burn) || 0));
  return {
    intake: i,
    burn: b,
    net: i - b,
    hasCalories: i > 0 || b > 0,
  };
}

export type CalorieDisplayMode = 'net' | 'split';

export interface CalorieDisplay {
  /** Text label like "+1234 net" or "1234 in / 300 out" */
  label: string;
  /** Tooltip with full breakdown */
  tooltip: string;
}

export function formatCalorieDisplay(entry: DayCalorieEntry, mode: CalorieDisplayMode): CalorieDisplay {
  const intakeStr = entry.intake.toLocaleString();
  const burnStr = entry.burn.toLocaleString();
  const tooltip = `Intake ${intakeStr} − Burn ${burnStr}`;

  if (mode === 'split') {
    return {
      label: `${intakeStr} in / ${burnStr} out`,
      tooltip,
    };
  }

  const sign = entry.net > 0 ? '+' : '';
  return {
    label: `${sign}${entry.net.toLocaleString()} net`,
    tooltip,
  };
}
