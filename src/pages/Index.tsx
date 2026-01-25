import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthForm } from '@/components/auth/AuthForm';
import { SplashScreen } from '@/components/splash/SplashScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: prefsLoading } = useUserPreferences();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show splash on initial load
  useEffect(() => {
    // Check if this is a fresh page load (not a navigation)
    const hasSeenSplash = sessionStorage.getItem('splashShown');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  // Show onboarding after auth and prefs load
  useEffect(() => {
    if (!authLoading && !prefsLoading && user && needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [authLoading, prefsLoading, user, needsOnboarding]);

  // Splash screen
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Loading state
  if (authLoading || (user && prefsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-widest animate-pulse">
            HEALTH<span className="text-muted-foreground">/</span>OS
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Loading...
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
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return <Dashboard />;
};

export default Index;
