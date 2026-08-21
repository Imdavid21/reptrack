/**
 * Minimal Deno port of the app's Energy Engine V3 pieces the MCP write tools
 * need. Kept numerically identical to src/lib/energyEngineV3.ts so MCP-logged
 * sessions and activities produce the same burn as in-app logging.
 */
export const ENERGY_MODEL_VERSION = 3;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function netActivityKcal(met: number, weightKg: number, durationMinutes: number): number {
  if (![met, weightKg, durationMinutes].every(Number.isFinite) || met <= 1 || weightKg <= 0 || durationMinutes <= 0) return 0;
  return Math.max(0, (met - 1) * 3.5 * weightKg / 200 * durationMinutes);
}

export const GENERIC_PACE_MIN_PER_KM = { walking: 12, running: 6, cycling: 3 } as const;
export type ActivityKind = keyof typeof GENERIC_PACE_MIN_PER_KM;

export function metForPace(kind: ActivityKind, paceMinutesPerKm: number): number {
  const speedKmh = clamp(60 / Math.max(0.1, paceMinutesPerKm), kind === "cycling" ? 4 : kind === "running" ? 3 : 1, kind === "cycling" ? 55 : kind === "running" ? 28 : 9);
  if (kind === "walking") return (0.1 * speedKmh * 1000 / 60 + 3.5) / 3.5;
  if (kind === "running") return (0.2 * speedKmh * 1000 / 60 + 3.5) / 3.5;
  const curve: [number, number][] = [[8,3],[16.1,4],[19.3,6.8],[22.5,8],[25.7,10],[30.6,12],[32.2,15.8]];
  if (speedKmh <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (speedKmh <= curve[i][0]) {
      const [x1, y1] = curve[i - 1], [x2, y2] = curve[i];
      return y1 + (speedKmh - x1) / (x2 - x1) * (y2 - y1);
    }
  }
  return curve[curve.length - 1][1];
}

export function estimateActivityEnergy(kind: ActivityKind, weightKg: number, distanceKm?: number | null, durationMinutes?: number | null) {
  const distance = Number(distanceKm) > 0 ? Number(distanceKm) : null;
  let duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 0;
  let pace: number | null = null;
  let paceSource = "actual_timing";
  if (distance) {
    if (duration > 0) pace = duration / distance;
    else { pace = GENERIC_PACE_MIN_PER_KM[kind]; paceSource = "generic_fallback"; duration = distance * pace; }
  }
  const met = metForPace(kind, pace || GENERIC_PACE_MIN_PER_KM[kind]);
  return {
    durationMinutes: Math.round(duration * 10) / 10,
    distanceKm: distance,
    paceMinutesPerKm: pace ? Math.round(pace * 100) / 100 : null,
    paceSource,
    met: Math.round(met * 100) / 100,
    netKcal: Math.round(netActivityKcal(met, weightKg, duration)),
    confidence: paceSource === "actual_timing" ? "medium" : "low",
  };
}

export function estimateWorkoutEnergyMcp(input: { durationMinutes: number; completedSets: number; compoundSets?: number; weightKg: number }) {
  const activeDurationMinutes = clamp(input.durationMinutes, 0, 8 * 60);
  const sets = Math.max(0, input.completedSets);
  const density = activeDurationMinutes > 0 ? sets / activeDurationMinutes : 0;
  const compoundRatio = sets > 0 ? (input.compoundSets || 0) / sets : 0;
  let intensity: "light" | "normal" | "vigorous" = "normal";
  if (sets <= 5 || activeDurationMinutes < 20) intensity = "light";
  else if (sets >= 14 && activeDurationMinutes >= 40 && (density >= 0.18 || compoundRatio >= 0.45)) intensity = "vigorous";
  const met = intensity === "light" ? 3.5 : intensity === "vigorous" ? 5.5 : 4.5;
  const netKcal = netActivityKcal(met, input.weightKg, activeDurationMinutes);
  return {
    intensity, met,
    activeDurationMinutes: Math.round(activeDurationMinutes * 10) / 10,
    netKcal: Math.round(netKcal),
    confidence: sets >= 8 && activeDurationMinutes >= 25 ? "medium" : "low",
  };
}
