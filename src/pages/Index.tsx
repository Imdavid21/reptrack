import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AuthForm } from '@/components/auth/AuthForm';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: prefsLoading } = useUserPreferences();

  // Loading state - minimal, no splash
  if (authLoading || (user && prefsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center font-mono">
          <div className="text-sm text-muted-foreground">LOADING...</div>
        </div>
      </div>
    );
  }

  // Auth form
  if (!user) {
    return <AuthForm />;
  }

  return <Dashboard />;
};

export default Index;
