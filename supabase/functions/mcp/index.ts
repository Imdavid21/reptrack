/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2.90.0";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.30.0/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.30.0/server/webStandardStreamableHttp.js";
import { z } from "npm:zod@3.25.76";
import { APPROVED_TOOLS, MCP_MODE, MCP_VERSION, WRITE_TOOLS, capPayload, isApprovedTool, isWriteTool, withRetry } from "./core.ts";
import { executeTool } from "./data.ts";
import { executeWriteTool } from "./writes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/mcp`;
const RESOURCE_METADATA = `${ENDPOINT}/.well-known/oauth-protected-resource`;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,accept,mcp-protocol-version,mcp-session-id",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id,www-authenticate",
  "Vary": "Origin",
};

const dateRange = {
  start_date: z.string().describe("Inclusive local calendar date in YYYY-MM-DD format."),
  end_date: z.string().describe("Inclusive local calendar date in YYYY-MM-DD format."),
};
// No upper bound: callers may request any window. Oversized responses are handled by capPayload.
const limit = (_max: number, fallback: number) => z.number().int().min(1).optional().default(fallback);
const outputSchema = z.object({
  start_date: z.string().nullable(), end_date: z.string().nullable(), timezone: z.string(),
  data: z.unknown(), summary: z.unknown(), metadata: z.unknown(),
});

const definitions = {
  get_fitness_profile: { description: "Retrieve the authenticated user's current stored fitness profile, goals, targets, program, timezone, and latest logged bodyweight. Use for baseline context; unstored fields remain null.", schema: {} },
  get_bodyweight_history: { description: "Retrieve bodyweight measurements and calculated change and 7-day moving averages for the authenticated user. Use when evaluating a weight trend over a date range.", schema: { ...dateRange, limit: limit(365,365) } },
  get_workouts: { description: "Retrieve detailed completed workout and exercise logs for the authenticated user. Use for reviewing sessions, loads, repetitions, or workout duration.", schema: { ...dateRange, workout_type:z.string().max(80).optional(), exercise:z.string().max(120).optional(), limit:limit(50,50) } },
  get_exercise_history: { description: "Retrieve history for a named exercise, including logged reps/load, calculable volume, and clearly labelled estimated 1RM. Use for evaluating strength progression.", schema: { exercise:z.string().min(1).max(120), ...dateRange, limit:limit(100,100) } },
  get_training_summary: { description: "Retrieve aggregated resistance-training metrics over a date range. Use for consistency, volume, muscle-group sets, duration, or training frequency.", schema: dateRange },
  get_nutrition: { description: "Retrieve logged meals, daily calories, macros, fibre, water, targets, and averages. Use for factual nutrition-log analysis, not medical interpretation.", schema: { ...dateRange, limit:limit(365,365) } },
  get_sleep: { description: "Retrieve stored sleep duration and summary statistics. Use for sleep consistency or recovery context; unavailable sleep fields are explicitly identified.", schema: dateRange },
  get_activity: { description: "Retrieve stored activity, cardio duration, active calories, and distance. Use for activity analysis; BMR and unavailable metrics are never inferred.", schema: dateRange },
  get_progress_summary: { description: "Retrieve a compact cross-domain progress summary covering bodyweight, nutrition, sleep, activity, and training. Use for efficient high-level comparisons without coaching advice.", schema: dateRange },
  get_recent_fitness_data: { description: "Retrieve a compact combined recent fitness dataset for prompts reviewing weight, training, nutrition, sleep, and activity together. Accepts any number of days back from today.", schema: { days:z.number().int().min(1).optional().default(14) } },
} as const;

const logDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Local calendar date YYYY-MM-DD. Defaults to today; any past date is allowed, never the future.");
const macros = {
  protein: z.number().min(0).max(500).optional(), carbs: z.number().min(0).max(1500).optional(),
  fat: z.number().min(0).max(500).optional(), fiber: z.number().min(0).max(200).optional(),
  sugar: z.number().min(0).max(800).optional(), sodium: z.number().min(0).max(20000).optional().describe("Milligrams."),
  potassium: z.number().min(0).max(20000).optional().describe("Milligrams."),
};
const exerciseList = z.array(z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["primary","compound","accessory","specialization","core"]).optional(),
  sets: z.array(z.object({ reps: z.number().min(0).max(1000).optional(), weight: z.number().min(0).max(600).optional().describe("Plate weight in kg, excluding the bar.") })).min(1),
})).min(1).max(30);

const writeDefinitions = {
  log_meal: { description: "Log a meal for the authenticated user with estimated calories and macros. Calories are required; macros are optional. Use when the user reports what they ate.", schema: { date: logDate, meal_type: z.enum(["breakfast","lunch","dinner","snack"]).optional(), food_name: z.string().min(1).max(200), calories: z.number().min(0).max(10000), ...macros, notes: z.string().max(500).optional(), client_key: z.string().max(64).optional().describe("Idempotency key; a retry with the same key updates the same meal.") } },
  update_meal: { description: "Correct a previously logged meal by its id. Only the supplied fields change. Never deletes.", schema: { meal_id: z.string().min(1).max(40), date: logDate, meal_type: z.enum(["breakfast","lunch","dinner","snack"]).optional(), food_name: z.string().min(1).max(200).optional(), calories: z.number().min(0).max(10000).optional(), ...macros, notes: z.string().max(500).optional() } },
  log_water: { description: "Log water intake for a day. Provide either litres or milliliters.", schema: { date: logDate, litres: z.number().min(0.05).max(10).optional(), milliliters: z.number().min(50).max(10000).optional() } },
  log_workout: { description: "Log a completed resistance training session with its exercises and sets. Calorie burn is calculated with the app's energy model so Insights and History stay consistent.", schema: { date: logDate, workout_name: z.string().min(1).max(80), duration_minutes: z.number().min(1).max(480).optional().default(45), start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Local start time HH:MM."), week_number: z.number().int().min(1).max(520).optional(), exercises: exerciseList, client_key: z.string().min(1).max(64).optional().describe("Idempotency key; a retry with the same key updates the same session.") } },
  update_workout: { description: "Adjust a logged session's date, name, duration, or replace its exercise list. Recalculates calorie burn. Never deletes the session.", schema: { workout_id: z.string().min(1).max(40), date: logDate, workout_name: z.string().min(1).max(80).optional(), duration_minutes: z.number().min(1).max(480).optional(), exercises: exerciseList.optional() } },
  log_activity: { description: "Log a walk, run, or cycle with distance and/or duration. Calorie burn is estimated from pace and bodyweight when not supplied.", schema: { date: logDate, activity_type: z.enum(["walking","running","cycling","walk","run","cycle","ride","bike"]).describe("walking, running, or cycling (walk/run/cycle also accepted)."), distance_km: z.number().min(0.1).max(500).optional(), duration_minutes: z.number().min(1).max(1440).optional(), calories: z.number().min(0).max(5000).optional() } },
  update_activity: { description: "Correct a logged activity's distance, duration, or calories for a given day and activity type.", schema: { activity_id: z.string().min(1).max(40).optional(), date: logDate, activity_type: z.enum(["walking","running","cycling","walk","run","cycle","ride","bike"]).describe("walking, running, or cycling (walk/run/cycle also accepted)."), distance_km: z.number().min(0.1).max(500).optional(), duration_minutes: z.number().min(1).max(1440).optional(), calories: z.number().min(0).max(5000).optional() } },
} as const;

function json(body: unknown, status = 200, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type":"application/json", "Cache-Control":"no-store", ...headers } });
}

function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function minusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - days + 1); return d.toISOString().slice(0,10);
}

async function authenticate(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, "");
  const auth = createClient(SUPABASE_URL, ANON_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
  // Transient auth-service blips must not look like an expired token to the MCP client.
  let data: any = null, error: any = null;
  try {
    ({ data, error } = await withRetry("auth.getUser", async () => {
      const result = await auth.auth.getUser(token);
      if (result.error && (result.error as any).status >= 500) throw result.error;
      return result;
    }, 2));
  } catch (e) { console.error("[mcp] auth check failed:", (e as Error).message); return null; }
  if (error || !data?.user) { console.warn("[mcp] rejected token:", error?.message ?? "no user"); return null; }
  return { user:data.user, token, db:createClient(SUPABASE_URL, ANON_KEY, { global:{headers:{Authorization:`Bearer ${token}`}}, auth:{persistSession:false,autoRefreshToken:false} }) };
}

async function audit(userId:string, tool:string, started:number, success:boolean, category:string|null) {
  try { await createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}}).from("mcp_audit_logs").insert({user_id:userId,tool_name:tool,duration_ms:Math.max(0,Date.now()-started),success,error_category:category}); } catch { /* audit cannot leak or alter tool output */ }
}

function createServer(ctx:{user:{id:string},db:any}) {
  const server = new McpServer({ name:"fitness-mcp", version:MCP_VERSION }, { capabilities:{tools:{}} });
  const timezone = () => (ctx as any).timezone || "Asia/Kolkata";
  for (const name of WRITE_TOOLS) {
    const def = writeDefinitions[name];
    server.registerTool(name, { title:name.replaceAll("_"," "), description:def.description, inputSchema:def.schema as any, outputSchema, annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false} }, async (raw:any) => {
      if (MCP_MODE !== "read_write" || !isWriteTool(name)) throw new Error("Tool is not permitted");
      const started=Date.now();
      try {
        const result=await executeWriteTool(name, raw, ctx.db, ctx.user.id, timezone());
        await audit(ctx.user.id,name,started,true,null);
        return { content:[{type:"text",text:JSON.stringify(result)}], structuredContent:result };
      } catch(e) { const category=e instanceof Error?e.message:"INTERNAL_ERROR"; console.error(`[mcp] write tool ${name} failed:`,category); await audit(ctx.user.id,name,started,false,category.slice(0,120)); return {isError:true,content:[{type:"text",text:JSON.stringify({error:"Unable to save fitness data",category,retryable:/UNAVAILABLE|TIMEOUT/.test(category)})}]}; }
    });
  }
  for (const name of APPROVED_TOOLS) {
    const def = definitions[name];
    server.registerTool(name, { title:name.replaceAll("_"," "), description:def.description, inputSchema:def.schema as any, outputSchema, annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} }, async (raw:any) => {
      if (!isApprovedTool(name)) throw new Error("Tool is not permitted");
      const started=Date.now();
      try {
        let args=raw;
        if(name==="get_recent_fitness_data") { let p:any=null; try { const {data}=await ctx.db.from("user_preferences").select("*").limit(1); p=Array.isArray(data)?data[0]:data; } catch { p=null; } const tz=(p as any)?.timezone||"Asia/Kolkata", end=todayIn(tz); args={start_date:minusDays(end,raw.days??14),end_date:end}; }
        const raw_result=await executeTool(name,args,ctx.db);
        const { payload:result } = capPayload(raw_result); // oversized payloads break MCP clients
        await audit(ctx.user.id,name,started,true,null);
        return { content:[{type:"text",text:JSON.stringify(result)}], structuredContent:result };
      } catch(e) { const category=e instanceof Error?e.message:"INTERNAL_ERROR"; console.error(`[mcp] tool ${name} failed:`,category); await audit(ctx.user.id,name,started,false,category.slice(0,120)); return {isError:true,content:[{type:"text",text:JSON.stringify({error:"Unable to retrieve fitness data",category,retryable:/UNAVAILABLE|TIMEOUT/.test(category)})}]}; }
    });
  }
  return server;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:CORS});
  const path=new URL(req.url).pathname;
  if (path.endsWith("/health")) return json({status:"ok",service:"fitness-mcp",version:MCP_VERSION,mode:MCP_MODE,transport:"streamable-http"});
  if (path.endsWith("/.well-known/oauth-protected-resource")) return json({resource:ENDPOINT,authorization_servers:[`${SUPABASE_URL}/auth/v1`],bearer_methods_supported:["header"],scopes_supported:["openid","profile"]});
  if (req.method === "POST") {
    const length=Number(req.headers.get("content-length")||0); if(length>131072)return json({error:"Request too large"},413);
    const bytes=new Uint8Array(await req.arrayBuffer()); if(bytes.byteLength>131072)return json({error:"Request too large"},413);
    req=new Request(req.url,{method:req.method,headers:req.headers,body:bytes});
  }
  const ctx=await authenticate(req);
  if(!ctx)return json({error:"Authentication required"},401,{"WWW-Authenticate":`Bearer resource_metadata="${RESOURCE_METADATA}"`});
  if(!["POST","GET","DELETE"].includes(req.method))return json({error:"Method not allowed"},405);
  try {
    const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    const server=createServer(ctx); await server.connect(transport);
    const response=await transport.handleRequest(req);
    const headers=new Headers(response.headers); Object.entries(CORS).forEach(([k,v])=>headers.set(k,v)); headers.set("Cache-Control","no-store");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  } catch (e) { console.error("[mcp] transport failure:",(e as Error)?.message ?? e); return json({error:"MCP request failed",detail:(e as Error)?.message ?? "unknown"},500); }
});
