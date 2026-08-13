/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Collapse, Slider, Typography } from '@mui/material';
import { Check, ChevronDown, ChevronUp, HeartPulse } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateReadiness, JOINT_AREAS, SessionKey, SORENESS_AREAS } from '@/lib/adaptivePpl';
import { localDateKey } from '@/lib/dateKey';
import { toast } from '@/lib/toast';

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Box><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">{label}</Typography><Typography variant="body2" fontWeight={700}>{value}</Typography></Box><Slider size="small" value={value} min={0} max={10} step={1} onChange={(_, value) => onChange(value as number)} aria-label={label} /></Box>;
}

export function DailyReadinessCheck() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<SessionKey>('push_a');
  const [fatigue, setFatigue] = useState(4);
  const [motivation, setMotivation] = useState(7);
  const [soreness, setSoreness] = useState<Record<string, number>>({});
  const [joints, setJoints] = useState<Record<string, number>>({});
  const [illness, setIllness] = useState(false);
  const [sharpPain, setSharpPain] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session').eq('user_id', user.id).maybeSingle(),
      (supabase.from('daily_metrics') as any).select('sleep_hours').eq('user_id', user.id).eq('date', localDateKey()).maybeSingle(),
      (supabase.from('readiness_checkins' as any) as any).select('*').eq('user_id', user.id).eq('checkin_date', localDateKey()).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([state, metric, checkin]: any[]) => {
      if (state.data?.next_session) setSessionKey(state.data.next_session);
      setSleep(metric.data?.sleep_hours ?? null);
      if (checkin.data) {
        setSaved(checkin.data); setFatigue(checkin.data.fatigue); setMotivation(checkin.data.motivation);
        setSoreness(checkin.data.soreness || {}); setJoints(checkin.data.joint_discomfort || {});
        setIllness(checkin.data.illness); setSharpPain(checkin.data.sharp_pain);
      } else setOpen(true);
    });
  }, [user]);

  const result = useMemo(() => calculateReadiness({ sleep: sleep ?? 0, soreness, joints, fatigue, motivation, illness, sharpPain, recentLowerBodyKm: 0 }, sessionKey), [sleep, soreness, joints, fatigue, motivation, illness, sharpPain, sessionKey]);
  const save = async () => {
    if (!user || sleep == null) return;
    setBusy(true);
    const payload = { user_id: user.id, session_key: sessionKey, checkin_date: localDateKey(), sleep_hours: sleep, soreness, joint_discomfort: joints, fatigue, motivation, illness, sharp_pain: sharpPain, readiness: result.band, recommendation: result };
    const query = saved?.id ? (supabase.from('readiness_checkins' as any) as any).update(payload).eq('id', saved.id) : (supabase.from('readiness_checkins' as any) as any).insert(payload);
    const { data, error } = await query.select().single();
    setBusy(false);
    if (error) return toast.error('Could not save readiness');
    setSaved(data); setOpen(false); toast.success(`${result.band.toUpperCase()} readiness saved`);
  };

  return <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
    <Button onClick={() => setOpen(value => !value)} fullWidth sx={{ p: 2, justifyContent: 'space-between', textTransform: 'none', color: 'text.primary' }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', textAlign: 'left' }}><HeartPulse size={20} /><Box><Typography fontWeight={800}>Daily readiness</Typography><Typography variant="caption" color="text.secondary">{saved ? `${saved.readiness.toUpperCase()} · completed today` : sleep == null ? 'Log sleep to begin' : 'Complete before training'}</Typography></Box></Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{saved && <Chip size="small" color={saved.readiness === 'green' ? 'success' : saved.readiness === 'red' ? 'error' : 'warning'} label={saved.readiness} />}{open ? <ChevronUp /> : <ChevronDown />}</Box>
    </Button>
    <Collapse in={open}><Box sx={{ px: 2, pb: 2 }}>
      <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}><Typography variant="body2" fontWeight={700}>{sleep == null ? 'Sleep is not logged today' : `${sleep} hours sleep from Today`}</Typography></Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}><Rating label="General fatigue" value={fatigue} onChange={setFatigue} /><Rating label="Motivation / readiness" value={motivation} onChange={setMotivation} /></Box>
      <Typography variant="overline" color="text.secondary">Muscle soreness</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>{SORENESS_AREAS.map(area => <Rating key={area} label={area} value={soreness[area] || 0} onChange={value => setSoreness(old => ({ ...old, [area]: value }))} />)}</Box>
      <Typography variant="overline" color="text.secondary" sx={{ mt: 2 }}>Joint discomfort</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>{JOINT_AREAS.map(area => <Rating key={area} label={area} value={joints[area] || 0} onChange={value => setJoints(old => ({ ...old, [area]: value }))} />)}</Box>
      <Box sx={{ display: 'flex', gap: 1, my: 2 }}><Button size="small" color="warning" variant={illness ? 'contained' : 'outlined'} onClick={() => setIllness(value => !value)}>Acute illness</Button><Button size="small" color="error" variant={sharpPain ? 'contained' : 'outlined'} onClick={() => setSharpPain(value => !value)}>Sharp pain</Button></Box>
      <Button fullWidth variant="contained" startIcon={<Check />} disabled={busy || sleep == null} onClick={save}>{saved ? 'Update readiness' : `Save ${result.band} readiness`}</Button>
    </Box></Collapse>
  </Box>;
}
