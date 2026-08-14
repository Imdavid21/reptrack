/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2.90.0";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.30.0/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.30.0/server/webStandardStreamableHttp.js";
import { z } from "npm:zod@3.25.76";
import { APPROVED_TOOLS, MCP_MODE, MCP_VERSION, isApprovedTool } from "./core.ts";
import { executeTool } from "./data.ts";

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
const limit = (max: number, fallback: number) => z.number().int().min(1).max(max).optional().default(fallback);
const outputSchema = z.object({
  start_date: z.string().nullable(), end_date: z.string().nullable(), timezone: z.string(),
  data: z.unknown(), summary: z.unknown(), metadata: z.unknown(),
});

const definitions = {
  get_fitness_profile: { description: "Retrieve the authenticated user's current stored fitness profile, goals, targets, program, timezone, and latest logged bodyweight. Use for baseline context; unstored fields remain null.", schema: {} },
  get_bodyweight_history: { description: "Retrieve bodyweight measurements and calculated change and 7-day moving averages for the authenticated user. Use when evaluating a weight trend over a date range.", schema: { ...dateRange, limit: limit(365,365) } },
  get_workouts: { description: "Retrieve detailed completed workout and exercise logs for the authenticated user. Use for reviewing sessions, loads, repetitions, or workout duration; results are bounded.", schema: { ...dateRange, workout_type:z.string().max(80).optional(), exercise:z.string().max(120).optional(), limit:limit(50,50) } },
  get_exercise_history: { description: "Retrieve history for a named exercise, including logged reps/load, calculable volume, and clearly labelled estimated 1RM. Use for evaluating strength progression.", schema: { exercise:z.string().min(1).max(120), ...dateRange, limit:limit(100,100) } },
  get_training_summary: { description: "Retrieve aggregated resistance-training metrics over a date range. Use for consistency, volume, muscle-group sets, duration, or training frequency.", schema: dateRange },
  get_nutrition: { description: "Retrieve logged meals, daily calories, macros, fibre, water, targets, and averages. Use for factual nutrition-log analysis, not medical interpretation.", schema: { ...dateRange, limit:limit(365,365) } },
  get_sleep: { description: "Retrieve stored sleep duration and summary statistics. Use for sleep consistency or recovery context; unavailable sleep fields are explicitly identified.", schema: dateRange },
  get_activity: { description: "Retrieve stored activity, cardio duration, active calories, and distance. Use for activity analysis; BMR and unavailable metrics are never inferred.", schema: dateRange },
  get_progress_summary: { description: "Retrieve a compact cross-domain progress summary covering bodyweight, nutrition, sleep, activity, and training. Use for efficient high-level comparisons without coaching advice.", schema: dateRange },
  get_recent_fitness_data: { description: "Retrieve a compact combined recent fitness dataset for prompts reviewing weight, training, nutrition, sleep, and activity together. Accepts 1–90 days and avoids large raw payloads.", schema: { days:z.number().int().min(1).max(90).optional().default(14) } },
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
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  return { user:data.user, token, db:createClient(SUPABASE_URL, ANON_KEY, { global:{headers:{Authorization:`Bearer ${token}`}}, auth:{persistSession:false,autoRefreshToken:false} }) };
}

async function rateLimitRequest(ctx:{token:string}) {
  try {
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_rate_limit`,{method:"POST",headers:{"Content-Type":"application/json",apikey:ANON_KEY,Authorization:`Bearer ${ctx.token}`},body:JSON.stringify({p_bucket:"mcp",p_max:60,p_window_seconds:60})});
    if(!response.ok)return false;
    return await response.json() === true;
  } catch { return false; } // sensitive external API: fail closed
}

async function audit(userId:string, tool:string, started:number, success:boolean, category:string|null) {
  try { await createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}}).from("mcp_audit_logs").insert({user_id:userId,tool_name:tool,duration_ms:Math.max(0,Date.now()-started),success,error_category:category}); } catch { /* audit cannot leak or alter tool output */ }
}

function createServer(ctx:{user:{id:string},db:any}) {
  const server = new McpServer({ name:"fitness-mcp", version:MCP_VERSION }, { capabilities:{tools:{}} });
  for (const name of APPROVED_TOOLS) {
    const def = definitions[name];
    server.registerTool(name, { title:name.replaceAll("_"," "), description:def.description, inputSchema:def.schema as any, outputSchema, annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} }, async (raw:any) => {
      if (MCP_MODE !== "read_only" || !isApprovedTool(name)) throw new Error("Tool is not permitted");
      const started=Date.now();
      try {
        let args=raw;
        if(name==="get_recent_fitness_data") { const {data:p}=await ctx.db.from("user_preferences").select("*").maybeSingle(); const tz=(p as any)?.timezone||"Asia/Kolkata", end=todayIn(tz); args={start_date:minusDays(end,raw.days??14),end_date:end}; }
        const result=await executeTool(name,args,ctx.db); await audit(ctx.user.id,name,started,true,null);
        return { content:[{type:"text",text:JSON.stringify(result)}], structuredContent:result };
      } catch(e) { const category=e instanceof Error?e.message:"INTERNAL_ERROR"; await audit(ctx.user.id,name,started,false,category); return {isError:true,content:[{type:"text",text:JSON.stringify({error:"Unable to retrieve fitness data",category})}]}; }
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
  if(!(await rateLimitRequest(ctx)))return json({error:"Rate limit exceeded or unavailable"},429);
  if(!["POST","GET","DELETE"].includes(req.method))return json({error:"Method not allowed"},405);
  try {
    const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    const server=createServer(ctx); await server.connect(transport);
    const response=await transport.handleRequest(req);
    const headers=new Headers(response.headers); Object.entries(CORS).forEach(([k,v])=>headers.set(k,v)); headers.set("Cache-Control","no-store");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  } catch { return json({error:"MCP request failed"},500); }
});
