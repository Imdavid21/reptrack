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
  const [bodyFat, setBodyFat] = useState('');
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
    if (!waist || !left || !right) return toast.error('Complete the measurements before saving.');
    setSaving(true);
    try {
      await Promise.all([
        (supabase.from('physique_checkins') as any).insert({ user_id: user.id, checkin_date: localDateKey(), bodyweight: averageWeight, waist_cm: Number(waist), upper_arm_left_cm: upperArmLeft ? Number(upperArmLeft) : null, upper_arm_right_cm: upperArmRight ? Number(upperArmRight) : null, chest_cm: chest ? Number(chest) : null, calf_left_cm: calfLeft ? Number(calfLeft) : null, calf_right_cm: calfRight ? Number(calfRight) : null, body_fat_percentage: bodyFat ? Number(bodyFat) : null }),
        (supabase.from('mobility_assessments') as any).insert({ user_id: user.id, assessment_date: localDateKey(), knee_to_wall_left_cm: Number(left), knee_to_wall_right_cm: Number(right) }),
      ]);
      setDue(false); onOpenChange(false); toast.success('Weekly check saved until next Monday.');
    } catch { toast.error('Could not save weekly check-in.'); } finally { setSaving(false); }
  };

  if (!loaded) return null;

  const fields: Array<{ label: string; value: string; set: (value: string) => void; required?: boolean }> = [
    { label: 'Waist (cm)', value: waist, set: setWaist, required: true },
    { label: 'Upper arm L (cm)', value: upperArmLeft, set: setUpperArmLeft },
    { label: 'Upper arm R (cm)', value: upperArmRight, set: setUpperArmRight },
    { label: 'Chest (cm)', value: chest, set: setChest },
    { label: 'Calf L (cm)', value: calfLeft, set: setCalfLeft },
    { label: 'Calf R (cm)', value: calfRight, set: setCalfRight },
    { label: 'Knee-to-wall L (cm)', value: left, set: setLeft, required: true },
    { label: 'Knee-to-wall R (cm)', value: right, set: setRight, required: true },
    { label: 'Body fat (%)', value: bodyFat, set: setBodyFat },
  ];

  return (
    <>
      {fallback}
      {due && (
        <Dialog
          open={open}
          onClose={() => onOpenChange(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: '24px', border: 1, borderColor: 'divider' } }}
        >
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'action.hover', display: 'flex' }}>
                  <Ruler size={16} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 }}>
                    Weekly check
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    A few measurements for your trend
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => onOpenChange(false)} aria-label="Close weekly check">
                <X size={18} />
              </IconButton>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                mb: 2.5,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  7-day average weight
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '1.375rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {averageWeight != null ? `${averageWeight.toFixed(2)} kg` : 'Not enough data'}
                </Typography>
              </Box>
              {weightTrend != null && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {weightTrend > 0 ? '+' : ''}
                  {weightTrend.toFixed(2)} kg vs prior 7 days
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {fields.map(field => (
                <TextField
                  key={field.label}
                  required={field.required}
                  label={field.label}
                  value={field.value}
                  onChange={event => field.set(event.target.value)}
                  inputMode="decimal"
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', height: 44 } }}
                />
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={save}
              disabled={saving || averageWeight == null}
              sx={{ mt: 3, height: 52, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              {saving ? 'Saving' : 'Save weekly check'}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
