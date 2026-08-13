/* eslint-disable @typescript-eslint/no-explicit-any */
import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion} from 'framer-motion';
import {ArrowRight,BrainCircuit,Play} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {PPL_PROGRAM,SessionKey} from '@/lib/adaptivePpl';
import {haptic} from '@/lib/haptics';

export function NextWorkoutCard(){
 const navigate=useNavigate();const{user}=useAuth();const[key,setKey]=useState<SessionKey>('push_a');
 useEffect(()=>{if(user)(supabase.from('training_state' as any) as any).select('next_session').eq('user_id',user.id).maybeSingle().then(({data}:any)=>data?.next_session&&setKey(data.next_session))},[user]);
 const session=PPL_PROGRAM[key];
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-border bg-card overflow-hidden">
  <div className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Today · next in sequence</div><div className="text-xl font-bold mt-0.5">{session.name}</div><div className="text-xs text-muted-foreground mt-1">{session.objective}</div></div><BrainCircuit className="h-5 w-5 text-energy-ink shrink-0"/></div><div className="flex gap-2 mt-3"><span className="badge-energy">Adaptive</span><span className="text-[11px] text-muted-foreground">~{session.duration} min before readiness adjustment</span></div></div>
  <button onClick={()=>{haptic('medium');navigate('/app/log')}} className="w-full btn-energy rounded-none py-3.5 flex items-center justify-center gap-2"><Play className="h-4 w-4" fill="currentColor"/>Check readiness & start<ArrowRight className="h-4 w-4"/></button>
 </motion.div>
}
