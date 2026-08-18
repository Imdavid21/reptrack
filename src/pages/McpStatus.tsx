/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircle2, Clipboard, RefreshCw, Server } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;
const writeTools = ['log_meal','update_meal','log_water','log_workout','update_workout','log_activity','update_activity'];
const tools = ['get_fitness_profile','get_bodyweight_history','get_workouts','get_exercise_history','get_training_summary','get_nutrition','get_sleep','get_activity','get_progress_summary','get_recent_fitness_data'];

export default function McpStatus() {
  const { user, loading } = useAuth();
  const [health,setHealth]=useState<any>(null); const [checking,setChecking]=useState(false); const [logs,setLogs]=useState<any[]>([]);
  const check=async()=>{setChecking(true);try{const r=await fetch(`${endpoint}/health`);setHealth(await r.json());if(!r.ok)throw new Error();}catch{setHealth({status:'unreachable'});}finally{setChecking(false);}};
  useEffect(()=>{check(); if(user)supabase.from('mcp_audit_logs' as any).select('created_at,tool_name,duration_ms,success,error_category').order('created_at',{ascending:false}).limit(10).then(({data})=>setLogs((data as any[])||[]));},[user]);
  if(loading)return <Box sx={{display:'grid',placeItems:'center',minHeight:'100dvh'}}><CircularProgress/></Box>;
  if(!user)return <Navigate to={`/signin?redirect=${encodeURIComponent('/app/settings/mcp')}`} replace/>;
  return <MainLayout showBack backTo="/app/settings"><Box sx={{maxWidth:760,mx:'auto',display:'flex',flexDirection:'column',gap:2}}>
    <Box><Typography variant="h5" fontWeight={700}>MCP status</Typography><Typography color="text.secondary">Private ChatGPT integration with read and write access</Typography></Box>
    <MuiCard><Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:2}}><Box sx={{display:'flex',gap:1.5,alignItems:'center'}}><Server size={22}/><Box><Typography fontWeight={600}>Fitness MCP</Typography><Typography variant="body2" color="text.secondary">{health?.status||'Checking…'} · v{health?.version||'1.0.0'}</Typography></Box></Box><Chip color={health?.status==='ok'?'success':'default'} icon={health?.status==='ok'?<CheckCircle2/>:undefined} label={health?.status||'unknown'}/></Box></MuiCard>
    <MuiCard><Typography variant="overline" color="text.secondary">Endpoint</Typography><Typography variant="body2" sx={{wordBreak:'break-all',fontFamily:'monospace'}}>{endpoint}</Typography><Box sx={{display:'flex',gap:1,mt:2}}><Button size="small" variant="outlined" startIcon={<Clipboard/>} onClick={()=>navigator.clipboard.writeText(endpoint).then(()=>toast.success('MCP URL copied'))}>Copy URL</Button><Button size="small" variant="outlined" startIcon={<RefreshCw/>} onClick={check} disabled={checking}>Test health</Button></Box></MuiCard>
    <MuiCard><Typography fontWeight={600}>Connection</Typography><Typography variant="body2" color="text.secondary" sx={{mt:1}}>Transport: Streamable HTTP<br/>Authentication: Supabase OAuth 2.1 with PKCE<br/>Current user: {user.id}<br/>Mode: read and write (meals, water, workouts, activities)</Typography></MuiCard>
    <MuiCard><Typography fontWeight={600}>Read tools ({tools.length})</Typography><Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:2}}>{tools.map(t=><Chip key={t} label={t} size="small" variant="outlined"/>)}</Box><Typography fontWeight={600} sx={{mt:3}}>Write tools ({writeTools.length})</Typography><Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:2}}>{writeTools.map(t=><Chip key={t} label={t} size="small" color="primary" variant="outlined"/>)}</Box></MuiCard>
    <MuiCard><Typography fontWeight={600}>Recent sanitized activity</Typography>{logs.length?logs.map((l,i)=><Box key={i} sx={{display:'flex',justifyContent:'space-between',gap:2,py:1,borderBottom:i<logs.length-1?'1px solid':'none',borderColor:'divider'}}><Typography variant="body2">{l.tool_name}</Typography><Typography variant="caption" color="text.secondary">{l.success?'Success':l.error_category} · {l.duration_ms}ms</Typography></Box>):<Typography variant="body2" color="text.secondary" sx={{mt:1}}>No MCP requests yet.</Typography>}</MuiCard>
  </Box></MainLayout>;
}
