/* eslint-disable @typescript-eslint/no-explicit-any */
import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion} from 'framer-motion';
import {ArrowRight,Play} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {nextSession,PPL_PROGRAM,SessionKey,sessionKeyFromWorkout} from '@/lib/adaptivePpl';
import {haptic} from '@/lib/haptics';

export function NextWorkoutCard(){
 const navigate=useNavigate();const{user}=useAuth();const[key,setKey]=useState<SessionKey>('push_a');
 useEffect(()=>{if(!user)return;Promise.all([(supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id',user.id).maybeSingle(),(supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id',user.id).not('completed_at','is',null).order('completed_at',{ascending:false}).limit(1).maybeSingle()]).then(([state,latest]:any[])=>{const last=sessionKeyFromWorkout(latest.data?.session_key,latest.data?.day_name);const historyIsNewer=!!last&&(!state.data?.updated_at||new Date(latest.data.completed_at)>new Date(state.data.updated_at));const resolved=historyIsNewer?nextSession(last!):(state.data?.next_session||(last?nextSession(last):'push_a'));setKey(resolved);if(historyIsNewer)(supabase.from('training_state') as any).upsert({user_id:user.id,next_session:resolved,updated_at:new Date().toISOString()})})},[user]);
 const session=PPL_PROGRAM[key];
 const preview=session.exercises.filter(ex=>['primary','compound','specialization'].includes(ex.phase)).slice(0,4).map(ex=>ex.name).join(' · ');
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-border bg-card overflow-hidden">
  <div className="p-5"><div className="text-[10px] font-bold tracking-[.16em] text-muted-foreground">DO NOW</div><div className="flex items-end justify-between gap-3 mt-1"><div><div className="text-2xl font-bold">{session.name}</div><div className="text-sm text-muted-foreground mt-1">About {session.duration} min</div></div><span className="text-xs text-muted-foreground">Next in sequence</span></div><p className="text-xs text-muted-foreground mt-4 line-clamp-2">{preview}</p></div>
  <button onClick={()=>{haptic('medium');navigate('/app/log')}} className="w-full bg-foreground text-background py-4 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80"><Play className="h-4 w-4" fill="currentColor"/>Start workout<ArrowRight className="h-4 w-4"/></button>
 </motion.div>
}
