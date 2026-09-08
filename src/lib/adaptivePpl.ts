export type SessionKey = 'push_a'|'pull_a'|'legs_a'|'push_b'|'pull_b'|'legs_b'|'recovery';
export type ReadinessBand = 'green'|'yellow'|'red';
export type Phase = 'mobility'|'activation'|'warmup'|'primary'|'compound'|'specialization'|'accessory'|'core'|'cooldown';

export interface PrescriptionExercise {
  name:string; phase:Phase; sets:number; reps:string; rir?:string; rest?:number;
  focus?:string; progression?:string; substitutions?:string[]; timed?:boolean; unilateral?:boolean;
}
export interface SessionTemplate { key:SessionKey; name:string; objective:string; duration:number; exercises:PrescriptionExercise[] }
export type ConditioningOptionKey='cindy'|'annie'|'chelsea'|'bodyweight_emom'|'mobility';
const e=(name:string,phase:Phase,sets:number,reps:string,extra:Partial<PrescriptionExercise>={}):PrescriptionExercise=>({name,phase,sets,reps,...extra});

// Prep is deliberately brief: enough joint/position work to preserve movement
// quality without turning a calorie-deficit bodybuilding session into another
// 10+ sets of fatigue before the first working set.
const upperPrep=[
 e('Wall Slides','mobility',1,'10'),
 e('Band Pull-Aparts','mobility',1,'15'),
 e('Band External Rotation','mobility',1,'12/side'),
 e('Scapular Push-Ups','activation',1,'10'),
];
const pullPrep=[
 e('Cat-Cow','mobility',1,'8'),
 e('Dead Hang','mobility',1,'30-45 sec',{timed:true}),
 e('Scapular Pull-Up','activation',1,'8'),
 e('Band Straight-Arm Pulldown','activation',1,'15'),
];
const legPrep=[
 e('90/90 Hip Switch','mobility',1,'8/side'),
 e('Hip CAR','mobility',1,'5/side'),
 e('Adductor Rock-Back','mobility',1,'10/side'),
 e('Knee-to-Wall Ankle Mobilization','mobility',1,'10/side'),
 e('Glute Bridge','activation',1,'12'),
];
const cool=(names:string[])=>names.map(n=>e(n,'cooldown',1,n.includes('Breathing')?'5 slow breaths':'45 sec/side',{timed:true}));
const recoveryMobility:SessionTemplate={key:'recovery',name:'Recovery',objective:'Mobility and easy movement',duration:25,exercises:[e('Cat-Cow','mobility',1,'10'),e('Open Book','mobility',1,'10/side'),e('Wall Slide','mobility',2,'10'),e('90/90 Hip Switch','mobility',2,'10/side'),e('Hip CAR','mobility',2,'5/side'),e('Adductor Rock-Back','mobility',2,'10/side'),e('Couch Stretch','mobility',2,'45 sec/side',{timed:true}),e('Active Hamstring Mobilization','mobility',2,'10/side'),e('Knee-to-Wall','mobility',2,'10/side'),e('Deep Squat Hold','mobility',2,'45 sec',{timed:true}),e('Dead Hang','mobility',2,'30 sec',{timed:true}),e('Glute Bridge','activation',2,'15'),e('Bird Dog','core',2,'8/side'),e('Dead Bug','core',2,'8/side'),e('Diaphragmatic Breathing','cooldown',1,'2 min',{timed:true})]};

export const CONDITIONING_OPTIONS:Record<ConditioningOptionKey,SessionTemplate>={
 cindy:{key:'recovery',name:'Cindy',objective:'As many rounds as possible in 20 minutes',duration:20,exercises:[e('Cindy Round','compound',20,'1 round · 5 pull-ups · 10 push-ups · 15 air squats',{rir:'3+',rest:0})]},
 annie:{key:'recovery',name:'Annie',objective:'50-40-30-20-10 for time',duration:15,exercises:[50,40,30,20,10].map(reps=>e(`${reps} Double-Unders + Sit-Ups`,'compound',1,`${reps} each`,{rir:'3+',rest:0}))},
 chelsea:{key:'recovery',name:'Chelsea',objective:'Complete one round every minute for 30 minutes',duration:30,exercises:[e('Chelsea Minute','compound',30,'1 minute · 5 pull-ups · 10 push-ups · 15 air squats',{rir:'3+',rest:0})]},
 bodyweight_emom:{key:'recovery',name:'Bodyweight EMOM',objective:'15-minute low-equipment conditioning',duration:15,exercises:[e('EMOM Round','compound',15,'1 minute · 5 push-ups · 10 air squats · 20 mountain climbers',{rir:'3+',rest:0})]},
 mobility:{key:'recovery',name:'Mobility',objective:'20-minute mobility-only reset',duration:20,exercises:[e('Cat-Cow','accessory',1,'10'),e('Open Book','accessory',1,'8/side'),e('90/90 Hip Switch','accessory',2,'8/side'),e('Hip CAR','accessory',1,'5/side'),e('Adductor Rock-Back','accessory',2,'10/side'),e('Knee-to-Wall','accessory',2,'10/side'),e('Deep Squat Hold','accessory',2,'45 sec',{timed:true}),e('Dead Hang','accessory',2,'30 sec',{timed:true})]},
};

export const CONDITIONING_SPLITS:Record<ConditioningOptionKey,Array<{name:string;prescription:string}>>={
 cindy:[{name:'Pull-Ups',prescription:'5 per round'},{name:'Push-Ups',prescription:'10 per round'},{name:'Air Squats',prescription:'15 per round'}],
 annie:[{name:'Double-Unders',prescription:'50 · 40 · 30 · 20 · 10'},{name:'Sit-Ups',prescription:'50 · 40 · 30 · 20 · 10'}],
 chelsea:[{name:'Pull-Ups',prescription:'5 every minute'},{name:'Push-Ups',prescription:'10 every minute'},{name:'Air Squats',prescription:'15 every minute'}],
 bodyweight_emom:[{name:'Push-Ups',prescription:'5 reps'},{name:'Air Squats',prescription:'10 reps'},{name:'Mountain Climbers',prescription:'20 reps'}],
 mobility:[{name:'Cat-Cow',prescription:'10 reps'},{name:'Open Book',prescription:'8/side'},{name:'90/90 Hip Switch',prescription:'2 × 8/side'},{name:'Hip CAR',prescription:'5/side'},{name:'Adductor Rock-Back',prescription:'2 × 10/side'},{name:'Knee-to-Wall',prescription:'2 × 10/side'},{name:'Deep Squat Hold',prescription:'2 × 45 sec'},{name:'Dead Hang',prescription:'2 × 30 sec'}],
};

export const PPL_SEQUENCE:SessionKey[]=['push_a','pull_a','legs_a','push_b','pull_b','legs_b','recovery'];
export const isSessionKey=(value:unknown):value is SessionKey=>typeof value==='string'&&PPL_SEQUENCE.includes(value as SessionKey);

/**
 * 45-day bodybuilding block: maximum productive stimulus under a calorie-
 * deficit recovery ceiling, not maximum possible set count. The six A/B
 * sessions are intended to roll continuously; a five-day schedule changes
 * cadence, not the exercise templates or the order of the six sessions.
 */
export const PPL_PROGRAM:Record<SessionKey,SessionTemplate>={
 push_a:{key:'push_a',name:'Push A',objective:'Heavy chest, side delts, triceps and abs',duration:75,exercises:[
  ...upperPrep,
  e('Incline Barbell Bench Press','primary',3,'5-8',{rir:'1-2',rest:210,focus:'upper chest',progression:'Reps before weight; add 2.5 kg once all sets reach 8 at target RIR',substitutions:['Smith Machine Incline Press','Incline Dumbbell Press','Incline Machine Press']}),
  e('Barbell Bench Press','primary',3,'6-10',{rir:'1-2',rest:180,focus:'chest',progression:'Reps before weight',substitutions:['Machine Chest Press','Smith Machine Bench Press','Dumbbell Bench Press']}),
  e('Pec Deck','specialization',2,'10-15',{rir:'1-2',focus:'chest',substitutions:['Cable Crossover','Cable Flyes','Low-to-High Cable Fly']}),
  e('Dumbbell Shoulder Press','compound',2,'6-10',{rir:'1-2',rest:150,focus:'shoulders',substitutions:['Smith Machine Overhead Press','Machine Shoulder Press','Overhead Press']}),
  e('Lean-Away Cable Lateral Raise','specialization',3,'12-20',{rir:'1-2',focus:'side delts',substitutions:['Cable Lateral Raise','Lateral Raises']}),
  e('Lateral Raises','specialization',2,'15-25',{rir:'1-2',focus:'side delts',substitutions:['Cable Lateral Raise','Machine Lateral Raise']}),
  e('Overhead Cable Tricep Extension','accessory',2,'10-15',{rir:'1-2',focus:'triceps',substitutions:['Dumbbell Overhead Extension','Skull Crushers','Tricep Pushdown']}),
  e('Single-Arm Tricep Pushdown','accessory',2,'10-15/side',{rir:'1-2',focus:'triceps',unilateral:true,substitutions:['Tricep Pushdown','Cable Kickback']}),
  e('Hanging Leg Raise','core',3,'10-20',{rir:'1-2',progression:'Add reps with controlled lowering'}),
  ...cool(['Doorway Pec Stretch','Deep Breathing'])
 ]},
 pull_a:{key:'pull_a',name:'Pull A',objective:'Back thickness, rear delts, biceps, forearms and abs',duration:70,exercises:[
  ...pullPrep,
  e('Barbell Row','primary',3,'6-10',{rir:'1-2',rest:180,focus:'back thickness',progression:'Reps before weight',substitutions:['T-Bar Row','Lever Seated Row Machine','Chest Supported Row']}),
  e('Pull-ups','primary',3,'6-12',{rir:'1-2',rest:180,focus:'lat width',progression:'Add reps, then external load',substitutions:['Assisted Pull-ups','Lat Pulldown','Neutral Grip Pulldown']}),
  e('T-Bar Row','compound',2,'8-12',{rir:'1-2',focus:'mid-back',substitutions:['Lever Seated Row Machine','Chest Supported Row','Seated Cable Row']}),
  e('Reverse Pec Deck','specialization',3,'12-20',{rir:'1-2',focus:'rear delts',substitutions:['Cable Rear-Delt Fly','Reverse Fly','Face Pulls']}),
  e('Incline Dumbbell Curl','accessory',2,'8-12',{rir:'1-2',focus:'biceps',substitutions:['Dumbbell Curl','Barbell Curl','Cable Curl']}),
  e('Hammer Curl','accessory',2,'10-15',{rir:'1-2',focus:'brachioradialis/forearms',substitutions:['Cross-Body Hammer Curl','Cable Reverse Curls']}),
  e('Cable Wrist Extension','accessory',2,'15-25',{rir:'1-2',focus:'forearm extensors',substitutions:['Reverse Wrist Curls','Wrist Extension']}),
  e('Cable Crunch','core',3,'10-15',{rir:'1-2',progression:'Add load or reps with controlled spinal flexion'}),
  ...cool(['Lat Stretch','Biceps Stretch'])
 ]},
 legs_a:{key:'legs_a',name:'Legs A',objective:'Quad bias, glutes and calves',duration:80,exercises:[
  ...legPrep,
  e('Bodyweight Squats','activation',1,'10'),
  e('Hack Squat','primary',3,'6-10',{rir:'1-2',rest:210,focus:'quads',progression:'Reps before weight',substitutions:['Barbell Squat','Smith Machine Squat','Leg Press']}),
  e('Leg Press','primary',2,'8-12',{rir:'1-2',rest:180,focus:'quads',progression:'Reps before weight',substitutions:['Single Leg Press','Smith Machine Squat']}),
  e('Bulgarian Split Squat','compound',2,'8-12/leg',{rir:'1-2',unilateral:true,focus:'quads/glutes/stability',substitutions:['Split Squat','Reverse Lunge','Single Leg Press']}),
  e('Leg Extension','accessory',2,'12-18',{rir:'1-2',focus:'quads',substitutions:['Cyclist Squat','Heel Elevated Goblet Squat']}),
  e('Seated Leg Curl','accessory',2,'10-15',{rir:'1-2',focus:'hamstrings',substitutions:['Lying Leg Curl','Nordic Curl']}),
  e('Standing Calf Raise','accessory',4,'8-15',{rir:'1-2',focus:'calves',progression:'Hold the stretched position for 2 seconds',substitutions:['Seated Calf Raise','Leg Press Calf Raise']}),
  e('Hip Abduction','accessory',2,'15-25',{rir:'1-2',focus:'glute medius',substitutions:['Cable Hip Abduction','Band Abduction']}),
  ...cool(['Couch Stretch','90/90 Hold','Calf Stretch'])
 ]},
 push_b:{key:'push_b',name:'Push B',objective:'Chest specialization, 3D shoulders, triceps and abs',duration:75,exercises:[
  ...upperPrep,
  e('Incline Dumbbell Press','primary',3,'8-12',{rir:'1-2',rest:180,focus:'upper chest',progression:'Reps before weight',substitutions:['Smith Machine Incline Press','Incline Barbell Bench Press','Incline Machine Press']}),
  e('Machine Chest Press','primary',2,'8-15',{rir:'1-2',rest:150,focus:'chest',substitutions:['Smith Machine Bench Press','Dumbbell Bench Press','Barbell Bench Press']}),
  e('Chest-Biased Dips','compound',2,'8-15',{rir:'1-2',rest:150,focus:'lower chest',progression:'Add reps, then weight',substitutions:['Assisted Dips','Machine Chest Press','Decline Press']}),
  e('High-to-Low Cable Fly','specialization',2,'12-20',{rir:'1-2',focus:'chest',substitutions:['Cable Crossover','Pec Deck','Cable Flyes']}),
  e('Smith Machine Overhead Press','compound',2,'6-10',{rir:'1-2',rest:150,focus:'shoulders',progression:'Reps before weight',substitutions:['Dumbbell Shoulder Press','Machine Shoulder Press','Overhead Press']}),
  e('Cable Lateral Raise','specialization',3,'10-20',{rir:'1-2',focus:'side delts',substitutions:['Lateral Raises','Lean-Away Cable Lateral Raise']}),
  e('Lateral Raises','specialization',2,'15-25',{rir:'1-2',focus:'side delts',substitutions:['Cable Lateral Raise','Machine Lateral Raise']}),
  e('Cable Rear-Delt Fly','specialization',2,'15-25',{rir:'1-2',focus:'rear delts',substitutions:['Reverse Pec Deck','Reverse Fly']}),
  e('Skull Crushers','accessory',2,'8-12',{rir:'1-2',focus:'triceps',substitutions:['Overhead Cable Tricep Extension','Tricep Pushdown']}),
  e('Single-Arm Tricep Pushdown','accessory',2,'12-20/side',{rir:'1-2',focus:'triceps',unilateral:true,substitutions:['Tricep Pushdown','Cable Kickback']}),
  e('Cable Woodchopper','core',2,'12-20/side',{rir:'1-2',unilateral:true,progression:'Controlled rotation, no momentum'}),
  ...cool(['Pec Stretch','Cross-Body Shoulder Stretch'])
 ]},
 pull_b:{key:'pull_b',name:'Pull B',objective:'Lat width, V-taper, arms and forearms',duration:75,exercises:[
  ...pullPrep,
  e('Neutral Grip Pulldown','primary',3,'8-12',{rir:'1-2',rest:180,focus:'lat width',progression:'Reps before weight',substitutions:['Lat Pulldown','Close Grip Lat Pulldown','Wide Grip Lat Pulldown']}),
  e('Seated Cable Row','primary',3,'8-12',{rir:'1-2',rest:180,focus:'back thickness',progression:'Reps before weight',substitutions:['Lever Seated Row Machine','T-Bar Row','Chest Supported Row']}),
  e('Straight Arm Pulldown','specialization',2,'12-15',{rir:'1-2',focus:'lats',substitutions:['Cable Pullover','Dumbbell Pullover']}),
  e('Reverse Pec Deck','specialization',2,'12-20',{rir:'1-2',focus:'rear delts',substitutions:['Cable Rear-Delt Fly','Reverse Fly']}),
  e('EZ Bar Preacher Curls','accessory',2,'8-12',{rir:'1-2',focus:'biceps',substitutions:['Cable Preacher Curl','Machine Preacher Curl','Barbell Curl']}),
  e('Cable Reverse Curls','accessory',3,'12-18',{rir:'1-2',focus:'brachioradialis/forearms',substitutions:['EZ Bar Reverse Curls','Dumbbell Reverse Curls','Hammer Curl']}),
  e('Cable Wrist Curl','accessory',2,'15-25',{rir:'1-2',focus:'forearm flexors',substitutions:['Wrist Curls','Dumbbell Wrist Curls']}),
  e('Dumbbell Shrug','accessory',2,'10-15',{rir:'1-2',focus:'traps',substitutions:['Barbell Shrug','Cable Shrug']}),
  ...cool(['Dead Hang','Lat Stretch'])
 ]},
 legs_b:{key:'legs_b',name:'Legs B',objective:'Hamstrings, glutes, calves and abs',duration:80,exercises:[
  ...legPrep,
  e('Reverse Bodyweight Lunge','activation',1,'8/side'),
  e('Romanian Deadlift','primary',3,'6-10',{rir:'1-2',rest:210,focus:'hamstrings/glutes',progression:'Reps before weight',substitutions:['Smith Romanian Deadlift','Dumbbell Romanian Deadlift']}),
  e('Seated Leg Curl','primary',3,'10-15',{rir:'1-2',rest:150,focus:'hamstrings',substitutions:['Lying Leg Curl','Nordic Curl']}),
  e('Hip Thrust','compound',3,'8-12',{rir:'1-2',rest:150,focus:'glutes',progression:'Pause at peak contraction',substitutions:['Smith Machine Hip Thrust','Glute Bridge','Cable Pull Through']}),
  e('High/Wide Leg Press','compound',2,'10-15',{rir:'1-2',rest:150,focus:'glutes/hamstrings',substitutions:['Leg Press','Single Leg Press']}),
  e('Leg Extension','accessory',2,'12-18',{rir:'1-2',focus:'quads',substitutions:['Cyclist Squat','Heel Elevated Goblet Squat']}),
  e('Seated Calf Raise','accessory',4,'10-20',{rir:'1-2',focus:'calves',substitutions:['Standing Calf Raise','Leg Press Calf Raise']}),
  e('Hip Abduction','accessory',2,'15-25',{rir:'1-2',focus:'glute medius',substitutions:['Cable Hip Abduction','Band Abduction']}),
  e('Hanging Knee Raise','core',3,'10-20',{rir:'1-2',progression:'Posterior pelvic tilt and controlled lowering'}),
  ...cool(['Couch Stretch','90/90 Hold','Frog/Adductor Stretch','Calf Stretch'])
 ]},
 recovery:{...CONDITIONING_OPTIONS.cindy,name:'Optional conditioning'}
};

export interface ReadinessInput {sleep:number; soreness:Record<string,number>; joints:Record<string,number>; fatigue:number; motivation:number; illness?:boolean; sharpPain?:boolean; performanceDecline?:boolean; recentLowerBodyKm?:number}
export function targetMuscles(key:SessionKey){if(key.startsWith('push'))return ['chest','shoulders','triceps'];if(key.startsWith('pull'))return ['back','biceps'];if(key.startsWith('legs'))return ['quads','hamstrings','glutes','calves'];return []}
export function calculateReadiness(input:ReadinessInput,key:SessionKey){
 const targetSoreness=Math.max(0,...targetMuscles(key).map(m=>input.soreness[m]||0)); const joint=Math.max(0,...Object.values(input.joints));
 const red=input.sharpPain||input.illness||input.sleep<5.5||input.fatigue>=8||targetSoreness>=7||joint>=5;
 const yellow=!red&&(input.sleep<7||input.fatigue>=6||targetSoreness>=5||joint>=3||input.performanceDecline||(key.startsWith('legs')&&(input.recentLowerBodyKm||0)>12));
 const band:ReadinessBand=red?'red':yellow?'yellow':'green';
 return {band,targetSoreness,maxJointPain:joint,volumeMultiplier:band==='green'?1:band==='yellow'?.75:.55,targetRir:band==='green'?'1-2':band==='yellow'?'2-3':'3+',allowIntensity:band==='green',message:band==='green'?'Full session':band==='yellow'?'Keep primary work; reduce accessories 20-30%':'Choose recovery or a reduced session'};
}
export function adaptSession(template:SessionTemplate,band:ReadinessBand,redChoice:'recovery'|'reduced'='reduced'){
 if(band==='red'&&redChoice==='recovery')return recoveryMobility;
 const multiplier=band==='green'?1:band==='yellow'?.75:.55;
 const exercises=template.exercises.filter(x=>!(band!=='green'&&x.name.includes('Drop Set'))).filter(x=>band!=='red'||['mobility','activation','warmup','primary','compound','cooldown'].includes(x.phase)).map((x,i)=>({...x,sets:['mobility','activation','cooldown'].includes(x.phase)?x.sets:Math.max(1,Math.ceil(x.sets*multiplier)),rir:band==='green'?x.rir:band==='yellow'?'2-3':'3+'})).filter((x,i)=>band!=='red'||x.phase!=='compound'||i<template.exercises.findIndex(y=>y.phase==='primary')+4);
 return {...template,name:band==='red'?`${template.name} · Reduced`:template.name,duration:Math.round(template.duration*multiplier),exercises};
}
export function nextSession(current:SessionKey){return PPL_SEQUENCE[(PPL_SEQUENCE.indexOf(current)+1)%PPL_SEQUENCE.length]}
export function resolveNextSession({
 persistedNextSession,
 persistedUpdatedAt,
 latestCompletedSession,
 latestCompletedAt,
 localFallback,
}: {
 persistedNextSession?: unknown;
 persistedUpdatedAt?: string | null;
 latestCompletedSession?: SessionKey | null;
 latestCompletedAt?: string | null;
 localFallback?: SessionKey | null;
}): SessionKey {
 const latestTime=latestCompletedAt?new Date(latestCompletedAt).getTime():NaN;
 const persistedTime=persistedUpdatedAt?new Date(persistedUpdatedAt).getTime():NaN;
 const historyIsCurrent=!!latestCompletedSession&&(!Number.isFinite(persistedTime)||(Number.isFinite(latestTime)&&latestTime>=persistedTime));
 if(historyIsCurrent)return nextSession(latestCompletedSession);
 if(isSessionKey(persistedNextSession))return persistedNextSession;
 if(localFallback)return localFallback;
 if(latestCompletedSession)return nextSession(latestCompletedSession);
 return 'push_a';
}
export function sessionKeyFromWorkout(sessionKey?:string|null,dayName?:string|null):SessionKey|null{
 if(isSessionKey(sessionKey))return sessionKey;
 const normalized=(dayName||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
 return PPL_SEQUENCE.find(key=>normalized===key||normalized.startsWith(`${key}_`))||null;
}
export function warmupSets(workingKg:number,lowerBody=false){if(!workingKg||workingKg<20)return[];const steps=lowerBody?[.2,.4,.6,.75,.88]:[20/workingKg,.55,.72,.86];return [...new Set(steps.map(p=>Math.max(20,Math.round(workingKg*p/2.5)*2.5)).filter(x=>x<workingKg))].map((load,i,a)=>({load,reps:i===0?12:i===a.length-1?3:i===a.length-2?5:8}));}
export function nextSet(load:number,reps:number,rir:number,min:number,max:number,increment=2.5){if(reps>=max&&rir>=3)return{load:load+increment,target:`${min}-${max}`,reason:'Top of range with reserve-small load increase'};if(reps<min||rir<=0)return{load:Math.max(0,load-increment),target:`${min}-${max}`,reason:'Below target or at failure-reduce load'};return{load,target:`${min}-${max}`,reason:'Stay at load and earn reps'};}
export const SORENESS_AREAS=['chest','shoulders','triceps','back','biceps','quads','hamstrings','glutes','calves'];
export const JOINT_AREAS=['shoulder','elbow','wrist','lower back','hip','knee','ankle'];
