import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      options: {
        emailRedirectTo: window.location.origin,
      },
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
    // Use Supabase's built-in method which triggers the password reset flow.
    // The custom Resend fallback was removed to prevent anonymous email-spam abuse
    // via the send-auth-email edge function.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { data, error };
  };

  const updateEmail = async (newEmail: string) => {
    // Directly update the email without confirmation
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });
    
    return { data, error };
  };

  const linkOAuthProvider = async (provider: 'google' | 'apple') => {
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

  const unlinkOAuthProvider = async (identityId: string) => {
    const identity = user?.identities?.find(i => i.id === identityId);
    if (!identity) return { error: new Error('Identity not found') };
    
    // Prevent unlinking if it's the only identity (no password set)
    const hasEmailIdentity = user?.identities?.some(i => i.provider === 'email');
    if (!hasEmailIdentity && (user?.identities?.length ?? 0) <= 1) {
      return { error: new Error('Cannot unlink your only sign-in method') };
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);
    return { error };
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
    linkOAuthProvider,
    unlinkOAuthProvider,
  };
}
