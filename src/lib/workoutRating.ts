// Session rating engine based on the Arachnid workout judgment rubric.
// Seven weighted dimensions sum to a score out of 100, with a separate
// evidence confidence tier (A-D). Never invent data: missing inputs lower
// confidence first and the score only when the dimension cannot be judged.

export interface RatingSet {
  name: string;
  category: string;
  weight: number;
  reps: number;
  completed: boolean;
  rir?: number | null;
  pain?: number | null;
}

export interface RatingInput {
  dayName: string;
  durationMinutes?: number | null;
  sets: RatingSet[];
  previousSets?: RatingSet[];
  plannedSets?: number | null;
  sleepHours?: number | null;
  inDeficit?: boolean;
}

export type RatingConfidence = 'high' | 'moderate' | 'low';

export interface RatingDimension {
  key: string;
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface WorkoutRating {
  score: number;
  label: string;
  provisional: boolean;
  confidence: RatingConfidence;
  dimensions: RatingDimension[];
  wins: string[];
  issues: string[];
  correction: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function baseName(name: string) {
  return name.replace(/ \(Set \d+\)$/i, '').trim();
}

function e1rm(set: RatingSet) {
  if (set.weight > 0) return set.weight * (1 + set.reps / 30);
  return set.reps;
}

function bestByExercise(sets: RatingSet[]) {
  const best = new Map<string, number>();
  for (const set of sets) {
    if (!set.completed) continue;
    const key = baseName(set.name).toLowerCase();
    const value = e1rm(set);
    if (value > (best.get(key) || 0)) best.set(key, value);
  }
  return best;
}

const CATEGORY_GROUPS: Record<string, RegExp> = {
  chest: /chest|pec/i,
  shoulders: /shoulder|delt/i,
  triceps: /tricep/i,
  back: /back|lat|row|pull/i,
  biceps: /bicep|curl/i,
  legs: /leg|quad|hamstring|glute|squat|calf|calves/i,
  core: /core|ab|abdominal/i,
};

function muscleGroup(category: string, name: string): string {
  const haystack = `${category} ${name}`;
  for (const [group, pattern] of Object.entries(CATEGORY_GROUPS)) {
    if (pattern.test(haystack)) return group;
  }
  return 'other';
}

const DAY_EXPECTATIONS: Array<{ match: RegExp; groups: string[]; priority: string[] }> = [
  { match: /push/i, groups: ['chest', 'shoulders', 'triceps'], priority: ['shoulders', 'chest'] },
  { match: /pull/i, groups: ['back', 'biceps'], priority: ['back'] },
  { match: /leg/i, groups: ['legs', 'core'], priority: ['legs'] },
  { match: /upper/i, groups: ['chest', 'back', 'shoulders'], priority: ['shoulders', 'back'] },
  { match: /lower/i, groups: ['legs'], priority: ['legs'] },
  { match: /arm/i, groups: ['biceps', 'triceps'], priority: ['biceps', 'triceps'] },
];

function bandLabel(score: number) {
  if (score >= 95) return 'Exceptional';
  if (score >= 85) return 'Very good';
  if (score >= 75) return 'Good and on track';
  if (score >= 65) return 'Mixed';
  if (score >= 50) return 'Needs correction';
  return 'Off target';
}

export function rateWorkout(input: RatingInput): WorkoutRating | null {
  const completed = input.sets.filter(set => set.completed && (set.reps > 0 || set.weight > 0));
  if (completed.length === 0) return null;

  const wins: string[] = [];
  const issues: string[] = [];
  const dimensions: RatingDimension[] = [];

  // 1. Safety and technique integrity, 20 points
  const painValues = completed.map(set => set.pain).filter((pain): pain is number => pain != null);
  const maxPain = painValues.length ? Math.max(...painValues) : null;
  let safety: number;
  let safetyNote: string;
  if (maxPain != null && maxPain >= 7) {
    safety = 6;
    safetyNote = 'Sharp pain reported and training continued';
    issues.push('A set was logged with high pain. That overrides performance judgment.');
  } else if (maxPain != null && maxPain >= 4) {
    safety = 12;
    safetyNote = 'Moderate discomfort reported';
    issues.push('Discomfort was reported mid session. Watch whether the same area flares again.');
  } else if (painValues.length) {
    safety = 18;
    safetyNote = 'No pain flags on logged sets';
    wins.push('No pain or symptom flags on any working set.');
  } else {
    safety = 16;
    safetyNote = 'No pain data logged; technique not visually verified';
  }
  dimensions.push({ key: 'safety', label: 'Safety And Technique', score: safety, max: 20, note: safetyNote });

  // 2. Goal alignment and movement coverage, 20 points
  const presentGroups = new Set(completed.map(set => muscleGroup(set.category, set.name)));
  const expectation = DAY_EXPECTATIONS.find(entry => entry.match.test(input.dayName));
  let alignment: number;
  let alignmentNote: string;
  if (expectation) {
    const covered = expectation.groups.filter(group => presentGroups.has(group));
    const ratio = covered.length / expectation.groups.length;
    alignment = Math.round(8 + ratio * 12);
    const missing = expectation.groups.filter(group => !presentGroups.has(group));
    if (missing.length === 0) {
      alignmentNote = `Covers the intended ${input.dayName} pattern`;
      wins.push(`All intended movement groups for ${input.dayName} were trained.`);
    } else {
      alignmentNote = `Missing ${missing.join(' and ')} work for ${input.dayName}`;
      issues.push(`No ${missing.join(' or ')} work logged, which the ${input.dayName} pattern calls for.`);
    }
    const missedPriority = expectation.priority.filter(group => !presentGroups.has(group));
    if (missedPriority.length) alignment = Math.max(8, alignment - 2);
  } else {
    alignment = completed.length >= 6 ? 16 : 13;
    alignmentNote = 'Session type not recognized; judged on logged work only';
  }
  const setsPerGroup = new Map<string, number>();
  for (const set of completed) {
    const group = muscleGroup(set.category, set.name);
    setsPerGroup.set(group, (setsPerGroup.get(group) || 0) + 1);
  }
  const overloadedGroup = [...setsPerGroup.entries()].find(([, count]) => count > 8);
  if (overloadedGroup) {
    alignment = Math.max(8, alignment - 2);
    issues.push(`${overloadedGroup[1]} sets for ${overloadedGroup[0]} in one session risks junk volume.`);
  }
  dimensions.push({ key: 'alignment', label: 'Goal Alignment And Coverage', score: clamp(alignment, 0, 20), max: 20, note: alignmentNote });

  // 3. Effort and stimulus quality, 15 points
  const rirSets = completed.filter(set => set.rir != null);
  let effort: number;
  let effortNote: string;
  if (rirSets.length >= Math.ceil(completed.length / 2)) {
    const avgRir = rirSets.reduce((sum, set) => sum + (set.rir || 0), 0) / rirSets.length;
    if (avgRir >= 0.5 && avgRir <= 3) {
      effort = 14;
      effortNote = `Average effort around ${avgRir.toFixed(1)} RIR`;
      wins.push('Effort stayed in the productive range close to failure.');
    } else if (avgRir < 0.5) {
      effort = 11;
      effortNote = 'Most sets went to failure';
      issues.push('Nearly every set hit failure. That fatigue cost is rarely necessary.');
    } else {
      effort = 9;
      effortNote = `Average effort only ${avgRir.toFixed(1)} RIR`;
      issues.push('Sets ended far from failure, which limits the stimulus.');
    }
  } else {
    let totalDropoff = 0;
    let dropoffCount = 0;
    const byExercise = new Map<string, RatingSet[]>();
    for (const set of completed) {
      const key = baseName(set.name).toLowerCase();
      (byExercise.get(key) || byExercise.set(key, []).get(key)!).push(set);
    }
    for (const sets of byExercise.values()) {
      if (sets.length < 3) continue;
      const reps = sets.map(set => set.reps);
      const best = Math.max(...reps);
      if (best > 0) {
        totalDropoff += (best - reps[reps.length - 1]) / best;
        dropoffCount += 1;
      }
    }
    if (dropoffCount > 0) {
      const avgDropoff = totalDropoff / dropoffCount;
      if (avgDropoff < 0.25) {
        effort = 12;
        effortNote = 'Reps stayed consistent across sets';
      } else if (avgDropoff < 0.4) {
        effort = 10;
        effortNote = 'Noticeable rep drop-off across sets';
      } else {
        effort = 8;
        effortNote = 'Large rep drop-off suggests loads were too heavy or rests too short';
        issues.push('Performance fell sharply across sets. Reduce load or rest longer.');
      }
    } else {
      effort = 10;
      effortNote = 'No effort data logged; inferred from structure only';
    }
  }
  dimensions.push({ key: 'effort', label: 'Effort And Stimulus', score: clamp(effort, 0, 15), max: 15, note: effortNote });

  // 4. Progressive overload and performance, 15 points
  let progression: number;
  let progressionNote: string;
  const previousBest = bestByExercise(input.previousSets || []);
  const currentBest = bestByExercise(completed);
  if (previousBest.size === 0) {
    progression = 10;
    progressionNote = 'No comparable prior session on record';
  } else {
    let prWins = 0;
    let regressions = 0;
    let stable = 0;
    const winNames: string[] = [];
    for (const [key, value] of currentBest) {
      const before = previousBest.get(key);
      if (!before) continue;
      if (value > before * 1.01) { prWins += 1; winNames.push(key); }
      else if (value < before * 0.97) regressions += 1;
      else stable += 1;
    }
    if (prWins > 0 && regressions === 0) {
      progression = 14;
      progressionNote = `${prWins} exercise${prWins === 1 ? '' : 's'} improved vs the previous comparable session`;
      wins.push(`Progressed on ${winNames.slice(0, 2).join(' and ')} vs the last ${input.dayName}.`);
    } else if (prWins > regressions) {
      progression = 13;
      progressionNote = 'More improvements than declines';
      wins.push('Net progression across comparable exercises.');
    } else if (regressions > prWins) {
      progression = 8;
      progressionNote = 'More declines than improvements';
      issues.push('Several exercises came in under their previous comparable numbers.');
    } else {
      progression = input.inDeficit ? 12 : 11;
      progressionNote = input.inDeficit ? 'Performance held during a calorie deficit' : 'Performance stable vs the previous session';
      if (input.inDeficit) wins.push('Strength held while eating in a deficit. That counts as a win.');
    }
  }
  dimensions.push({ key: 'progression', label: 'Progressive Overload', score: clamp(progression, 0, 15), max: 15, note: progressionNote });

  // 5. Volume, redundancy, and balance, 15 points
  let volumeScore: number;
  let volumeNote: string;
  const totalSets = completed.length;
  const groupCounts = [...setsPerGroup.values()];
  const maxGroupSets = groupCounts.length ? Math.max(...groupCounts) : 0;
  if (totalSets < 4) {
    volumeScore = 7;
    volumeNote = 'Very low total working volume';
    issues.push('Total working volume is low for a full session.');
  } else if (totalSets <= 24 && maxGroupSets <= 8) {
    volumeScore = 13;
    volumeNote = `${totalSets} working sets with balanced distribution`;
  } else if (totalSets <= 30) {
    volumeScore = 11;
    volumeNote = 'High total volume; check recoverability';
  } else {
    volumeScore = 8;
    volumeNote = 'Very high volume; likely redundant work';
    issues.push('Session volume is very high. Extra sets past the stimulus point add fatigue, not growth.');
  }
  dimensions.push({ key: 'volume', label: 'Volume And Balance', score: clamp(volumeScore, 0, 15), max: 15, note: volumeNote });

  // 6. Fatigue and recovery management, 10 points
  let fatigue: number;
  let fatigueNote: string;
  if (input.sleepHours == null) {
    fatigue = 7;
    fatigueNote = 'No sleep data for the prior night';
  } else if (input.sleepHours >= 7) {
    fatigue = 9;
    fatigueNote = `Rested (${input.sleepHours.toFixed(1)} h sleep)`;
  } else if (input.sleepHours >= 6) {
    fatigue = 7;
    fatigueNote = `Slightly short sleep (${input.sleepHours.toFixed(1)} h)`;
  } else {
    fatigue = 5;
    fatigueNote = `Poor sleep (${input.sleepHours.toFixed(1)} h) before training`;
    issues.push(`Sleep was ${input.sleepHours.toFixed(1)} h. Performance dips are expected on short rest.`);
  }
  if (input.durationMinutes != null && input.durationMinutes > 150) {
    fatigue = Math.max(3, fatigue - 2);
    issues.push('Session ran very long. Late sets rarely stay high quality.');
  }
  dimensions.push({ key: 'fatigue', label: 'Fatigue And Recovery', score: clamp(fatigue, 0, 10), max: 10, note: fatigueNote });

  // 7. Adherence and data integrity, 5 points
  let adherence: number;
  let adherenceNote: string;
  if (input.plannedSets != null && input.plannedSets > 0) {
    const ratio = totalSets / input.plannedSets;
    adherence = ratio >= 0.95 ? 5 : ratio >= 0.8 ? 4 : ratio >= 0.6 ? 3 : 2;
    adherenceNote = `Completed ${totalSets} of ${input.plannedSets} planned sets`;
    if (ratio < 0.8) issues.push(`Only ${Math.round(ratio * 100)}% of planned sets were completed.`);
  } else {
    const fullyLogged = completed.every(set => set.reps > 0);
    adherence = fullyLogged ? 5 : 4;
    adherenceNote = fullyLogged ? 'All working sets logged with numbers' : 'Some sets are missing numbers';
  }
  dimensions.push({ key: 'adherence', label: 'Adherence And Logging', score: clamp(adherence, 0, 5), max: 5, note: adherenceNote });

  let score = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
  if (maxPain != null && maxPain >= 7) score = Math.min(score, 59);

  const confidence: RatingConfidence = rirSets.length > 0 && previousBest.size > 0
    ? 'high'
    : previousBest.size > 0
      ? 'moderate'
      : 'low';

  const sortedDeficits = [...dimensions].sort((a, b) => (a.score / a.max) - (b.score / b.max));
  const weakest = sortedDeficits[0];
  const correction = issues.length > 0
    ? issues[0]
    : weakest && weakest.score / weakest.max < 0.75
      ? `Largest gap: ${weakest.label.toLowerCase()}. ${weakest.note}.`
      : null;

  return {
    score,
    label: bandLabel(score),
    provisional: confidence !== 'high',
    confidence,
    dimensions,
    wins: wins.slice(0, 3),
    issues: issues.slice(0, 3),
    correction,
  };
}
