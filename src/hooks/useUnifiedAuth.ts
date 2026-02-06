import { useEffect, useState, useMemo } from 'react';
import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AuthProvider = 'clerk' | 'supabase' | null;

export interface UnifiedUser {
  id: string;
  email: string | null;
  provider: AuthProvider;
  // Original user objects for advanced use
  clerkUser?: ReturnType<typeof useClerkUser>['user'];
  supabaseUser?: SupabaseUser;
}

export function useUnifiedAuth() {
  // Clerk auth state
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useClerkUser();
  const { signOut: clerkSignOut } = useClerkAuth();

  // Supabase auth state
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);

  useEffect(() => {
    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setSupabaseLoading(false);
    });

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSupabaseUser(session?.user ?? null);
        setSupabaseLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Unified loading state
  const loading = !clerkLoaded || supabaseLoading;

  // Determine which auth provider is active (Clerk takes priority)
  const unifiedUser: UnifiedUser | null = useMemo(() => {
    if (clerkSignedIn && clerkUser) {
      return {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        provider: 'clerk' as const,
        clerkUser,
      };
    }
    if (supabaseUser) {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? null,
        provider: 'supabase' as const,
        supabaseUser,
      };
    }
    return null;
  }, [clerkSignedIn, clerkUser, supabaseUser]);

  const isAuthenticated = !!unifiedUser;
  const provider = unifiedUser?.provider ?? null;

  // Unified sign out
  const signOut = async () => {
    if (clerkSignedIn) {
      await clerkSignOut();
    }
    if (supabaseUser) {
      await supabase.auth.signOut();
    }
  };

  return {
    user: unifiedUser,
    loading,
    isAuthenticated,
    provider,
    signOut,
    // Expose raw states for components that need specific checks
    clerkUser,
    clerkSignedIn,
    supabaseUser,
  };
}
