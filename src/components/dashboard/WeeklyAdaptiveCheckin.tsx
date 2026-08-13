/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, TextField, Typography } from '@mui/material';
import { Ruler, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { localDateKey } from '@/lib/dateKey';
import { toast } from '@/lib/toast';

type Props = { fallback?: ReactNode; open: boolean; onOpenChange: (open: boolean) => void };

export function WeeklyAdaptiveCheckin({ fallback = null, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [due, setDue] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [averageWeight, setAverageWeight] = useState<number | null>(null);
  const [weightTrend, setWeightTrend] = useState<number | null>(null);
  const [waist, setWaist] = useState('');
  const [upperArmLeft, setUpperArmLeft] = useState('');
  const [upperArmRight, setUpperArmRight] = useState('');
  const [chest, setChest] = useState('');
  const [calfLeft, setCalfLeft] = useState('');
  const [calfRight, setCalfRight] = useState('');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [heels, setHeels] = useState(true);
  const [restriction, setRestriction] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13);
    Promise.all([
      (supabase.from('physique_checkins') as any).select('checkin_date').eq('user_id', user.id).gte('checkin_date', localDateKey(monday)).limit(1).maybeSingle(),
      (supabase.from('mobility_assessments') as any).select('assessment_date').eq('user_id', user.id).gte('assessment_date', localDateKey(monday)).limit(1).maybeSingle(),
      supabase.from('daily_metrics').select('bodyweight,date').eq('user_id', user.id).gte('date', localDateKey(from)).lte('date', localDateKey(today)).not('bodyweight', 'is', null).order('date'),
    ]).then(([physique, mobility, weights]: any[]) => {
      setDue(!(physique.data && mobility.data));
      const values = (weights.data || []).map((item: any) => Number(item.bodyweight)).filter((value: number) => value > 0);
      const recent = values.slice(-7); const prior = values.slice(0, Math.max(0, values.length - 7));
      setAverageWeight(recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length * 100) / 100 : null);
      setWeightTrend(recent.length && prior.length ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length - prior.reduce((a, b) => a + b, 0) / prior.length) * 100) / 100 : null);
    }).finally(() => setLoaded(true));
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (averageWeight == null) return toast.error('Log bodyweight on Today first so the 7-day average can be calculated.');
    if (!waist || !left || !right || restriction === '') return toast.error('Complete the measurements before saving.');
    setSaving(true);
    try {
      await Promise.all([
        (supabase.from('physique_checkins') as any).insert({ user_id: user.id, checkin_date: localDateKey(), bodyweight: averageWeight, waist_cm: Number(waist), upper_arm_left_cm: upperArmLeft ? Number(upperArmLeft) : null, upper_arm_right_cm: upperArmRight ? Number(upperArmRight) : null, chest_cm: chest ? Number(chest) : null, calf_left_cm: calfLeft ? Number(calfLeft) : null, calf_right_cm: calfRight ? Number(calfRight) : null }),
        (supabase.from('mobility_assessments') as any).insert({ user_id: user.id, assessment_date: localDateKey(), heels_down: heels, knee_to_wall_left_cm: Number(left), knee_to_wall_right_cm: Number(right), hip_flexion_restriction: Number(restriction) }),
      ]);
      setDue(false); onOpenChange(false); toast.success('Weekly check saved until next Monday.');
    } catch { toast.error('Could not save weekly check-in.'); } finally { setSaving(false); }
  };

  if (!loaded) return null;
  return <>{fallback}{due && <Dialog open={open} onClose={() => onOpenChange(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}><DialogContent sx={{ p: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Ruler size={17}/><Box><Typography fontWeight={800}>Weekly check</Typography><Typography variant="caption" color="text.secondary">A few measurements for your trend</Typography></Box></Box><IconButton onClick={() => onOpenChange(false)} aria-label="Close weekly check"><X /></IconButton></Box>
    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', mb: 2 }}><Box><Typography variant="caption" color="text.secondary">7-DAY AVERAGE WEIGHT</Typography><Typography variant="h6" fontWeight={800}>{averageWeight != null ? `${averageWeight.toFixed(2)} kg` : 'Not enough data'}</Typography></Box>{weightTrend != null && <Typography variant="body2" color="text.secondary">{weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(2)} kg vs prior 7 days</Typography>}</Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}><TextField required label="Waist (cm)" value={waist} onChange={event => setWaist(event.target.value)} inputMode="decimal"/><TextField label="Upper arm L (cm)" value={upperArmLeft} onChange={event => setUpperArmLeft(event.target.value)} inputMode="decimal"/><TextField label="Upper arm R (cm)" value={upperArmRight} onChange={event => setUpperArmRight(event.target.value)} inputMode="decimal"/><TextField label="Chest (cm)" value={chest} onChange={event => setChest(event.target.value)} inputMode="decimal"/><TextField label="Calf L (cm)" value={calfLeft} onChange={event => setCalfLeft(event.target.value)} inputMode="decimal"/><TextField label="Calf R (cm)" value={calfRight} onChange={event => setCalfRight(event.target.value)} inputMode="decimal"/><TextField required label="Knee-to-wall L (cm)" value={left} onChange={event => setLeft(event.target.value)} inputMode="decimal"/><TextField required label="Knee-to-wall R (cm)" value={right} onChange={event => setRight(event.target.value)} inputMode="decimal"/></Box>
    <Button fullWidth variant={heels ? 'contained' : 'outlined'} onClick={() => setHeels(value => !value)} sx={{ mt: 1.5, textTransform: 'none' }}>Heels {heels ? 'stay down' : 'lift'}</Button><TextField fullWidth required label="Hip flexion restriction (0–10)" value={restriction} onChange={event => setRestriction(event.target.value)} inputMode="numeric" sx={{ mt: 1.5 }}/><Button fullWidth variant="contained" onClick={save} disabled={saving || averageWeight == null} sx={{ mt: 2 }}>{saving ? 'Saving…' : 'Save weekly check'}</Button>
  </DialogContent></Dialog>}</>;
}
