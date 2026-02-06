import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';

export default function AppIndex() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { needsOnboarding, isLoading: prefsLoading } = useUserPreferences();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Hide HTML splash once React is ready
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        try { splash.remove(); } catch (e) {}
      }, 300);
    }
  }, []);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/signin', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Loading state
  if (authLoading || (isAuthenticated && prefsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-widest animate-pulse">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-widest animate-pulse">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </div>
        </div>
      </div>
    );
  }

  // Onboarding flow (only for Supabase users who have preferences)
  const shouldShowOnboarding = user?.provider === 'supabase' && needsOnboarding && !onboardingDismissed && !prefsLoading;

  if (shouldShowOnboarding) {
    return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;
  }

  return <Dashboard />;
}
