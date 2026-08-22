/* eslint-disable @typescript-eslint/no-explicit-any */
import { average, assertDateRange, categorizeDbError, classifyMuscle, localDayBounds, movingAverage7, round, setMetrics, withRetry } from "./core.ts";

type Client = any;
type Args = Record<string, any>;

const FALLBACK_PREFS = { timezone: "Asia/Kolkata", units_system: "metric" } as Args;

/** Runs a PostgREST read with retries and surfaces a stable, non-sensitive error category. */
export async function read<T>(label: string, build: () => any): Promise<T> {
  return await withRetry(label, async () => {
    const { data, error } = await build();
    if (error) {
      const err = new Error(categorizeDbError(error));
      (err as any).code = (error as any).code;
      (err as any).status = (error as any).status;
      throw err;
    }
    return data as T;
  });
}

async function prefs(db: Client) {
  try {
    // limit(1) instead of maybeSingle(): duplicate preference rows must never break a read-only tool.
    const rows = await read<any[]>("user_preferences", () => db.from("user_preferences").select("*").limit(1));
    return rows?.[0] ? { ...FALLBACK_PREFS, ...rows[0] } : { ...FALLBACK_PREFS };
  } catch (error) {
    console.error("[mcp] preferences unavailable, using defaults:", (error as Error).message);
    return { ...FALLBACK_PREFS }; // failsafe: profile defaults never block data retrieval
  }
}
const envelope = (start: string, end: string, timezone: string, data: unknown, summary: unknown, metadata: unknown = {}) =>
  ({ start_date: start, end_date: end, timezone, data, summary, metadata });

async function workoutRows(db: Client, start: string, end: string, limit = 50, filters: Args = {}) {
  let q = db.from("workouts").select("id,date,day,day_name,completed_at,started_at,workout_duration_minutes,is_skipped,session_key,readiness_band,completion_percent,exercises(id,name,category,actual_reps,actual_weight,target_reps,target_weight,completed,sort_order,actual_rir,rom_quality,pain_score,set_kind,prescription)")
    .gte("date", start).lte("date", end).order("date", { ascending: false }).limit(limit + 1);
  if (filters.workout_type) q = q.ilike("day_name", `%${String(filters.workout_type).replace(/[,()\"]/g, " ")}%`);
  const data = await read<any[]>("workouts", () => q);
  let rows = data || [];
  if (filters.exercise) rows = rows.filter((w: any) => w.exercises?.some((e: any) => e.name.toLowerCase().includes(filters.exercise.toLowerCase())));
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function executeTool(name: string, args: Args, db: Client) {
  const p = await prefs(db), timezone = p.timezone || "Asia/Kolkata";
  if (name === "get_fitness_profile") {
    const latestRows = await read<any[]>("latest_bodyweight", () => db.from("daily_metrics").select("date,bodyweight").not("bodyweight", "is", null).order("date", { ascending: false }).limit(1)).catch(() => [] as any[]);
    const latest = latestRows?.[0] ?? null;
    const profile = { height_cm: p.height_cm, current_bodyweight: latest?.bodyweight ?? null, bodyweight_date: latest?.date ?? null, age: p.age, sex: p.gender, fitness_goal: p.fitness_goal, goal_weight: p.weight_goal, activity_level: p.activity_level, training_frequency_per_week: p.weekly_workout_goal, calorie_target: p.daily_calorie_goal, protein_target_g: p.daily_protein_goal, carbohydrate_target_g: p.daily_carbs_goal, fat_target_g: p.daily_fat_goal, fiber_target_g: p.daily_fiber_goal, water_target_l: p.daily_water_goal, caffeine_limit_mg: p.daily_caffeine_limit ?? 400, current_split: p.training_split, training_focus: p.training_focus, units_system: p.units_system, timezone };
    return envelope(latest?.date ?? null, latest?.date ?? null, timezone, profile, {}, { source: "user_preferences,daily_metrics" });
  }

  const start = args.start_date, end = args.end_date;
  assertDateRange(start, end, name === "get_workouts" || name === "get_exercise_history" ? 366 : 730);

  if (name === "get_bodyweight_history") {
    const limit = Math.min(args.limit ?? 365, 365);
    const data = await read<any[]>("bodyweight", () => db.from("daily_metrics").select("date,bodyweight").gte("date", start).lte("date", end).not("bodyweight", "is", null).order("date").limit(limit + 1));
    const rows = (data || []).slice(0, limit).map((r: any) => ({ date: r.date, bodyweight: r.bodyweight, unit: p.units_system === "imperial" ? "lb" : "kg" }));
    const weights = rows.map((r: any) => r.bodyweight), first = weights[0] ?? null, latest = weights.at(-1) ?? null;
    return envelope(start, end, timezone, movingAverage7(rows), { first_weight: first, latest_weight: latest, absolute_change: first != null && latest != null ? round(latest-first) : null, percentage_change: first ? round((latest-first)/first*100) : null, average_weight: average(weights) }, { has_more: (data || []).length > limit, limit });
  }

  if (name === "get_workouts") {
    const limit = Math.min(args.limit ?? 50, 50), result = await workoutRows(db, start, end, limit, args);
    const data = result.rows.map((w: any) => ({ workout_id: w.id, date: w.date, completed_at: w.completed_at, workout_name: w.day_name, session_key:w.session_key, readiness:w.readiness_band, completion_percent:w.completion_percent, duration_minutes: w.workout_duration_minutes, skipped: w.is_skipped, exercises: (w.exercises || []).filter((e:any) => e.completed !== false).map((e:any) => ({ exercise: e.name, category: e.category, set_kind:e.set_kind, reps: e.actual_reps, load: e.actual_weight, rir:e.actual_rir, rom_quality:e.rom_quality, pain_score:e.pain_score, completed: e.completed })) }));
    return envelope(start, end, timezone, data, { workouts_returned: data.length }, { has_more: result.hasMore, limit });
  }

  if (name === "get_exercise_history") {
    const limit = Math.min(args.limit ?? 100, 100), result = await workoutRows(db, start, end, 366);
    const needle = String(args.exercise).toLowerCase();
    const entries = result.rows.flatMap((w:any) => (w.exercises || []).filter((e:any) => e.name.toLowerCase().includes(needle)).map((e:any) => { const m=setMetrics(e.actual_reps,e.actual_weight); return { workout_date:w.date, exercise:e.name, reps:e.actual_reps, load:e.actual_weight, sets:m.setCount, total_reps:m.totalReps, volume:m.volume, estimated_1rm:m.bestEstimated1rm || null, estimate_formula:"Epley; parsed from logged set strings" }; })).slice(0, limit);
    return envelope(start, end, timezone, entries, { entries: entries.length, total_volume: round(entries.reduce((s:any,e:any)=>s+e.volume,0)) }, { has_more: entries.length === limit, limit });
  }

  if (name === "get_nutrition") {
    const limit = Math.min(args.limit ?? 365, 365);
    const [meals, waters, caffeines] = await Promise.all([
      read<any[]>("meals", () => db.from("meals").select("date,meal_type,food_name,calories,protein,carbs,fat,fiber,sugar,sodium").gte("date",start).lte("date",end).order("date").limit(2000)),
      read<any[]>("water_logs", () => db.from("water_logs").select("amount,timestamp").gte("timestamp",localDayBounds(start,timezone).start).lt("timestamp",localDayBounds(end,timezone).end).limit(2000)).catch(() => [] as any[]),
      read<any[]>("caffeine_logs", () => db.from("caffeine_logs").select("id,amount_mg,source,label,timestamp").gte("timestamp",localDayBounds(start,timezone).start).lt("timestamp",localDayBounds(end,timezone).end).order("timestamp").limit(2000)).catch(() => [] as any[]),
    ]);
    const day = (date:string) => ({date,calories:0,protein:0,carbs:0,fat:0,fiber:0,water_l:0,caffeine_mg:0,caffeine_entries:[] as any[],meals:[] as any[]});
    const days:Record<string,any>={};
    for(const m of meals||[]){ const d=days[m.date] ||= day(m.date); for(const k of ["calories","protein","carbs","fat","fiber"])d[k]+=m[k]||0; d.meals.push({meal_type:m.meal_type,food_name:m.food_name,calories:m.calories}); }
    for(const w of waters||[]){ const date=new Intl.DateTimeFormat("en-CA",{timeZone:timezone}).format(new Date(w.timestamp)); const d=days[date] ||= day(date); d.water_l+=w.amount||0; }
    for(const c of caffeines||[]){ const date=new Intl.DateTimeFormat("en-CA",{timeZone:timezone}).format(new Date(c.timestamp)); const d=days[date] ||= day(date); d.caffeine_mg+=Number(c.amount_mg)||0; d.caffeine_entries.push({id:c.id,amount_mg:Number(c.amount_mg)||0,source:c.source,label:c.label,timestamp:c.timestamp}); }
    const data=Object.values(days).sort((a:any,b:any)=>a.date.localeCompare(b.date)).slice(0,limit) as any[];
    const nutritionDays=data.filter(d=>d.meals.length>0);
    const caffeineDays=data.filter(d=>d.caffeine_entries.length>0);
    return envelope(start,end,timezone,data,{average_calories_per_logged_day:average(nutritionDays.map(d=>d.calories)),average_protein_g_per_logged_day:average(nutritionDays.map(d=>d.protein)),average_carbs_g_per_logged_day:average(nutritionDays.map(d=>d.carbs)),average_fat_g_per_logged_day:average(nutritionDays.map(d=>d.fat)),average_caffeine_mg_per_tracked_day:average(caffeineDays.map(d=>d.caffeine_mg)),caffeine_logged_days:caffeineDays.length,logged_days:nutritionDays.length,tracked_days:data.length,targets:{calories:p.daily_calorie_goal,protein_g:p.daily_protein_goal,carbs_g:p.daily_carbs_goal,fat_g:p.daily_fat_goal,water_l:p.daily_water_goal,caffeine_limit_mg:p.daily_caffeine_limit??400}},{has_more:Object.keys(days).length>limit,limit});
  }

  if (name === "get_sleep") {
    const data=await read<any[]>("sleep", () => db.from("daily_metrics").select("date,sleep_hours").gte("date",start).lte("date",end).not("sleep_hours","is",null).order("date")); const vals=(data||[]).map((r:any)=>r.sleep_hours);
    return envelope(start,end,timezone,data||[],{average_sleep_hours:average(vals),minimum_sleep_hours:vals.length?Math.min(...vals):null,maximum_sleep_hours:vals.length?Math.max(...vals):null,logged_nights:vals.length},{unavailable_fields:["bedtime","wake_time","sleep_score","sleep_stages","interruptions"]});
  }

  if (name === "get_activity") {
    const data=await read<any[]>("activity", () => db.from("calorie_burns").select("date,source,activity_type,calories,duration_minutes,distance_km").gte("date",start).lte("date",end).order("date"));
    return envelope(start,end,timezone,data||[],{active_calories:round((data||[]).reduce((s:number,r:any)=>s+(r.calories||0),0)),activity_minutes:round((data||[]).reduce((s:number,r:any)=>s+(r.duration_minutes||0),0)),distance_km:round((data||[]).reduce((s:number,r:any)=>s+(r.distance_km||0),0))},{unavailable_fields:["steps","heart_rate","BMR","total_expenditure"]});
  }

  if (["get_training_summary","get_progress_summary","get_recent_fitness_data"].includes(name)) {
    const wr=await workoutRows(db,start,end,366); const workouts=wr.rows.filter((w:any)=>!w.is_skipped); const ex=workouts.flatMap((w:any)=>(w.exercises||[]).filter((e:any)=>e.completed!==false).map((e:any)=>({...e,date:w.date,metrics:setMetrics(e.actual_reps,e.actual_weight)}))); const muscle:Record<string,number>={}; ex.forEach((e:any)=>muscle[classifyMuscle(e.name)]=(muscle[classifyMuscle(e.name)]||0)+e.metrics.setCount);
    const training={training_days:new Set(workouts.map((w:any)=>w.date)).size,workouts_completed:workouts.length,total_sets:ex.reduce((s:number,e:any)=>s+e.metrics.setCount,0),total_reps:ex.reduce((s:number,e:any)=>s+e.metrics.totalReps,0),total_volume:round(ex.reduce((s:number,e:any)=>s+e.metrics.volume,0)),average_workout_duration_minutes:average(workouts.map((w:any)=>w.workout_duration_minutes)),total_workout_duration_minutes:round(workouts.reduce((s:number,w:any)=>s+(w.workout_duration_minutes||0),0)),exercises_performed:[...new Set(ex.map((e:any)=>e.name))],sets_per_muscle_group:muscle,training_frequency_per_week:round(workouts.length/Math.max(1,(Date.parse(end)-Date.parse(start))/604800000))};
    if(name==="get_training_summary")return envelope(start,end,timezone,[],training,{muscle_mapping:"maintained deterministic exercise-name mapping; unmapped is reported explicitly"});
    const safe=async(tool:string,a:Args)=>{ try { return await executeTool(tool,a,db); } catch(e){ console.error(`[mcp] ${tool} degraded inside ${name}:`,(e as Error).message); return {data:[],summary:{},metadata:{unavailable:true,reason:(e as Error).message}} as any; } };
    const [weights,nutrition,sleep,activity]=await Promise.all([safe("get_bodyweight_history",{start_date:start,end_date:end,limit:365}),safe("get_nutrition",{start_date:start,end_date:end,limit:365}),safe("get_sleep",{start_date:start,end_date:end}),safe("get_activity",{start_date:start,end_date:end})]);
    const summary={starting_weight:weights.summary?.first_weight,ending_weight:weights.summary?.latest_weight,weight_change:weights.summary?.absolute_change,average_calorie_intake:nutrition.summary?.average_calories_per_logged_day,average_protein_g:nutrition.summary?.average_protein_g_per_logged_day,average_caffeine_mg_per_tracked_day:nutrition.summary?.average_caffeine_mg_per_tracked_day,caffeine_logged_days:nutrition.summary?.caffeine_logged_days,average_sleep_hours:sleep.summary?.average_sleep_hours,workouts:training.workouts_completed,workouts_per_week:training.training_frequency_per_week,total_sets:training.total_sets,average_workout_duration_minutes:training.average_workout_duration_minutes,active_calories:activity.summary?.active_calories,sets_per_muscle_group:muscle};
    return envelope(start,end,timezone,name==="get_recent_fitness_data"?{bodyweight:weights.data,nutrition:nutrition.data,sleep:sleep.data,activity:activity.data,workouts:workouts.map((w:any)=>({date:w.date,name:w.day_name,duration_minutes:w.workout_duration_minutes}))}:[],summary,{compact:true});
  }
  throw new Error("UNKNOWN_TOOL");
}
