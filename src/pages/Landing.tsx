import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Dumbbell } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Theme toggle — floating top-right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-sm"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Hero — vertically centered, full viewport */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Icon */}
        <div className="mb-8 p-4 rounded-2xl border border-border/40 bg-card/50">
          <Dumbbell className="w-10 h-10 text-foreground" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4 max-w-lg">
          Train with a plan
          <br />
          <span className="text-muted-foreground">built just for you.</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          Log sets, food, water, and sleep — all in one place.
          Free forever. No app store needed.
        </p>

        {/* Primary CTA */}
        <Link
          to="/signup"
          className="btn-brutalist btn-primary px-10 py-4 text-base font-semibold tracking-wide w-full max-w-xs flex items-center justify-center"
        >
          GET STARTED
        </Link>

        {/* Secondary CTA */}
        <Link
          to="/signin"
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          I already have an account
        </Link>
      </main>

      {/* Footer — minimal */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <Logo size="sm" />
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
