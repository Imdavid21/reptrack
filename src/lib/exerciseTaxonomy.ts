/**
 * Comprehensive Exercise Taxonomy
 * - Primary/Secondary muscle groups
 * - Equipment requirements
 * - Movement patterns for programming balance
 */

export type MovementPattern = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation';
export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'band';
export type MuscleGroup = 
  | 'chest' | 'upper_chest' | 'lower_chest'
  | 'front_delts' | 'side_delts' | 'rear_delts'
  | 'triceps' | 'biceps' | 'forearms'
  | 'lats' | 'upper_back' | 'mid_back' | 'lower_back' | 'traps' | 'rhomboids'
  | 'quads' | 'hamstrings' | 'glutes' | 'adductors' | 'abductors'
  | 'calves' | 'core' | 'hip_flexors';

export interface ExerciseTaxonomy {
  name: string;
  canonicalName: string;
  category: 'Push' | 'Pull' | 'Legs';
  exerciseType: 'primary' | 'accessory';
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  movementPattern: MovementPattern;
  defaultWeight: string;
  defaultReps: string;
  formCues: string[];
  progressionTips: string[];
}

// Comprehensive exercise database with taxonomy
export const EXERCISE_TAXONOMY: Record<string, ExerciseTaxonomy> = {
  // === PUSH EXERCISES ===
  'Barbell Bench Press': {
    name: 'Barbell Bench Press',
    canonicalName: 'bench_press',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'barbell',
    movementPattern: 'push',
    defaultWeight: '60kg',
    defaultReps: '4x6-8',
    formCues: [
      'Retract shoulder blades and arch upper back',
      'Touch mid-chest, elbows at 45-75°',
      'Drive feet into floor, squeeze glutes',
      'Press in a slight J-curve toward face'
    ],
    progressionTips: [
      'Add 2.5kg when you hit all reps with 1-2 RIR',
      'If stuck, try pause reps at chest',
      'Consider tempo work: 3-1-1-0'
    ]
  },
  'Incline Barbell Bench Press': {
    name: 'Incline Barbell Bench Press',
    canonicalName: 'incline_bench_press',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['upper_chest', 'front_delts'],
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    movementPattern: 'push',
    defaultWeight: '55kg',
    defaultReps: '4x8-10',
    formCues: [
      'Set bench at 30-45° angle',
      'Lower to upper chest/clavicle area',
      'Keep wrists stacked over elbows',
      'Maintain shoulder blade retraction'
    ],
    progressionTips: [
      'Progress slower than flat bench (smaller muscles)',
      'Try 30° vs 45° to find your sweet spot'
    ]
  },
  'Dumbbell Bench Press': {
    name: 'Dumbbell Bench Press',
    canonicalName: 'db_bench_press',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
    movementPattern: 'push',
    defaultWeight: '20kg',
    defaultReps: '4x8-10',
    formCues: [
      'Bring DBs together at top (slight arc)',
      'Lower until DBs are at chest level',
      'Keep neutral spine, feet flat',
      'Control the eccentric (3 seconds down)'
    ],
    progressionTips: [
      'When you can do 12 reps easily, go up 2kg per hand',
      'Great for addressing strength imbalances'
    ]
  },
  'Incline Dumbbell Press': {
    name: 'Incline Dumbbell Press',
    canonicalName: 'incline_db_press',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['upper_chest'],
    secondaryMuscles: ['front_delts', 'triceps'],
    equipment: 'dumbbell',
    movementPattern: 'push',
    defaultWeight: '28kg',
    defaultReps: '4x8-10',
    formCues: [
      'Squeeze chest hard at the top',
      'Keep elbows at 45° from torso',
      'Control the stretch at bottom'
    ],
    progressionTips: [
      'Alternate between neutral and pronated grip weekly'
    ]
  },
  'Overhead Press': {
    name: 'Overhead Press',
    canonicalName: 'ohp',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['triceps', 'upper_chest', 'core'],
    equipment: 'barbell',
    movementPattern: 'push',
    defaultWeight: '40kg',
    defaultReps: '4x6-8',
    formCues: [
      'Squeeze glutes and brace core hard',
      'Bar path: chin back, press straight up',
      'Lock out with bar over mid-foot',
      'Don\'t hyperextend lower back'
    ],
    progressionTips: [
      'OHP progresses slowest - be patient',
      'Add 1-2.5kg when all sets complete',
      'Push press can help break plateaus'
    ]
  },
  'Dumbbell Shoulder Press': {
    name: 'Dumbbell Shoulder Press',
    canonicalName: 'db_shoulder_press',
    category: 'Push',
    exerciseType: 'primary',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    movementPattern: 'push',
    defaultWeight: '22kg',
    defaultReps: '3x10-12',
    formCues: [
      'Start with DBs at shoulder height',
      'Press up and slightly inward',
      'Keep core tight, don\'t lean back'
    ],
    progressionTips: [
      'Seated removes momentum, standing adds core work'
    ]
  },
  'Lateral Raises': {
    name: 'Lateral Raises',
    canonicalName: 'lateral_raise',
    category: 'Push',
    exerciseType: 'accessory',
    primaryMuscles: ['side_delts'],
    secondaryMuscles: ['traps'],
    equipment: 'dumbbell',
    movementPattern: 'isolation',
    defaultWeight: '10kg',
    defaultReps: '4x12-15',
    formCues: [
      'Slight bend in elbows throughout',
      'Lead with elbows, not hands',
      'Raise to shoulder height only',
      'Control the negative - no swinging'
    ],
    progressionTips: [
      'Keep weight light, focus on mind-muscle connection',
      'Partials at the top burn out side delts'
    ]
  },
  'Tricep Pushdown': {
    name: 'Tricep Pushdown',
    canonicalName: 'tricep_pushdown',
    category: 'Push',
    exerciseType: 'accessory',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    equipment: 'cable',
    movementPattern: 'isolation',
    defaultWeight: '25kg',
    defaultReps: '3x12-15',
    formCues: [
      'Pin elbows to sides throughout',
      'Fully extend at bottom, squeeze 1 second',
      'Control the eccentric - don\'t let weight pull you up'
    ],
    progressionTips: [
      'Try different attachments: rope, bar, V-bar',
      'Drop sets work well for triceps'
    ]
  },
  'Dips': {
    name: 'Dips',
    canonicalName: 'dips',
    category: 'Push',
    exerciseType: 'accessory',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front_delts'],
    equipment: 'bodyweight',
    movementPattern: 'push',
    defaultWeight: 'BW',
    defaultReps: '3x10-12',
    formCues: [
      'Lean forward for chest, upright for triceps',
      'Go to 90° elbow bend minimum',
      'Keep shoulders down, don\'t shrug'
    ],
    progressionTips: [
      'Add weight when you hit 15+ clean reps',
      'Watch shoulder mobility - stop if pain'
    ]
  },

  // === PULL EXERCISES ===
  'Pull-ups': {
    name: 'Pull-ups',
    canonicalName: 'pullup',
    category: 'Pull',
    exerciseType: 'primary',
    primaryMuscles: ['lats', 'upper_back'],
    secondaryMuscles: ['biceps', 'rear_delts', 'forearms'],
    equipment: 'bodyweight',
    movementPattern: 'pull',
    defaultWeight: 'BW',
    defaultReps: '4xAMRAP',
    formCues: [
      'Initiate by depressing and retracting scapulae',
      'Pull elbows down and back toward hips',
      'Chin over bar, pause at top',
      'Full extension at bottom, no half reps'
    ],
    progressionTips: [
      'Greasing the groove: do sets throughout the day',
      'Add weight when you hit 12+ strict reps',
      'Negatives build strength fast'
    ]
  },
  'Weighted Pull-ups': {
    name: 'Weighted Pull-ups',
    canonicalName: 'weighted_pullup',
    category: 'Pull',
    exerciseType: 'primary',
    primaryMuscles: ['lats', 'upper_back'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    equipment: 'bodyweight',
    movementPattern: 'pull',
    defaultWeight: '+10kg',
    defaultReps: '4x6-8',
    formCues: [
      'Same form as bodyweight',
      'Control the swing from added weight',
      'Full ROM - no kipping'
    ],
    progressionTips: [
      'Progress by 2.5kg when hitting all reps',
      'Alternate with high-rep bodyweight days'
    ]
  },
  'Conventional Deadlift': {
    name: 'Conventional Deadlift',
    canonicalName: 'deadlift',
    category: 'Pull',
    exerciseType: 'primary',
    primaryMuscles: ['hamstrings', 'glutes', 'lower_back'],
    secondaryMuscles: ['lats', 'traps', 'forearms', 'quads'],
    equipment: 'barbell',
    movementPattern: 'hinge',
    defaultWeight: '100kg',
    defaultReps: '4x5',
    formCues: [
      'Bar over mid-foot, shins vertical',
      'Brace core hard - push belly out against belt',
      'Chest up, squeeze lats like breaking the bar',
      'Drive through heels, hips and shoulders rise together',
      'Lockout by squeezing glutes, not hyperextending'
    ],
    progressionTips: [
      'Don\'t ego lift - form breaks = injury risk',
      'Add 5kg when all sets are clean',
      'Deficit deadlifts build off-floor power'
    ]
  },
  'Barbell Row': {
    name: 'Barbell Row',
    canonicalName: 'barbell_row',
    category: 'Pull',
    exerciseType: 'primary',
    primaryMuscles: ['lats', 'mid_back', 'rhomboids'],
    secondaryMuscles: ['biceps', 'rear_delts', 'lower_back'],
    equipment: 'barbell',
    movementPattern: 'pull',
    defaultWeight: '60kg',
    defaultReps: '4x6-8',
    formCues: [
      'Hinge to 45-60° torso angle',
      'Pull to lower chest/upper abs',
      'Squeeze shoulder blades at top for 1 second',
      'Keep lower back neutral, don\'t round'
    ],
    progressionTips: [
      'Pendlay rows (from floor) build explosive power',
      'Progress when form stays clean at all reps'
    ]
  },
  'Lat Pulldown': {
    name: 'Lat Pulldown',
    canonicalName: 'lat_pulldown',
    category: 'Pull',
    exerciseType: 'primary',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'rear_delts', 'rhomboids'],
    equipment: 'cable',
    movementPattern: 'pull',
    defaultWeight: '55kg',
    defaultReps: '3x10-12',
    formCues: [
      'Slight lean back, chest up',
      'Pull bar to upper chest',
      'Focus on driving elbows down and back',
      'Full stretch at top, don\'t shorten ROM'
    ],
    progressionTips: [
      'Try different grips: wide, close, neutral',
      'Pause at bottom for 2 seconds to eliminate momentum'
    ]
  },
  'Seated Cable Row': {
    name: 'Seated Cable Row',
    canonicalName: 'cable_row',
    category: 'Pull',
    exerciseType: 'accessory',
    primaryMuscles: ['mid_back', 'lats'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    equipment: 'cable',
    movementPattern: 'pull',
    defaultWeight: '50kg',
    defaultReps: '3x10-12',
    formCues: [
      'Pull to lower stomach',
      'Squeeze and hold at contraction',
      'Keep torso stationary - no rocking'
    ],
    progressionTips: [
      'Great for volume after heavy compounds'
    ]
  },
  'Face Pulls': {
    name: 'Face Pulls',
    canonicalName: 'face_pull',
    category: 'Pull',
    exerciseType: 'accessory',
    primaryMuscles: ['rear_delts', 'rhomboids'],
    secondaryMuscles: ['traps', 'biceps'],
    equipment: 'cable',
    movementPattern: 'pull',
    defaultWeight: '20kg',
    defaultReps: '4x15-20',
    formCues: [
      'Pull rope to face, hands end up by ears',
      'Externally rotate at end (show your biceps)',
      'Squeeze rear delts for 2 seconds'
    ],
    progressionTips: [
      'Keep weight light - this is for shoulder health',
      'Do these every pull day for longevity'
    ]
  },
  'Barbell Curl': {
    name: 'Barbell Curl',
    canonicalName: 'barbell_curl',
    category: 'Pull',
    exerciseType: 'accessory',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    movementPattern: 'isolation',
    defaultWeight: '25kg',
    defaultReps: '3x10-12',
    formCues: [
      'Pin elbows to sides, don\'t swing',
      'Full extension at bottom',
      'Squeeze hard at top'
    ],
    progressionTips: [
      'EZ bar reduces wrist strain',
      'Cheat curls can be used sparingly for overload'
    ]
  },
  'Hammer Curls': {
    name: 'Hammer Curls',
    canonicalName: 'hammer_curl',
    category: 'Pull',
    exerciseType: 'accessory',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    equipment: 'dumbbell',
    movementPattern: 'isolation',
    defaultWeight: '12kg',
    defaultReps: '3x12-15',
    formCues: [
      'Neutral grip throughout',
      'Alternate arms or both together',
      'Control the negative'
    ],
    progressionTips: [
      'Great for brachialis development',
      'Cross-body hammers hit differently'
    ]
  },

  // === LEG EXERCISES ===
  'Barbell Squat': {
    name: 'Barbell Squat',
    canonicalName: 'squat',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'lower_back'],
    equipment: 'barbell',
    movementPattern: 'squat',
    defaultWeight: '80kg',
    defaultReps: '4x6-8',
    formCues: [
      'Brace core hard before descent',
      'Break at hips and knees simultaneously',
      'Track knees over toes - don\'t cave inward',
      'Hit parallel or below',
      'Drive up by pushing floor away'
    ],
    progressionTips: [
      'Add 5kg when all reps are clean with 1-2 RIR',
      'Pause squats build strength out of the hole',
      'Front squats can address anterior weakness'
    ]
  },
  'Front Squat': {
    name: 'Front Squat',
    canonicalName: 'front_squat',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'core', 'upper_back'],
    equipment: 'barbell',
    movementPattern: 'squat',
    defaultWeight: '60kg',
    defaultReps: '3x8-10',
    formCues: [
      'Elbows high, bar on front delts',
      'Stay upright - if you lean forward, you drop the bar',
      'Work on thoracic mobility'
    ],
    progressionTips: [
      'Progress slower than back squat',
      'Cross-grip is easier for beginners'
    ]
  },
  'Leg Press': {
    name: 'Leg Press',
    canonicalName: 'leg_press',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'machine',
    movementPattern: 'squat',
    defaultWeight: '150kg',
    defaultReps: '3x10-12',
    formCues: [
      'Keep lower back pressed into pad',
      'Don\'t lock out knees fully',
      'Foot placement affects emphasis'
    ],
    progressionTips: [
      'High and wide = more glutes/hams',
      'Low and narrow = more quads'
    ]
  },
  'Romanian Deadlift': {
    name: 'Romanian Deadlift',
    canonicalName: 'rdl',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['lower_back'],
    equipment: 'barbell',
    movementPattern: 'hinge',
    defaultWeight: '70kg',
    defaultReps: '3x8-10',
    formCues: [
      'Soft knee bend, hinge at hips',
      'Push hips back, feel hamstring stretch',
      'Bar stays close to legs',
      'Stop when you feel max stretch (don\'t go to floor)'
    ],
    progressionTips: [
      'Slow eccentric (4 seconds) builds more muscle',
      'Deficit RDLs increase ROM'
    ]
  },
  'Bulgarian Split Squat': {
    name: 'Bulgarian Split Squat',
    canonicalName: 'bss',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: 'dumbbell',
    movementPattern: 'squat',
    defaultWeight: '20kg',
    defaultReps: '3x10 each',
    formCues: [
      'Rear foot on bench, laces down',
      'Torso upright, don\'t lean forward',
      'Front knee tracks over toes',
      'Drop straight down, don\'t lunge forward'
    ],
    progressionTips: [
      'Unilateral work fixes imbalances',
      'Add weight slowly - balance is a factor'
    ]
  },
  'Hip Thrust': {
    name: 'Hip Thrust',
    canonicalName: 'hip_thrust',
    category: 'Legs',
    exerciseType: 'primary',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: 'barbell',
    movementPattern: 'hinge',
    defaultWeight: '80kg',
    defaultReps: '3x10-12',
    formCues: [
      'Upper back on bench, bar over hips',
      'Feet flat, chin tucked',
      'Drive through heels, squeeze glutes HARD at top',
      'Posterior pelvic tilt at lockout'
    ],
    progressionTips: [
      'Can go heavy on these - glutes are strong',
      'Pause at top for 3 seconds for more activation'
    ]
  },
  'Leg Extension': {
    name: 'Leg Extension',
    canonicalName: 'leg_extension',
    category: 'Legs',
    exerciseType: 'accessory',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    equipment: 'machine',
    movementPattern: 'isolation',
    defaultWeight: '45kg',
    defaultReps: '3x12-15',
    formCues: [
      'Full extension, squeeze quad 1 second',
      'Control negative - don\'t let it drop',
      'Adjust seat so pivot is at knee'
    ],
    progressionTips: [
      'Great for quad pump after compounds',
      'Single-leg version fixes imbalances'
    ]
  },
  'Leg Curl': {
    name: 'Leg Curl',
    canonicalName: 'leg_curl',
    category: 'Legs',
    exerciseType: 'accessory',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    equipment: 'machine',
    movementPattern: 'isolation',
    defaultWeight: '40kg',
    defaultReps: '3x12-15',
    formCues: [
      'Keep hips pressed down',
      'Full contraction at top',
      'Slow negative for more tension'
    ],
    progressionTips: [
      'Lying, seated, and Nordic variations all work',
      'Hamstrings recover fast - can train frequently'
    ]
  },
  'Standing Calf Raise': {
    name: 'Standing Calf Raise',
    canonicalName: 'standing_calf',
    category: 'Legs',
    exerciseType: 'accessory',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    equipment: 'machine',
    movementPattern: 'isolation',
    defaultWeight: '60kg',
    defaultReps: '4x15-20',
    formCues: [
      'Full ROM: deep stretch at bottom, full contraction at top',
      'Pause at both ends',
      'Don\'t bounce'
    ],
    progressionTips: [
      'Calves need high volume and frequency',
      'Train 3-4x per week for growth'
    ]
  }
};

// Helper to get taxonomy for any exercise name
export function getExerciseTaxonomy(exerciseName: string): ExerciseTaxonomy | null {
  // Direct match
  if (EXERCISE_TAXONOMY[exerciseName]) {
    return EXERCISE_TAXONOMY[exerciseName];
  }
  
  // Fuzzy match by canonical name or similar names
  const normalizedName = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, taxonomy] of Object.entries(EXERCISE_TAXONOMY)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedKey === normalizedName || taxonomy.canonicalName === normalizedName) {
      return taxonomy;
    }
  }
  
  // Partial match
  for (const [key, taxonomy] of Object.entries(EXERCISE_TAXONOMY)) {
    if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(taxonomy.canonicalName)) {
      return taxonomy;
    }
  }
  
  return null;
}

// Get all exercises for a muscle group
export function getExercisesForMuscle(muscle: MuscleGroup): ExerciseTaxonomy[] {
  return Object.values(EXERCISE_TAXONOMY).filter(
    ex => ex.primaryMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle)
  );
}

// Get alternative exercises (same movement pattern and primary muscle)
export function getAlternativeExercises(exerciseName: string): ExerciseTaxonomy[] {
  const current = getExerciseTaxonomy(exerciseName);
  if (!current) return [];
  
  return Object.values(EXERCISE_TAXONOMY).filter(
    ex => ex.name !== current.name &&
          ex.movementPattern === current.movementPattern &&
          ex.primaryMuscles.some(m => current.primaryMuscles.includes(m))
  );
}

// Detect muscle imbalances based on volume distribution
export function detectMuscleImbalances(
  volumeByMuscle: Record<MuscleGroup, number>
): { muscle: MuscleGroup; recommendation: string }[] {
  const imbalances: { muscle: MuscleGroup; recommendation: string }[] = [];
  
  // Check push/pull balance
  const pushVolume = (volumeByMuscle.chest || 0) + (volumeByMuscle.front_delts || 0) + (volumeByMuscle.triceps || 0);
  const pullVolume = (volumeByMuscle.lats || 0) + (volumeByMuscle.mid_back || 0) + (volumeByMuscle.rear_delts || 0) + (volumeByMuscle.biceps || 0);
  
  if (pushVolume > pullVolume * 1.3) {
    imbalances.push({ 
      muscle: 'lats', 
      recommendation: 'Add more pulling volume for shoulder health' 
    });
  }
  
  // Check quad/hamstring balance
  const quadVolume = volumeByMuscle.quads || 0;
  const hamVolume = volumeByMuscle.hamstrings || 0;
  
  if (quadVolume > hamVolume * 1.5) {
    imbalances.push({ 
      muscle: 'hamstrings', 
      recommendation: 'Add RDLs or leg curls to balance quad dominance' 
    });
  }
  
  // Check side delt volume (commonly undertrained)
  if ((volumeByMuscle.side_delts || 0) < 6) {
    imbalances.push({ 
      muscle: 'side_delts', 
      recommendation: 'Add lateral raises for shoulder width' 
    });
  }
  
  // Check rear delt volume
  if ((volumeByMuscle.rear_delts || 0) < 6) {
    imbalances.push({ 
      muscle: 'rear_delts', 
      recommendation: 'Add face pulls for posture and shoulder health' 
    });
  }
  
  return imbalances;
}
