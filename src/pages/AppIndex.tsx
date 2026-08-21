import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';

import { PWAPrompt } from '@/components/pwa/PWAPrompt';

export default function AppIndex() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: prefsLoading } = useUserPreferences();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Loading state - show minimal loader while auth resolves
  if (authLoading || (user && prefsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight animate-pulse">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight animate-pulse">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </div>
        </div>
      </div>
    );
  }

  // Onboarding flow
  const shouldShowOnboarding = needsOnboarding && !onboardingDismissed && !prefsLoading;

  if (shouldShowOnboarding) {
    return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;
  }

  return (
    <>
      <Dashboard />
      <PWAPrompt />
    </>
  );
}
