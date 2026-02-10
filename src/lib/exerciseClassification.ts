/**
 * Centralised exercise classification.
 *
 * Single source of truth used by both `useBodyPartsProgress` (detailed bodyPart)
 * and `StrengthOverviewChart` (overview muscleGroup).
 *
 * To add a new exercise, add one entry here — nothing else to change.
 */

import { normalizeExerciseName } from './exerciseMatching';

interface Classification {
  bodyPart: string;   // detailed: Chest, Quads, Triceps, Biceps …
  muscleGroup: string; // overview: chest, back, shoulders, arms, legs, core
}

// ── Lookup map (lowercased keys) ────────────────────────────────────────────
const EXERCISE_CLASSIFICATION: Record<string, Classification> = {
  // ─── CHEST ────────────────────────────────────────────────────────────────
  'barbell bench press':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'dumbbell bench press':       { bodyPart: 'Chest', muscleGroup: 'chest' },
  'flat dumbbell bench press':  { bodyPart: 'Chest', muscleGroup: 'chest' },
  'flat dumbbell bench':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'flat barbell bench':         { bodyPart: 'Chest', muscleGroup: 'chest' },
  'flat db bench':              { bodyPart: 'Chest', muscleGroup: 'chest' },
  'flat db bench press':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'db flat bench':              { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline barbell bench press':{ bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline barbell bench':      { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline bb bench':           { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline barbell press':      { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline dumbbell press':     { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline db press':           { bodyPart: 'Chest', muscleGroup: 'chest' },
  'decline bench press':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'decline dumbbell press':     { bodyPart: 'Chest', muscleGroup: 'chest' },
  'cable flyes':                { bodyPart: 'Chest', muscleGroup: 'chest' },
  'cable fly':                  { bodyPart: 'Chest', muscleGroup: 'chest' },
  'cable crossover':            { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline dumbbell flyes':     { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline db fly':             { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline dumbbell fly':       { bodyPart: 'Chest', muscleGroup: 'chest' },
  'chest fly':                  { bodyPart: 'Chest', muscleGroup: 'chest' },
  'chest press':                { bodyPart: 'Chest', muscleGroup: 'chest' },
  'machine chest press':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'pec deck':                   { bodyPart: 'Chest', muscleGroup: 'chest' },
  'push-ups':                   { bodyPart: 'Chest', muscleGroup: 'chest' },
  'pushups':                    { bodyPart: 'Chest', muscleGroup: 'chest' },
  'push ups':                   { bodyPart: 'Chest', muscleGroup: 'chest' },
  'incline push-ups':           { bodyPart: 'Chest', muscleGroup: 'chest' },
  'decline push-ups':           { bodyPart: 'Chest', muscleGroup: 'chest' },
  'close grip push-ups':        { bodyPart: 'Chest', muscleGroup: 'chest' },
  'dips':                       { bodyPart: 'Chest', muscleGroup: 'chest' },
  'weighted dips':              { bodyPart: 'Chest', muscleGroup: 'chest' },
  'close grip chest press':     { bodyPart: 'Chest', muscleGroup: 'chest' },
  'bench press':                { bodyPart: 'Chest', muscleGroup: 'chest' },
  'db bench press':             { bodyPart: 'Chest', muscleGroup: 'chest' },
  'db press':                   { bodyPart: 'Chest', muscleGroup: 'chest' },
  'db bench':                   { bodyPart: 'Chest', muscleGroup: 'chest' },

  // ─── SHOULDERS ────────────────────────────────────────────────────────────
  'overhead press':             { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'barbell overhead press':     { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'barbell ohp':                { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'ohp':                        { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'dumbbell shoulder press':    { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'seated dumbbell shoulder press': { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'seated db shoulder press':   { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'db shoulder press':          { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'military press':             { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'arnold press':               { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'lateral raises':             { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'lateral raise':              { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'dumbbell lateral raises':    { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'dumbbell lateral raise':     { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'cable lateral raise':        { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'cable lateral raises':       { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'lateral raise machine':      { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'db lateral raise':           { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'db lateral raises':          { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'front raises':               { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'front raise':                { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'dumbbell front raise':       { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'bent over rear delt flyes':  { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'rear delt fly':              { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'rear delt flyes':            { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'rear delt fly + lat raise':  { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'face pulls':                 { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'face pull':                  { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'reverse flyes':              { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'reverse fly':                { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'reverse pec deck':           { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'upright row':                { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'upright rows':               { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'shrugs':                     { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'barbell shrugs':             { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },
  'dumbbell shrugs':            { bodyPart: 'Shoulders', muscleGroup: 'shoulders' },

  // ─── ARMS — Triceps ──────────────────────────────────────────────────────
  'tricep pushdown':            { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep pushdowns':           { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'cable tricep pushdowns':     { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'cable tricep pushdown':      { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'cable pushdown':             { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'rope pushdown':              { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'rope pushdowns':             { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'overhead tricep extension':  { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'overhead cable tricep extension': { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'cable rope overhead tricep extension': { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'dumbbell overhead extension':{ bodyPart: 'Triceps', muscleGroup: 'arms' },
  'overhead extension':         { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep extension':           { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep extensions':          { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'skull crushers':             { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'skull crusher':              { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'close grip bench press':     { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep dips':                { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'diamond push-ups':           { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep kickback':            { bodyPart: 'Triceps', muscleGroup: 'arms' },
  'tricep kickbacks':           { bodyPart: 'Triceps', muscleGroup: 'arms' },

  // ─── ARMS — Biceps ───────────────────────────────────────────────────────
  'barbell curl':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'barbell curls':              { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'dumbbell curl':              { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'dumbbell curls':             { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'db bicep curl':              { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'db bicep curls':             { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'db curl':                    { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'db curls':                   { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'bicep curls':                { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'bicep curl':                 { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'hammer curls':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'hammer curl':                { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'incline dumbbell curl':      { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'incline dumbbell curls':     { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'incline curl':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'cable curl':                 { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'cable curls':                { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'ez bar preacher curls':      { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'ez bar preacher curl':       { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'preacher curl':              { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'preacher curls':             { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'ez bar curl':                { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'ez bar curls':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'concentration curls':        { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'concentration curl':         { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'spider curl':                { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'spider curls':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'reverse curl':               { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'reverse curls':              { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'wrist curl':                 { bodyPart: 'Biceps', muscleGroup: 'arms' },
  'wrist curls':                { bodyPart: 'Biceps', muscleGroup: 'arms' },

  // ─── BACK ─────────────────────────────────────────────────────────────────
  'pull-ups':                   { bodyPart: 'Back', muscleGroup: 'back' },
  'pull ups':                   { bodyPart: 'Back', muscleGroup: 'back' },
  'pullups':                    { bodyPart: 'Back', muscleGroup: 'back' },
  'weighted pull-ups':          { bodyPart: 'Back', muscleGroup: 'back' },
  'weighted pullups':           { bodyPart: 'Back', muscleGroup: 'back' },
  'negative pull-ups':          { bodyPart: 'Back', muscleGroup: 'back' },
  'chin-ups':                   { bodyPart: 'Back', muscleGroup: 'back' },
  'chin ups':                   { bodyPart: 'Back', muscleGroup: 'back' },
  'chinups':                    { bodyPart: 'Back', muscleGroup: 'back' },
  'weighted chin-ups':          { bodyPart: 'Back', muscleGroup: 'back' },
  'lat pulldown':               { bodyPart: 'Back', muscleGroup: 'back' },
  'lat pulldowns':              { bodyPart: 'Back', muscleGroup: 'back' },
  'wide grip lat pulldown':     { bodyPart: 'Back', muscleGroup: 'back' },
  'close grip lat pulldown':    { bodyPart: 'Back', muscleGroup: 'back' },
  'straight arm pulldown':      { bodyPart: 'Back', muscleGroup: 'back' },
  'straight arm pulldowns':     { bodyPart: 'Back', muscleGroup: 'back' },
  'barbell row':                { bodyPart: 'Back', muscleGroup: 'back' },
  'barbell rows':               { bodyPart: 'Back', muscleGroup: 'back' },
  'bent over row':              { bodyPart: 'Back', muscleGroup: 'back' },
  'bent over rows':             { bodyPart: 'Back', muscleGroup: 'back' },
  'pendlay row':                { bodyPart: 'Back', muscleGroup: 'back' },
  'pendlay rows':               { bodyPart: 'Back', muscleGroup: 'back' },
  't-bar row':                  { bodyPart: 'Back', muscleGroup: 'back' },
  't-bar rows':                 { bodyPart: 'Back', muscleGroup: 'back' },
  'seated cable row':           { bodyPart: 'Back', muscleGroup: 'back' },
  'seated cable rows':          { bodyPart: 'Back', muscleGroup: 'back' },
  'cable seated row':           { bodyPart: 'Back', muscleGroup: 'back' },
  'cable rows':                 { bodyPart: 'Back', muscleGroup: 'back' },
  'cable row':                  { bodyPart: 'Back', muscleGroup: 'back' },
  'single arm dumbbell row':    { bodyPart: 'Back', muscleGroup: 'back' },
  'single arm dumbbell rows':   { bodyPart: 'Back', muscleGroup: 'back' },
  'single arm db row':          { bodyPart: 'Back', muscleGroup: 'back' },
  'single arm db rows':         { bodyPart: 'Back', muscleGroup: 'back' },
  'dumbbell row':               { bodyPart: 'Back', muscleGroup: 'back' },
  'dumbbell rows':              { bodyPart: 'Back', muscleGroup: 'back' },
  'db row':                     { bodyPart: 'Back', muscleGroup: 'back' },
  'db rows':                    { bodyPart: 'Back', muscleGroup: 'back' },
  'conventional deadlift':      { bodyPart: 'Back', muscleGroup: 'back' },
  'deadlift':                   { bodyPart: 'Back', muscleGroup: 'back' },
  'deadlifts':                  { bodyPart: 'Back', muscleGroup: 'back' },
  'deadlift technique work':    { bodyPart: 'Back', muscleGroup: 'back' },
  'deadlift technique':         { bodyPart: 'Back', muscleGroup: 'back' },
  'sumo deadlift':              { bodyPart: 'Back', muscleGroup: 'back' },
  'rack pull':                  { bodyPart: 'Back', muscleGroup: 'back' },
  'rack pulls':                 { bodyPart: 'Back', muscleGroup: 'back' },

  // ─── LEGS — Quads ─────────────────────────────────────────────────────────
  'barbell squat':              { bodyPart: 'Quads', muscleGroup: 'legs' },
  'barbell squats':             { bodyPart: 'Quads', muscleGroup: 'legs' },
  'back squat':                 { bodyPart: 'Quads', muscleGroup: 'legs' },
  'back squats':                { bodyPart: 'Quads', muscleGroup: 'legs' },
  'front squat':                { bodyPart: 'Quads', muscleGroup: 'legs' },
  'front squats':               { bodyPart: 'Quads', muscleGroup: 'legs' },
  'bodyweight squats':          { bodyPart: 'Quads', muscleGroup: 'legs' },
  'bodyweight squat':           { bodyPart: 'Quads', muscleGroup: 'legs' },
  'goblet squats':              { bodyPart: 'Quads', muscleGroup: 'legs' },
  'goblet squat':               { bodyPart: 'Quads', muscleGroup: 'legs' },
  'hack squat':                 { bodyPart: 'Quads', muscleGroup: 'legs' },
  'hack squats':                { bodyPart: 'Quads', muscleGroup: 'legs' },
  'leg press':                  { bodyPart: 'Quads', muscleGroup: 'legs' },
  'leg extension':              { bodyPart: 'Quads', muscleGroup: 'legs' },
  'leg extensions':             { bodyPart: 'Quads', muscleGroup: 'legs' },
  'sissy squats':               { bodyPart: 'Quads', muscleGroup: 'legs' },
  'sissy squat':                { bodyPart: 'Quads', muscleGroup: 'legs' },
  'bulgarian split squat':      { bodyPart: 'Quads', muscleGroup: 'legs' },
  'bulgarian split squats':     { bodyPart: 'Quads', muscleGroup: 'legs' },
  'walking lunges':             { bodyPart: 'Quads', muscleGroup: 'legs' },
  'walking lunge':              { bodyPart: 'Quads', muscleGroup: 'legs' },
  'lunges':                     { bodyPart: 'Quads', muscleGroup: 'legs' },
  'lunge':                      { bodyPart: 'Quads', muscleGroup: 'legs' },
  'dumbbell lunges':            { bodyPart: 'Quads', muscleGroup: 'legs' },
  'dumbbell lunge':             { bodyPart: 'Quads', muscleGroup: 'legs' },
  'squats':                     { bodyPart: 'Quads', muscleGroup: 'legs' },
  'squat':                      { bodyPart: 'Quads', muscleGroup: 'legs' },
  'wall sit':                   { bodyPart: 'Quads', muscleGroup: 'legs' },
  'step ups':                   { bodyPart: 'Quads', muscleGroup: 'legs' },
  'step up':                    { bodyPart: 'Quads', muscleGroup: 'legs' },
  'box squat':                  { bodyPart: 'Quads', muscleGroup: 'legs' },
  'box squats':                 { bodyPart: 'Quads', muscleGroup: 'legs' },
  'smith machine squat':        { bodyPart: 'Quads', muscleGroup: 'legs' },

  // ─── LEGS — Hamstrings ────────────────────────────────────────────────────
  'romanian deadlift':          { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'romanian deadlifts':         { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'rdl':                        { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'dumbbell rdl':               { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'db rdl':                     { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'single leg romanian deadlifts': { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'single leg romanian deadlift':  { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'single leg rdl':             { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'stiff leg deadlift':         { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'stiff leg deadlifts':        { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'good mornings':              { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'good morning':               { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'leg curl':                   { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'leg curls':                  { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'seated leg curl':            { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'lying leg curl':             { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'nordic curl':                { bodyPart: 'Hamstrings', muscleGroup: 'legs' },
  'nordic curls':               { bodyPart: 'Hamstrings', muscleGroup: 'legs' },

  // ─── LEGS — Glutes ────────────────────────────────────────────────────────
  'hip thrust':                 { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'hip thrusts':                { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'barbell hip thrust':         { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'glute bridge':               { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'glute bridges':              { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'cable kickback':             { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'cable kickbacks':            { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'donkey kick':                { bodyPart: 'Glutes', muscleGroup: 'legs' },
  'donkey kicks':               { bodyPart: 'Glutes', muscleGroup: 'legs' },

  // ─── LEGS — Calves ────────────────────────────────────────────────────────
  'standing calf raise':        { bodyPart: 'Calves', muscleGroup: 'legs' },
  'standing calf raises':       { bodyPart: 'Calves', muscleGroup: 'legs' },
  'seated calf raise':          { bodyPart: 'Calves', muscleGroup: 'legs' },
  'seated calf raises':         { bodyPart: 'Calves', muscleGroup: 'legs' },
  'calf raises':                { bodyPart: 'Calves', muscleGroup: 'legs' },
  'calf raise':                 { bodyPart: 'Calves', muscleGroup: 'legs' },

  // ─── CORE ─────────────────────────────────────────────────────────────────
  'ab wheel rollout':           { bodyPart: 'Core', muscleGroup: 'core' },
  'ab wheel':                   { bodyPart: 'Core', muscleGroup: 'core' },
  'plank':                      { bodyPart: 'Core', muscleGroup: 'core' },
  'planks':                     { bodyPart: 'Core', muscleGroup: 'core' },
  'crunches':                   { bodyPart: 'Core', muscleGroup: 'core' },
  'sit ups':                    { bodyPart: 'Core', muscleGroup: 'core' },
  'sit-ups':                    { bodyPart: 'Core', muscleGroup: 'core' },
  'hanging leg raise':          { bodyPart: 'Core', muscleGroup: 'core' },
  'hanging leg raises':         { bodyPart: 'Core', muscleGroup: 'core' },
  'cable crunch':               { bodyPart: 'Core', muscleGroup: 'core' },
  'cable crunches':             { bodyPart: 'Core', muscleGroup: 'core' },
  'russian twist':              { bodyPart: 'Core', muscleGroup: 'core' },
  'russian twists':             { bodyPart: 'Core', muscleGroup: 'core' },
  'leg raise':                  { bodyPart: 'Core', muscleGroup: 'core' },
  'leg raises':                 { bodyPart: 'Core', muscleGroup: 'core' },
};

// ── Fallback pattern matching ────────────────────────────────────────────────
// Multi-word patterns MUST come before single-word to avoid false positives.
const FALLBACK_PATTERNS: [string, Classification][] = [
  // Legs multi-word (must precede 'extension', 'curl', 'press')
  ['leg extension',  { bodyPart: 'Quads',      muscleGroup: 'legs' }],
  ['leg press',      { bodyPart: 'Quads',      muscleGroup: 'legs' }],
  ['leg curl',       { bodyPart: 'Hamstrings',  muscleGroup: 'legs' }],
  ['split squat',    { bodyPart: 'Quads',      muscleGroup: 'legs' }],
  ['calf raise',     { bodyPart: 'Calves',     muscleGroup: 'legs' }],
  ['hip thrust',     { bodyPart: 'Glutes',     muscleGroup: 'legs' }],
  ['good morning',   { bodyPart: 'Hamstrings',  muscleGroup: 'legs' }],
  // Arms multi-word
  ['tricep extension', { bodyPart: 'Triceps', muscleGroup: 'arms' }],
  ['overhead extension', { bodyPart: 'Triceps', muscleGroup: 'arms' }],
  ['bench press',    { bodyPart: 'Chest',      muscleGroup: 'chest' }],
  ['overhead press', { bodyPart: 'Shoulders',  muscleGroup: 'shoulders' }],
  ['lateral raise',  { bodyPart: 'Shoulders',  muscleGroup: 'shoulders' }],
  ['front raise',    { bodyPart: 'Shoulders',  muscleGroup: 'shoulders' }],
  ['face pull',      { bodyPart: 'Shoulders',  muscleGroup: 'shoulders' }],
  ['rear delt',      { bodyPart: 'Shoulders',  muscleGroup: 'shoulders' }],
  ['lat pulldown',   { bodyPart: 'Back',       muscleGroup: 'back' }],
  ['pull-up',        { bodyPart: 'Back',       muscleGroup: 'back' }],
  ['pullup',         { bodyPart: 'Back',       muscleGroup: 'back' }],
  ['chin-up',        { bodyPart: 'Back',       muscleGroup: 'back' }],
  ['deadlift',       { bodyPart: 'Back',       muscleGroup: 'back' }],
  // Single-word fallbacks
  ['squat',    { bodyPart: 'Quads',     muscleGroup: 'legs' }],
  ['lunge',    { bodyPart: 'Quads',     muscleGroup: 'legs' }],
  ['row',      { bodyPart: 'Back',      muscleGroup: 'back' }],
  ['curl',     { bodyPart: 'Biceps',    muscleGroup: 'arms' }],
  ['fly',      { bodyPart: 'Chest',     muscleGroup: 'chest' }],
  ['flye',     { bodyPart: 'Chest',     muscleGroup: 'chest' }],
  ['press',    { bodyPart: 'Chest',     muscleGroup: 'chest' }],
  ['dip',      { bodyPart: 'Chest',     muscleGroup: 'chest' }],
  ['push',     { bodyPart: 'Chest',     muscleGroup: 'chest' }],
  ['pulldown', { bodyPart: 'Back',      muscleGroup: 'back' }],
  ['extension',{ bodyPart: 'Triceps',   muscleGroup: 'arms' }],
  ['pushdown', { bodyPart: 'Triceps',   muscleGroup: 'arms' }],
  ['skull',    { bodyPart: 'Triceps',   muscleGroup: 'arms' }],
  ['tricep',   { bodyPart: 'Triceps',   muscleGroup: 'arms' }],
  ['bicep',    { bodyPart: 'Biceps',    muscleGroup: 'arms' }],
  ['hammer',   { bodyPart: 'Biceps',    muscleGroup: 'arms' }],
  ['shoulder', { bodyPart: 'Shoulders', muscleGroup: 'shoulders' }],
  ['lateral',  { bodyPart: 'Shoulders', muscleGroup: 'shoulders' }],
  ['arnold',   { bodyPart: 'Shoulders', muscleGroup: 'shoulders' }],
  ['calf',     { bodyPart: 'Calves',    muscleGroup: 'legs' }],
  ['glute',    { bodyPart: 'Glutes',    muscleGroup: 'legs' }],
  ['rdl',      { bodyPart: 'Hamstrings',muscleGroup: 'legs' }],
  ['romanian', { bodyPart: 'Hamstrings',muscleGroup: 'legs' }],
  ['hamstring',{ bodyPart: 'Hamstrings',muscleGroup: 'legs' }],
  ['thrust',   { bodyPart: 'Glutes',    muscleGroup: 'legs' }],
  ['goblet',   { bodyPart: 'Quads',     muscleGroup: 'legs' }],
  ['plank',    { bodyPart: 'Core',      muscleGroup: 'core' }],
  ['crunch',   { bodyPart: 'Core',      muscleGroup: 'core' }],
  ['ab ',      { bodyPart: 'Core',      muscleGroup: 'core' }],
];

// ── Category fallback ────────────────────────────────────────────────────────
const CATEGORY_FALLBACK: Record<string, Classification> = {
  push:  { bodyPart: 'Chest',  muscleGroup: 'chest' },
  pull:  { bodyPart: 'Back',   muscleGroup: 'back' },
  legs:  { bodyPart: 'Quads',  muscleGroup: 'legs' },
  core:  { bodyPart: 'Core',   muscleGroup: 'core' },
};

// ── Lookup logic ─────────────────────────────────────────────────────────────
function classify(name: string): Classification | undefined {
  const lower = name.toLowerCase().trim();

  // 1 — exact match
  if (EXERCISE_CLASSIFICATION[lower]) return EXERCISE_CLASSIFICATION[lower];

  // 2 — normalized match
  const norm = normalizeExerciseName(name);
  for (const [key, value] of Object.entries(EXERCISE_CLASSIFICATION)) {
    if (normalizeExerciseName(key) === norm) return value;
  }

  // 3 — fallback pattern matching (ordered: multi-word first)
  for (const [pattern, cls] of FALLBACK_PATTERNS) {
    if (lower.includes(pattern)) return cls;
  }

  return undefined;
}

/** Detailed body-part label — e.g. Quads, Triceps, Hamstrings */
export function getBodyPart(name: string, fallbackCategory?: string): string {
  const cls = classify(name);
  if (cls) return cls.bodyPart;

  // category fallback
  if (fallbackCategory && CATEGORY_FALLBACK[fallbackCategory]) {
    return CATEGORY_FALLBACK[fallbackCategory].bodyPart;
  }
  return 'Other';
}

/** Overview muscle-group label — chest, back, shoulders, arms, legs, core */
export function getMuscleGroup(name: string): string {
  const cls = classify(name);
  return cls?.muscleGroup ?? 'other';
}
