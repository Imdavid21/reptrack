import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const forbidden = [
  { pattern: /text-\[(?:[0-9]|1[01])px\]/g, reason: 'visible text must be at least 12px' },
  { pattern: /text-\[0\.[0-7]rem\]/g, reason: 'use the semantic type utilities instead of sub-12px rem values' },
];
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (['.ts', '.tsx', '.css'].includes(extname(entry.name))) {
      const source = await readFile(path, 'utf8');
      for (const rule of forbidden) {
        for (const match of source.matchAll(rule.pattern)) {
          const line = source.slice(0, match.index).split('\n').length;
          failures.push(`${relative(root, path)}:${line} ${match[0]} — ${rule.reason}`);
        }
      }
    }
  }
}

await walk(root);
if (failures.length) {
  console.error(`Typography check failed:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('Typography check passed.');
