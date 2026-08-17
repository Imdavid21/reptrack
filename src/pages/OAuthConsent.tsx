/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const authorizationId = params.get('authorization_id');
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const returnTo = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId || '')}`;
      navigate(`/signin?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
      return;
    }
    if (!authorizationId) { setError('This authorization request is missing or invalid.'); return; }
    const oauth = (supabase.auth as any).oauth;
    if (!oauth?.getAuthorizationDetails) { setError('OAuth authorization is not enabled for this environment.'); return; }
    // The authorization can only be fetched once while pending; StrictMode double
    // invocation would otherwise consume it and 400 the real request.
    if (requested.current) return;
    requested.current = true;
    oauth.getAuthorizationDetails(authorizationId).then(({ data, error: e }: any) => {
      if (e) { setError(e.message); return; }
      // Auto-approved / already-decided requests come back with a redirect target.
      const target = data?.redirect_url ?? data?.redirect_to;
      if (target && !data?.client) { window.location.assign(target); return; }
      setDetails(data);
    });
  }, [authorizationId, loading, navigate, user]);

  const decide = async (approved: boolean) => {
    setBusy(true); setError('');
    try {
      const oauth = (supabase.auth as any).oauth;
      const { data, error: e } = await (approved ? oauth.approveAuthorization(authorizationId) : oauth.denyAuthorization(authorizationId));
      if (e) throw e;
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error('No redirect returned by the authorization server.');
      window.location.assign(target);
    } catch (e) { setError(e instanceof Error ? e.message : 'Authorization failed.'); setBusy(false); }
  };


  return <Box sx={{ minHeight:'100dvh', display:'grid', placeItems:'center', bgcolor:'background.default', p:2 }}>
    <Paper variant="outlined" sx={{ width:'100%', maxWidth:460, p:4, borderRadius:4 }}>
      <ShieldCheck size={32} />
      <Typography variant="h5" fontWeight={700} sx={{ mt:2 }}>Connect your fitness data</Typography>
      <Typography color="text.secondary" sx={{ mt:1 }}>
        {details?.client?.client_name || 'ChatGPT'} is requesting read-only access to your Reptrack fitness records.
      </Typography>
      <Box sx={{ my:3, p:2, bgcolor:'action.hover', borderRadius:2 }}>
        <Typography fontWeight={600}>This connection can read</Typography>
        <Typography variant="body2" color="text.secondary">Workouts, bodyweight, nutrition, sleep, activity, goals, and progress summaries.</Typography>
        <Typography fontWeight={600} sx={{ mt:2 }}>It cannot</Typography>
        <Typography variant="body2" color="text.secondary">Create, edit, or delete records; change goals; or manage your account.</Typography>
      </Box>
      {error && <Typography color="error" variant="body2" sx={{ mb:2 }}>{error}</Typography>}
      {!details && !error ? <Box sx={{display:'flex',justifyContent:'center',py:2}}><CircularProgress size={24}/></Box> :
        <Box sx={{display:'flex',gap:1.5}}><Button variant="outlined" fullWidth disabled={busy} onClick={()=>decide(false)}>Deny</Button><Button variant="contained" fullWidth disabled={busy||!details} onClick={()=>decide(true)}>Allow read-only access</Button></Box>}
      <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:3}}>Signed in as {user?.email}. <Link to="/privacy">Privacy policy</Link></Typography>
    </Paper>
  </Box>;
}
