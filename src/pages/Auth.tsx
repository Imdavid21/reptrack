import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

type AuthStep = 'email' | 'password' | 'forgot' | 'reset';
type AccountStatus = 'unknown' | 'existing' | 'new';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signIn, signUp, resetPassword, updatePassword } = useAuth();

  const [step, setStep] = useState<AuthStep>('email');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('unknown');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check for recovery mode from URL
  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setStep('reset');
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_input: email.trim(),
      });
      if (error) throw error;
      setAccountStatus(data ? 'existing' : 'new');
    } catch {
      // Fallback: treat as unknown so the flow still works
      setAccountStatus('unknown');
    } finally {
      setLoading(false);
    }
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    try {
      if (accountStatus === 'new') {
        // Email doesn't exist — create account
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Account created! Welcome to Reptrack.');
        localStorage.setItem('just_signed_up', 'true');
        navigate('/app', { replace: true });
      } else {
        // Email exists — sign in
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.toLowerCase().includes('invalid')) {
            toast.error('Wrong password. Try again or reset it below.');
          } else {
            throw error;
          }
        } else {
          toast.success('Welcome back!');
          navigate('/app', { replace: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      toast.success('Reset link sent! Check your email.');
      setStep('password');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      toast.success('Password updated!');
      navigate('/app', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const switchToNewAccount = () => {
    setAccountStatus('new');
    setPassword('');
  };

  const goBackToEmail = () => {
    setStep('email');
    setAccountStatus('unknown');
    setPassword('');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold tracking-widest animate-pulse">
          REPTRACK<span className="text-muted-foreground"> </span>FITNESS
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            {step === 'email' && 'ENTER YOUR EMAIL TO GET STARTED'}
            {step === 'password' && accountStatus === 'new' && 'CREATE A PASSWORD'}
            {step === 'password' && accountStatus !== 'new' && 'ENTER YOUR PASSWORD'}
            {step === 'forgot' && 'RESET YOUR PASSWORD'}
            {step === 'reset' && 'SET A NEW PASSWORD'}
          </p>
        </div>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="btn-brutalist w-full py-4 border border-border bg-background text-foreground hover:bg-accent flex items-center justify-center gap-3 text-sm font-semibold tracking-wide"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
              </button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">EMAIL</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="input-terminal mt-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brutalist btn-primary w-full py-4"
                >
                  {loading ? 'CHECKING...' : 'CONTINUE WITH EMAIL'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Password (sign in or sign up) */}
          {step === 'password' && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
            >
              {/* Show email as a chip */}
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-muted text-sm truncate">
                  {email}
                </div>
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  {accountStatus === 'new' ? 'CREATE A PASSWORD' : 'PASSWORD'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    minLength={6}
                    className="input-terminal mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {accountStatus === 'new' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 6 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutalist btn-primary w-full py-4"
              >
                {loading
                  ? 'PLEASE WAIT...'
                  : accountStatus === 'new'
                    ? 'CREATE ACCOUNT'
                    : 'SIGN IN'
                }
              </button>
            </motion.form>
          )}

          {/* Forgot password */}
          {step === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleForgotSubmit}
              className="space-y-4"
            >
              <div>
                <Label className="text-xs text-muted-foreground">EMAIL</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-terminal mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutalist btn-primary w-full py-4"
              >
                {loading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </motion.form>
          )}

          {/* Reset password */}
          {step === 'reset' && (
            <motion.form
              key="reset"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleResetSubmit}
              className="space-y-4"
            >
              <div>
                <Label className="text-xs text-muted-foreground">NEW PASSWORD</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input-terminal mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CONFIRM PASSWORD</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input-terminal mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutalist btn-primary w-full py-4"
              >
                {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Bottom actions */}
        <div className="space-y-2">
          {step === 'password' && accountStatus !== 'new' && (
            <>
              <button
                onClick={() => setStep('forgot')}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
              <button
                onClick={goBackToEmail}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Not you? Use a different email
              </button>
            </>
          )}

          {step === 'password' && accountStatus === 'new' && (
            <button
              onClick={goBackToEmail}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Wrong email? Try again
            </button>
          )}

          {(step === 'forgot' || step === 'reset') && (
            <button
              onClick={() => setStep(email ? 'password' : 'email')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>

        {accountStatus === 'new' && (
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
}
