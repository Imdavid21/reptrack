/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { ChevronRight, Droplets, Plus, Utensils, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { ActivityLogger } from '@/components/health/ActivityLogger';
import { toast } from '@/lib/toast';

export function TodaySnapshot() {
  const { user } = useAuth(); const { preferences } = useUserPreferences(); const { totalToday, addWaterLog, isAdding } = useWaterLogs();
  const [foodOpen, setFoodOpen] = useState(false); const [moreOpen, setMoreOpen] = useState(false); const [data, setData] = useState({ sleep: null as number|null, protein: 0 });
  useEffect(() => { if (!user) return; Promise.all([supabase.from('daily_metrics').select('sleep_hours').eq('user_id', user.id).eq('date', localDateKey()).maybeSingle(), supabase.from('meals').select('protein').eq('user_id', user.id).eq('date', localDateKey())]).then(([metrics, meals]: any[]) => setData({ sleep: metrics.data?.sleep_hours ?? null, protein: (meals.data || []).reduce((sum: number, item: any) => sum + Number(item.protein || 0), 0) })); }, [user, foodOpen]);
  const logWater = async (amount: number) => { try { await addWaterLog({ amount }); toast.success(`Added ${Math.round(amount * 1000)} ml water`); } catch { toast.error('Could not log water'); } };
  const rows = [['Sleep', data.sleep == null ? 'Not logged' : `${data.sleep}h`], ['Protein', data.protein ? `${Math.round(data.protein)} / ${preferences?.daily_protein_goal || 180}g` : 'Not logged'], ['Water', totalToday ? `${totalToday.toFixed(2)}L` : 'Not logged']];
  return <><section className="rounded-2xl border border-border bg-card overflow-hidden"><header className="px-4 pt-4 pb-2"><div className="text-[10px] font-bold tracking-[.16em] text-muted-foreground">TODAY</div></header><div className="px-4">{rows.map(([label, value]) => <div key={label} className="h-11 border-t border-border flex items-center justify-between"><span className="text-sm">{label}</span><span className={`text-sm font-semibold tabular-nums ${value === 'Not logged' ? 'text-muted-foreground' : ''}`}>{value}</span></div>)}</div>
    <div className="grid grid-cols-3 gap-2 p-3 border-t border-border"><button disabled={isAdding} onClick={() => logWater(.25)} className="h-11 rounded-xl bg-muted hover:bg-muted/70 text-xs font-bold flex items-center justify-center gap-1.5"><Droplets className="h-4 w-4" />250 ml</button><button disabled={isAdding} onClick={() => logWater(.5)} className="h-11 rounded-xl bg-muted hover:bg-muted/70 text-xs font-bold flex items-center justify-center gap-1.5"><Plus className="h-4 w-4" />500 ml</button><button onClick={() => setFoodOpen(true)} className="h-11 rounded-xl bg-foreground text-background text-xs font-bold flex items-center justify-center gap-1.5"><Utensils className="h-4 w-4" />Food</button></div>
    <button onClick={() => setMoreOpen(true)} className="w-full h-11 px-4 border-t border-border flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground"><span>More logs</span><ChevronRight className="h-4 w-4" /></button></section>
    <Dialog open={foodOpen} onClose={() => setFoodOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4, maxHeight: '92dvh' } }}><DialogContent sx={{ p: 2 }}><div className="flex items-center justify-between mb-3"><div><div className="text-[10px] font-bold tracking-[.16em] text-muted-foreground">TODAY</div><h2 className="text-xl font-bold">Log food</h2></div><IconButton onClick={() => setFoodOpen(false)} aria-label="Close food logger"><X /></IconButton></div><CalorieTrackerCompact /></DialogContent></Dialog>
    <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4, maxHeight: '90dvh' } }}><DialogContent sx={{ p: 2 }}><div className="flex items-center justify-between mb-3"><h2 className="text-xl font-bold">Log activity</h2><IconButton onClick={() => setMoreOpen(false)} aria-label="Close"><X /></IconButton></div><ActivityLogger /></DialogContent></Dialog>
  </>;
}
