/**
 * Single source of truth for the user-facing app version. Update this on each
 * release; everything that displays the version reads from here.
 *
 * Format: major.minor — no build/commit-count suffix.
 *  - Bump minor (x.N) for a normal batch of fixes/small features.
 *  - Bump major (X.0) when a release ships a genuinely major feature
 *    (a new mode/engine, a significant system rework) rather than
 *    incremental changes.
 */
export const APP_VERSION = '5.0';
