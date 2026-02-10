import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    // Use Supabase's built-in method which triggers the password reset flow
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin?type=recovery`,
    });
    
    if (error) return { data, error };

    // Also send via our custom Resend edge function for reliability
    try {
      await supabase.functions.invoke('send-auth-email', {
        body: {
          type: 'password_reset',
          email,
          redirectUrl: `${window.location.origin}/auth?type=recovery`,
        },
      });
    } catch (e) {
      // Silent fail - Supabase's email may have worked
      console.log('Custom email fallback attempted');
    }

    return { data, error };
  };

  const updateEmail = async (newEmail: string) => {
    // Directly update the email without confirmation
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });
    
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const linkOAuthProvider = async (provider: 'google' | 'apple') => {
    // Use linkIdentity to associate the OAuth provider with the current user
    // instead of signInWithOAuth which creates a new user
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: window.location.origin + '/app/settings',
      },
    });
    if (error) {
      return { error };
    }
    return { error: null };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    linkOAuthProvider,
  };
}
