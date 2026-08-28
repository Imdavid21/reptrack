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

export default function AppIndex() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: prefsLoading } = useUserPreferences();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin', { replace: true });
  }, [user, authLoading, navigate]);

  // Auth has no stable app shell yet, so keep this transition minimal.
  if (authLoading) return <AuthLoader />;

  // Once identity is known, render the actual dashboard shape instead of a
  // brand splash. This prevents a second full-screen transition before /app.
  if (user && prefsLoading) return <DashboardSkeleton />;

  if (!user) return <AuthLoader />;

  const shouldShowOnboarding = needsOnboarding && !onboardingDismissed && !prefsLoading;
  if (shouldShowOnboarding) return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;

  return <><Dashboard /><PWAPrompt /></>;
}
