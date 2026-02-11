/**
 * Estimate 1RM using the Epley formula: weight × (1 + reps/30)
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate weight for target reps based on estimated 1RM
 */
export function weightForReps(oneRM: number, targetReps: number): number {
  if (targetReps <= 0 || oneRM <= 0) return 0;
  if (targetReps === 1) return oneRM;
  return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
}

/**
 * Standard plate set available in most gyms (in kg, per side)
 */
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Calculate plates needed per side for a barbell
 * Returns plates per side or null if weight isn't achievable
 */
export function calculatePlates(
  totalWeight: number,
  barWeight: number = 20
): { perSide: number[]; remainder: number } | null {
  const weightPerSide = (totalWeight - barWeight) / 2;
  if (weightPerSide < 0) return null;

  const perSide: number[] = [];
  let remaining = weightPerSide;

  for (const plate of PLATES_KG) {
    while (remaining >= plate - 0.01) { // float tolerance
      perSide.push(plate);
      remaining -= plate;
    }
  }

  return { perSide, remainder: Math.round(remaining * 100) / 100 };
}

/**
 * Format plate breakdown as a human-readable string
 */
export function formatPlates(totalWeight: number, barWeight: number = 20): string {
  const result = calculatePlates(totalWeight, barWeight);
  if (!result) return `${barWeight}kg bar only`;
  if (result.perSide.length === 0) return `${barWeight}kg bar only`;

  // Group plates by size
  const counts: Record<number, number> = {};
  result.perSide.forEach(p => { counts[p] = (counts[p] || 0) + 1; });

  const parts = Object.entries(counts)
    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
    .map(([plate, count]) => count > 1 ? `${count}×${plate}kg` : `${plate}kg`);

  return parts.join(' + ') + ' /side';
}
