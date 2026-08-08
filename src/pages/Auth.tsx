import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

type AuthStep = 'email' | 'password' | 'forgot' | 'reset';
type AccountStatus = 'unknown' | 'existing' | 'new';
type AuthMethod = 'google' | 'apple' | 'email';

const LAST_AUTH_KEY = 'reptrack_last_auth_method';

function getPasswordStrength(pw: string): { label: string; color: string; percent: number } {
  if (pw.length === 0) return { label: '', color: '', percent: 0 };
  const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNum = /\d/.test(pw);
  if (pw.length >= 10 && hasMixed && hasNum) return { label: 'Strong', color: 'bg-energy', percent: 100 };
  if (pw.length >= 8) return { label: 'Medium', color: 'bg-fuel', percent: 66 };
  return { label: 'Weak', color: 'bg-destructive', percent: 33 };
}

function LastUsedBadge() {
  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      Last used
    </span>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const { user, loading: authLoading, signIn, signUp, resetPassword, updatePassword } = useAuth();

  const [step, setStep] = useState<AuthStep>('email');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('unknown');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [lastMethod, setLastMethod] = useState<AuthMethod | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_AUTH_KEY) as AuthMethod | null;
    if (saved) setLastMethod(saved);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setStep('reset');
    }
  }, [searchParams]);

  const saveLastMethod = (method: AuthMethod) => {
    localStorage.setItem(LAST_AUTH_KEY, method);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
      saveLastMethod('google');
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setEmail(normalizedEmail);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_input: normalizedEmail,
      });
      if (error) throw error;
      setAccountStatus(data ? 'existing' : 'new');
      setStep('password');
    } catch (error) {
      // Never silently turn a failed account lookup into a sign-in attempt.
      // Respect the route the user deliberately chose and keep the error visible.
      const intendedStatus = location.pathname === '/signup' ? 'new' : 'existing';
      setAccountStatus(intendedStatus);
      setStep('password');
      console.error('Unable to check account status:', error);
      toast.error(
        intendedStatus === 'new'
          ? 'Account check was interrupted. You can still create your account.'
          : 'Account check was interrupted. You can still try signing in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = accountStatus === 'new';
    if (password.length < (isNew ? 8 : 6)) {
      toast.error(isNew ? 'Password must be at least 8 characters' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      if (isNew) {
        const { data, error } = await signUp(email, password);
        if (error) {
          const msg = error.message?.toLowerCase() ?? '';
          if (msg.includes('weak') || msg.includes('pwned')) {
            toast.error('That password has appeared in a data breach. Pick a different one.');
          } else if (msg.includes('already registered') || msg.includes('already been registered')) {
            toast.error('An account already exists for this email. Try signing in.');
            setAccountStatus('existing');
          } else {
            throw error;
          }
        } else if (data.session?.user) {
          toast.success('Account created! Welcome to Reptrack.');
          localStorage.setItem('just_signed_up', 'true');
          saveLastMethod('email');
          navigate('/app', { replace: true });
        } else {
          // Email confirmation may be enabled in another environment. Do not
          // claim the user is signed in or send them into a protected route.
          toast.success('Account created. Check your email to confirm it, then sign in.');
          saveLastMethod('email');
          setAccountStatus('existing');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.toLowerCase().includes('invalid')) {
            toast.error('Wrong password. Try again or reset it below.');
          } else {
            throw error;
          }
        } else {
          toast.success('Welcome back!');
          saveLastMethod('email');
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

  const goBackToEmail = () => {
    setStep('email');
    setAccountStatus('unknown');
    setPassword('');
  };

  const strength = getPasswordStrength(password);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold tracking-widest animate-pulse">
          REPTRACK<span className="text-muted-foreground"> </span>FITNESS
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 p-2.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95 z-50 shadow-sm"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <motion.div
        className="w-full max-w-sm space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'password' && accountStatus === 'new' && 'Create a password'}
            {step === 'password' && accountStatus !== 'new' && 'Welcome back'}
            {step === 'forgot' && 'Reset your password'}
            {step === 'reset' && 'Set a new password'}
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Google Sign In */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-14 rounded-2xl border-2 border-border bg-background text-foreground hover:bg-accent/50 flex items-center justify-center gap-3 text-sm font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </button>
                {lastMethod === 'google' && (
                  <div className="flex justify-center mt-1"><LastUsedBadge /></div>
                )}
              </div>

              {/* Apple Sign In */}
              <div className="relative">
                <button
                  type="button"
                  onClick={async () => {
                    setAppleLoading(true);
                    try {
                      const { error } = await lovable.auth.signInWithOAuth("apple", {
                        redirect_uri: window.location.origin,
                      });
                      if (error) throw error;
                      saveLastMethod('apple');
                    } catch (error: any) {
                      toast.error(error.message || 'Apple sign-in failed');
                    } finally {
                      setAppleLoading(false);
                    }
                  }}
                  disabled={appleLoading}
                  className="w-full h-14 rounded-2xl border-2 border-border bg-background text-foreground hover:bg-accent/50 flex items-center justify-center gap-3 text-sm font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {appleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  {appleLoading ? 'Signing in...' : 'Continue with Apple'}
                </button>
                {lastMethod === 'apple' && (
                  <div className="flex justify-center mt-1"><LastUsedBadge /></div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="relative">
                  <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="h-14 rounded-2xl border-2 border-border bg-background pl-11 pr-4 text-sm focus:border-foreground transition-colors"
                    />
                  </div>
                  {lastMethod === 'email' && (
                    <div className="flex mt-1"><LastUsedBadge /></div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-foreground text-background text-sm font-semibold tracking-wide hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Checking...' : 'Continue with Email'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <motion.form
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 rounded-2xl bg-muted text-sm truncate flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  {email}
                </div>
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2"
                >
                  Change
                </button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
                  {accountStatus === 'new' ? 'Create a password' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    minLength={accountStatus === 'new' ? 8 : 6}
                    className="mt-1.5 h-14 rounded-2xl border-2 border-border bg-background px-4 pr-12 text-sm focus:border-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {accountStatus === 'new' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{strength.label} password</p>
                  </div>
                )}
                {accountStatus === 'new' && password.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">Minimum 8 characters</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-foreground text-background text-sm font-semibold tracking-wide hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? 'Please wait...'
                  : accountStatus === 'new'
                    ? 'Create Account'
                    : 'Sign In'
                }
              </button>
            </motion.form>
          )}

          {/* Forgot password */}
          {step === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotSubmit}
              className="space-y-4"
            >
              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-14 rounded-2xl border-2 border-border bg-background pl-11 pr-4 text-sm focus:border-foreground transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-foreground text-background text-sm font-semibold tracking-wide hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </motion.form>
          )}

          {/* Reset password */}
          {step === 'reset' && (
            <motion.form
              key="reset"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleResetSubmit}
              className="space-y-4"
            >
              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="mt-1.5 h-14 rounded-2xl border-2 border-border bg-background px-4 pr-12 text-sm focus:border-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="mt-1.5 h-14 rounded-2xl border-2 border-border bg-background px-4 pr-12 text-sm focus:border-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 mt-0.5 z-10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-foreground text-background text-sm font-semibold tracking-wide hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        </motion.div>

        {/* Bottom actions */}
        <motion.div variants={itemVariants} className="space-y-3">
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
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to home
            </Link>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
