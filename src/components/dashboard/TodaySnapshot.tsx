/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';
import { WaterTracker } from './WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { ActivityLogger } from '@/components/health/ActivityLogger';

export function TodaySnapshot() {
  const { user } = useAuth(); const { preferences } = useUserPreferences(); const [open, setOpen] = useState(false); const [data, setData] = useState({ sleep: null as number|null, protein: 0, water: 0 });
  useEffect(() => { if (!user) return; const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); Promise.all([supabase.from('daily_metrics').select('sleep_hours').eq('user_id', user.id).eq('date', localDateKey()).maybeSingle(), supabase.from('meals').select('protein').eq('user_id', user.id).eq('date', localDateKey()), supabase.from('water_logs').select('amount').eq('user_id', user.id).gte('timestamp', start.toISOString()).lt('timestamp', end.toISOString())]).then(([metrics, meals, water]: any[]) => setData({ sleep: metrics.data?.sleep_hours ?? null, protein: (meals.data || []).reduce((sum: number, item: any) => sum + Number(item.protein || 0), 0), water: (water.data || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) })); }, [user, open]);
  const rows = [['Sleep', data.sleep == null ? 'Not logged' : `${data.sleep}h`], ['Protein', data.protein ? `${Math.round(data.protein)} / ${preferences?.daily_protein_goal || 180}g` : 'Not logged'], ['Water', data.water ? `${(data.water / 1000).toFixed(1)}L` : 'Not logged']];
  return <><section className="rounded-2xl border border-border bg-card overflow-hidden"><header className="px-4 pt-4 pb-2"><div className="text-[10px] font-bold tracking-[.16em] text-muted-foreground">TODAY</div></header><div className="px-4">{rows.map(([label, value]) => <div key={label} className="h-11 border-t border-border flex items-center justify-between"><span className="text-sm">{label}</span><span className={`text-sm font-semibold tabular-nums ${value === 'Not logged' ? 'text-muted-foreground' : ''}`}>{value}</span></div>)}</div><button onClick={() => setOpen(true)} className="w-full h-12 px-4 border-t border-border flex items-center justify-between text-sm font-bold hover:bg-muted/50"><span>Log more</span><ChevronRight className="h-4 w-4" /></button></section><Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4, maxHeight: '90dvh' } }}><DialogContent sx={{ p: 2 }}><div className="flex items-center justify-between mb-3"><div><div className="text-[10px] font-bold tracking-[.16em] text-muted-foreground">TODAY</div><h2 className="text-xl font-bold">Log something</h2></div><IconButton onClick={() => setOpen(false)} aria-label="Close"><X /></IconButton></div><div className="grid gap-3"><WaterTracker /><CalorieTrackerCompact /><ActivityLogger /></div></DialogContent></Dialog></>;
}
