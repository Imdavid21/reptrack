/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogContent, IconButton, LinearProgress, Typography } from '@mui/material';
import { ArrowLeft, ArrowRight, Check, ChevronRight, HeartPulse, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateReadiness, JOINT_AREAS, SessionKey, SORENESS_AREAS } from '@/lib/adaptivePpl';
import { localDateKey } from '@/lib/dateKey';
import { toast } from '@/lib/toast';

type Question = { key: string; label: string; detail: string; group: 'fatigue'|'motivation'|'soreness'|'joint' };
const questions: Question[] = [
  { key: 'fatigue', label: 'How fatigued do you feel?', detail: '0 is fresh · 10 is exhausted', group: 'fatigue' },
  { key: 'motivation', label: 'How ready are you to train?', detail: '0 is not ready · 10 is fully ready', group: 'motivation' },
  ...SORENESS_AREAS.map(key => ({ key, label: `${key[0].toUpperCase()}${key.slice(1)} soreness`, detail: '0 is none · 10 is severe', group: 'soreness' as const })),
  ...JOINT_AREAS.map(key => ({ key, label: `${key[0].toUpperCase()}${key.slice(1)} discomfort`, detail: '0 is none · 10 is significant', group: 'joint' as const })),
];

export function DailyReadinessCheck() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false); const [step, setStep] = useState(0); const [saved, setSaved] = useState<any>(null);
  const [sleep, setSleep] = useState<number|null>(null); const [sessionKey, setSessionKey] = useState<SessionKey>('push_a');
  const [fatigue, setFatigue] = useState(4); const [motivation, setMotivation] = useState(7); const [soreness, setSoreness] = useState<Record<string,number>>({}); const [joints, setJoints] = useState<Record<string,number>>({});
  const [illness, setIllness] = useState(false); const [sharpPain, setSharpPain] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(()=>{if(!user)return;Promise.all([(supabase.from('training_state' as any) as any).select('next_session').eq('user_id',user.id).maybeSingle(),(supabase.from('daily_metrics') as any).select('sleep_hours').eq('user_id',user.id).eq('date',localDateKey()).maybeSingle(),(supabase.from('readiness_checkins' as any) as any).select('*').eq('user_id',user.id).eq('checkin_date',localDateKey()).order('created_at',{ascending:false}).limit(1).maybeSingle()]).then(([state,metric,checkin]:any[])=>{if(state.data?.next_session)setSessionKey(state.data.next_session);setSleep(metric.data?.sleep_hours??null);if(checkin.data){setSaved(checkin.data);setFatigue(checkin.data.fatigue);setMotivation(checkin.data.motivation);setSoreness(checkin.data.soreness||{});setJoints(checkin.data.joint_discomfort||{});setIllness(checkin.data.illness);setSharpPain(checkin.data.sharp_pain)}})},[user]);
  const result=useMemo(()=>calculateReadiness({sleep:sleep??7,soreness,joints,fatigue,motivation,illness,sharpPain,recentLowerBodyKm:0},sessionKey),[sleep,soreness,joints,fatigue,motivation,illness,sharpPain,sessionKey]);
  const question=questions[step]; const value=question?.group==='fatigue'?fatigue:question?.group==='motivation'?motivation:question?.group==='soreness'?(soreness[question.key]||0):(joints[question?.key]||0);
  const choose=(next:number)=>{if(question.group==='fatigue')setFatigue(next);else if(question.group==='motivation')setMotivation(next);else if(question.group==='soreness')setSoreness(old=>({...old,[question.key]:next}));else setJoints(old=>({...old,[question.key]:next}));};
  const save=async()=>{if(!user)return;setBusy(true);const payload={user_id:user.id,session_key:sessionKey,checkin_date:localDateKey(),sleep_hours:sleep??7,soreness,joint_discomfort:joints,fatigue,motivation,illness,sharp_pain:sharpPain,readiness:result.band,recommendation:result};const query=saved?.id?(supabase.from('readiness_checkins' as any) as any).update(payload).eq('id',saved.id):(supabase.from('readiness_checkins' as any) as any).insert(payload);const{data,error}=await query.select().single();setBusy(false);if(error)return toast.error('Could not save readiness');setSaved(data);setOpen(false);setStep(0);toast.success(`${result.band.toUpperCase()} readiness saved`)};
  return <>
    <button onClick={()=>{setStep(0);setOpen(true)}} className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
      <span className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><HeartPulse className="h-5 w-5"/></span><span className="flex-1 min-w-0"><span className="block text-sm font-bold">Daily readiness</span><span className="block text-xs text-muted-foreground mt-0.5">{saved?`${saved.readiness.toUpperCase()} · tap to review or update`:'Optional · about 45 seconds'}</span></span>{saved&&<Chip size="small" color={saved.readiness==='green'?'success':saved.readiness==='red'?'error':'warning'} label={saved.readiness}/>}<ChevronRight className="h-4 w-4 text-muted-foreground"/>
    </button>
    <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="sm" fullScreen={false} PaperProps={{sx:{borderRadius:{xs:0,sm:4},minHeight:{xs:'100dvh',sm:520},m:{xs:0,sm:2}}}}>
      <DialogContent sx={{display:'flex',flexDirection:'column',p:{xs:2.5,sm:3}}}>
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><Box><Typography variant="overline" color="text.secondary">DAILY READINESS</Typography><Typography variant="caption" color="text.secondary" sx={{display:'block'}}>{step+1} of {questions.length+1}</Typography></Box><IconButton aria-label="Close readiness" onClick={()=>setOpen(false)}><X/></IconButton></Box>
        <LinearProgress variant="determinate" value={(step+1)/(questions.length+1)*100} sx={{mt:2,height:5,borderRadius:9}}/>
        {step<questions.length?<Box sx={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',py:4}}><Typography variant="h5" fontWeight={800}>{question.label}</Typography><Typography color="text.secondary" sx={{mt:1}}>{question.detail}</Typography><Box role="radiogroup" aria-label={question.label} sx={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:1,mt:4}}>{Array.from({length:11},(_,i)=><Button key={i} role="radio" aria-checked={value===i} variant={value===i?'contained':'outlined'} onClick={()=>choose(i)} sx={{minWidth:0,height:48,fontSize:16}}>{i}</Button>)}</Box></Box>:<Box sx={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',py:4}}><HeartPulse size={32}/><Typography variant="h5" fontWeight={800} sx={{mt:2}}>Anything important today?</Typography><Typography color="text.secondary" sx={{mt:1}}>Only select these when they apply. Sharp pain should stop the provoking exercise.</Typography><Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.5,mt:4}}><Button variant={illness?'contained':'outlined'} color="warning" onClick={()=>setIllness(v=>!v)}>Acute illness</Button><Button variant={sharpPain?'contained':'outlined'} color="error" onClick={()=>setSharpPain(v=>!v)}>Sharp pain</Button></Box><Box sx={{mt:3,p:2,bgcolor:'action.hover',borderRadius:3}}><Typography fontWeight={800} sx={{textTransform:'uppercase'}}>{result.band} readiness</Typography><Typography variant="body2" color="text.secondary">{result.message}{sleep!=null?` · ${sleep}h sleep from Today`:''}</Typography></Box></Box>}
        <Box sx={{display:'flex',gap:1.5}}><Button variant="outlined" disabled={step===0} onClick={()=>setStep(s=>s-1)} startIcon={<ArrowLeft/>}>Back</Button>{step<questions.length?<Button fullWidth variant="contained" onClick={()=>setStep(s=>s+1)} endIcon={<ArrowRight/>}>Next</Button>:<Button fullWidth variant="contained" disabled={busy} onClick={save} startIcon={<Check/>}>Save readiness</Button>}</Box>
      </DialogContent>
    </Dialog>
  </>;
}
