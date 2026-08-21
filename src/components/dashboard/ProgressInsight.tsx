import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function ProgressInsight() {
  const { user } = useAuth(); const navigate = useNavigate(); const [count, setCount] = useState(0);
  useEffect(() => { if (!user) return; const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10); supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null).gte('date', since).then(({ count }) => setCount(count || 0)); }, [user]);
  return <button onClick={() => navigate('/app/insights')} className="surface-card interactive-surface w-full p-4 text-left flex items-center gap-3"><span className="flex-1"><span className="block type-eyebrow">Progress</span><span className="block type-card-title mt-1">{count ? `${count} workout${count === 1 ? '' : 's'} this week` : 'Your next session is ready'}</span></span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>;
}
