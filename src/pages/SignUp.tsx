import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

export default function SignUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error } = await signUp(email, password);
      if (error) throw error;

      toast.success('Account created! Welcome to HEALTH/OS.');
      navigate('/app', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold tracking-widest animate-pulse">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
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
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            CREATE YOUR ACCOUNT
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>Track vitals</span>
            <span>•</span>
            <span>Log workouts</span>
            <span>•</span>
            <span>Analyze trends</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <Label className="text-xs text-muted-foreground">PASSWORD</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="input-terminal mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-brutalist btn-primary w-full py-4"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="space-y-2">
          <Link
            to="/signin"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors block"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
