import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const rawColorAllowlist = new Set([
  'theme\\muiTheme.ts',
  'pages\\Auth.tsx',
  'pages\\Settings.tsx',
  'pages\\AdaptiveWorkout.tsx',
]);
const utilityColorAllowlist = new Set(['components\\pwa\\PWAPrompt.tsx']);
const rawColor = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
const directUtility = /(?:bg|text|border)-(?:red|green|blue|yellow|orange|purple|gray|slate|zinc|neutral)-\d{2,3}/g;
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (['.ts', '.tsx', '.css'].includes(extname(entry.name))) {
      const source = await readFile(path, 'utf8');
      const sourcePath = relative(root, path);
      const rules = [
        ...(rawColorAllowlist.has(sourcePath) ? [] : [[rawColor, 'use a semantic theme token instead of a raw color']]),
        ...(utilityColorAllowlist.has(sourcePath) ? [] : [[directUtility, 'use a semantic Tailwind color instead of a named palette utility']]),
      ];
      for (const [pattern, reason] of rules) {
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split('\n').length;
          failures.push(`${sourcePath}:${line} ${match[0]} — ${reason}`);
        }
      }
    }
  }
}

await walk(root);
if (failures.length) {
  console.error(`Color-system check failed:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('Color-system check passed.');
