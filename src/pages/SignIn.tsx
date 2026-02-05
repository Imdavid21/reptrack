import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

type AuthMode = 'signin' | 'forgot' | 'reset';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signIn, resetPassword, updatePassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const getTitle = () => {
    switch (mode) {
      case 'forgot': return 'FORGOT PASSWORD';
      case 'reset': return 'SET NEW PASSWORD';
      default: return 'SIGN IN';
    }
  };

  const getButtonText = () => {
    if (loading) return 'LOADING...';
    switch (mode) {
      case 'forgot': return 'SEND RESET LINK';
      case 'reset': return 'UPDATE PASSWORD';
      default: return 'SIGN IN';
    }
  };

  // Show loading while checking auth
  if (authLoading) {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            HEALTH<span className="text-muted-foreground">/</span>OS
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'forgot' ? 'RESET YOUR PASSWORD' :
              mode === 'reset' ? 'ENTER NEW PASSWORD' :
                'WELCOME BACK'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'reset' && (
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
          )}

          {(mode === 'signin' || mode === 'reset') && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {mode === 'reset' ? 'NEW PASSWORD' : 'PASSWORD'}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-terminal mt-1"
              />
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <Label className="text-xs text-muted-foreground">CONFIRM PASSWORD</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-terminal mt-1"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-brutalist btn-primary w-full py-4"
          >
            {getButtonText()}
          </button>
        </form>

        <div className="space-y-2">
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
