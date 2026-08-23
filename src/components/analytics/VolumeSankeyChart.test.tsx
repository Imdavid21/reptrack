import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VolumeSankeyChart interaction', () => {
  it('exposes share and volume in the radial tooltip', () => {
    const source = readFileSync(resolve('src/components/analytics/VolumeSankeyChart.tsx'), 'utf8');
    expect(source).toContain('<Tooltip');
    expect(source).toContain("`${value}% · ${formatVolume(volume)} kg`");
    expect(source).toContain('Hover or tap a category');
  });
});
