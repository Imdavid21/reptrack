import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

// These are the primary product surfaces normalized together. The check is
// intentionally focused so legacy/utility screens can migrate independently
// without weakening the contract for Home, Workout, History, and Data Room.
const surfaces = [
  'src/pages/Dashboard.tsx',
  'src/pages/AdaptiveWorkout.tsx',
  'src/pages/History.tsx',
  'src/pages/Dataroom.tsx',
  'src/components/dashboard/TodaySnapshot.tsx',
  'src/components/health/CalorieTrackerCompact.tsx',
  'src/components/analytics/DateRangeSelector.tsx',
  'src/components/common/LogDateChip.tsx',
  'src/components/dataroom/DataRoomVisuals.tsx',
  'src/components/dataroom/TemporalDecisionMatrix.tsx',
  'src/components/ui/MuiCard.tsx',
];

const forbidden = [
  {
    pattern: /rounded-\[(?:20|28)px\]/g,
    reason: 'use the 16px card or 24px sheet token instead of legacy one-off radii',
  },
  {
    pattern: /space-y-9/g,
    reason: '36px is outside the documented 4/8/12/16/20/24/32/40 spacing scale',
  },
  {
    pattern: /borderRadius:\s*(?:2\.5|3|4)(?=[,\s}])/g,
    reason: 'MUI numeric radii obscure the 12/16/24px geometry contract; use an explicit token value',
  },
  {
    pattern: /minHeight:\s*(?:48|54)(?=[,\s}])/g,
    reason: 'controls should use the 36/44/52px size system',
  },
];

const failures = [];
for (const surface of surfaces) {
  const source = await readFile(join(root, surface), 'utf8');
  for (const rule of forbidden) {
    for (const match of source.matchAll(rule.pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${surface}:${line} ${match[0]} — ${rule.reason}`);
    }
  }
}

if (failures.length) {
  console.error(`Design consistency check failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Design consistency check passed for ${surfaces.length} core surfaces.`);
