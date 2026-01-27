import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthForm } from '@/components/auth/AuthForm';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: prefsLoading } = useUserPreferences();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Hide HTML splash once React is ready (backup - MutationObserver in index.html handles this)
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        try { splash.remove(); } catch (e) {}
      }, 300);
    }
  }, []);

  // Loading state - show minimal loader while auth resolves
  if (authLoading || (user && prefsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-widest animate-pulse">
            HEALTH<span className="text-muted-foreground">/</span>OS
          </div>
        </div>
      </div>
    );
  }

  // Auth form
  if (!user) {
    return <AuthForm />;
  }

  // Onboarding flow
  const shouldShowOnboarding = needsOnboarding && !onboardingDismissed && !prefsLoading;
  
  if (shouldShowOnboarding) {
    return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;
  }

  return <Dashboard />;
};

export default Index;
