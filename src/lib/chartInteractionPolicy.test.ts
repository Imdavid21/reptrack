import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rechartsSurfaces = [
  'src/components/analytics/BodyScoreTrendCard.tsx',
  'src/components/analytics/DailyVitalsChart.tsx',
  'src/components/analytics/EfficiencyChart.tsx',
  'src/components/analytics/ExerciseProgressionChart.tsx',
  'src/components/analytics/HydrationChart.tsx',
  'src/components/analytics/VolumeSankeyChart.tsx',
  'src/components/health/CalorieChart.tsx',
  'src/components/health/MacroChart.tsx',
  'src/components/dataroom/DataRoomVisuals.tsx',
];

describe('chart interaction policy', () => {
  it.each(rechartsSurfaces)('%s exposes chart values through a tooltip', path => {
    const source = readFileSync(resolve(path), 'utf8');
    expect(source).toContain('Tooltip');
  });

  it('makes the custom bodyweight chart inspectable without tiny-point hunting', () => {
    const source = readFileSync(resolve('src/components/progress/WeightTrendChart.tsx'), 'utf8');
    expect(source).toContain('onPointerMove={inspectPointer}');
    expect(source).toContain('onPointerDown={inspectPointer}');
    expect(source).toContain("event.key === 'ArrowLeft'");
    expect(source).toContain('Trend');
    expect(source).toContain('Actual');
  });
});
