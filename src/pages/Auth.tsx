import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
            <motion.form
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleEmailContinue}
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
                  autoFocus
                  className="input-terminal mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-brutalist btn-primary w-full py-4"
              >
                {loading ? 'CHECKING...' : 'CONTINUE'}
              </button>
            </motion.form>
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
                onClick={switchToNewAccount}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                New here? Create an account
              </button>
            </>
          )}

          {step === 'password' && accountStatus === 'new' && (
            <button
              onClick={() => { setAccountStatus('unknown'); setPassword(''); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
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
