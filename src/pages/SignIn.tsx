import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

type AuthMode = 'signin' | 'forgot' | 'reset';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signIn, resetPassword, updatePassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setMode('reset');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/app', { replace: true });
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setMode('signin');
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const { error } = await updatePassword(password);
        if (error) throw error;
        toast.success('Password updated successfully!');
        navigate('/app', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            {mode === 'forgot' ? 'Reset your password' :
              mode === 'reset' ? 'Enter new password' :
                'Welcome back'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode !== 'reset' && (
              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="mt-1.5 h-14 rounded-2xl border-2 border-border bg-background px-4 text-sm focus:border-foreground transition-colors"
                />
              </div>
            )}

            {(mode === 'signin' || mode === 'reset') && (
              <div>
                <Label className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </Label>
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
            )}

            {mode === 'reset' && (
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-foreground text-background text-sm font-semibold tracking-wide hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Please wait...' :
                mode === 'forgot' ? 'Send Reset Link' :
                mode === 'reset' ? 'Update Password' :
                'Sign In'}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="space-y-3">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('forgot')}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot your password?
              </button>
              <Link
                to="/signup"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors block"
              >
                Don't have an account? Sign up
              </Link>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => setMode('signin')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
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
      </div>
    </div>
  );
}
