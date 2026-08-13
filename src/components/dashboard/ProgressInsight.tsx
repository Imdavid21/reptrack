import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function ProgressInsight() {
  const { user } = useAuth(); const navigate = useNavigate(); const [count, setCount] = useState(0);
  useEffect(() => { if (!user) return; const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10); supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null).gte('date', since).then(({ count }) => setCount(count || 0)); }, [user]);
  return <button onClick={() => navigate('/app/insights')} className="w-full rounded-2xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-muted/30"><span className="flex-1"><span className="block text-xs font-bold tracking-[.16em] text-muted-foreground">PROGRESS</span><span className="block text-lg font-bold mt-1">{count ? `${count} workout${count === 1 ? '' : 's'} this week` : 'Your next session is ready'}</span><span className="block text-sm text-muted-foreground mt-1">{count ? 'You’re building a steady training rhythm.' : 'Start where you are. Nothing to catch up on.'}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>;
}
