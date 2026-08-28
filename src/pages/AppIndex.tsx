import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import Dashboard from './Dashboard';
import { PWAPrompt } from '@/components/pwa/PWAPrompt';

function AuthLoader() {
  return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><div className="text-2xl font-bold tracking-tight animate-pulse">REPTRACK<span className="text-muted-foreground"> </span>FITNESS</div></div></div>;
}

function PreferencesError({ retry, busy }: { retry: () => void; busy: boolean }) {
  return <div className="min-h-screen bg-background px-4 flex items-center justify-center"><div className="w-full max-w-sm rounded-[20px] border border-border bg-card p-5 text-center"><h1 className="type-card-title">Could not load your settings</h1><p className="type-supporting mt-2">Your data has not been replaced with defaults. Check the connection and try again.</p><button type="button" disabled={busy} onClick={retry} className="mt-5 min-h-11 w-full rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50">{busy ? 'Retrying…' : 'Try again'}</button></div></div>;
}

export default function AppIndex() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: prefsLoading, isFetching: prefsFetching, error: prefsError, refetch: refetchPreferences } = useUserPreferences();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin', { replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading) return <AuthLoader />;
  if (user && prefsLoading) return <DashboardSkeleton />;
  if (!user) return <AuthLoader />;
  if (prefsError) return <PreferencesError busy={prefsFetching} retry={() => { void refetchPreferences(); }} />;

  const shouldShowOnboarding = needsOnboarding && !onboardingDismissed && !prefsLoading;
  if (shouldShowOnboarding) return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;

  return <><Dashboard /><PWAPrompt /></>;
}
