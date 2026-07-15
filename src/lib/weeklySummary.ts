/**
 * Weekly review (§5): sessions vs target, leg-to-push/pull balance, mandatory-
 * accessory completion rate, and how many lifts are stalled. Pure + testable.
 */

import { categorize } from './coachPrompts';

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Loose match so "Farmer Walks" logged as "Farmer Walk" still counts. */
function isLogged(mandatory: string, loggedNames: string[]): boolean {
  const m = normalize(mandatory);
  return loggedNames.some(l => {
    const n = normalize(l);
    return n === m || n.includes(m) || m.includes(n);
  });
}

export interface WeeklySummaryInput {
  /** day_name of each workout logged this week. */
  weekDayNames: string[];
  /** distinct exercise names logged this week. */
  loggedExerciseNames: string[];
  /** mandatory exercise names in the active split. */
  mandatoryNames: string[];
  /** weekly session target (5 in a cut). */
  sessionGoal: number;
  /** number of lifts currently flagged as stalled. */
  stalledCount: number;
}

export interface WeeklySummary {
  sessions: number;
  sessionGoal: number;
  push: number;
  pull: number;
  legs: number;
  legBehind: boolean;
  mandatoryDone: number;
  mandatoryTotal: number;
  stalledCount: number;
}

export function computeWeeklySummary(input: WeeklySummaryInput): WeeklySummary {
  let push = 0, pull = 0, legs = 0;
  for (const name of input.weekDayNames) {
    const c = categorize(name);
    if (c === 'push') push += 1;
    else if (c === 'pull') pull += 1;
    else if (c === 'legs') legs += 1;
  }
  const upper = push + pull;
  const legBehind = upper >= 2 && legs * 2 < upper;

  const mandatoryDone = input.mandatoryNames.filter(m => isLogged(m, input.loggedExerciseNames)).length;

  return {
    sessions: input.weekDayNames.length,
    sessionGoal: input.sessionGoal,
    push,
    pull,
    legs,
    legBehind,
    mandatoryDone,
    mandatoryTotal: input.mandatoryNames.length,
    stalledCount: input.stalledCount,
  };
}
