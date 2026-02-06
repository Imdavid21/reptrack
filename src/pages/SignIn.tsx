import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignIn as ClerkSignIn, useUser } from '@clerk/clerk-react';
import { LegacySignIn } from '@/components/auth/LegacySignIn';
import { clerkAppearance, clerkDarkAppearance } from '@/lib/clerkTheme';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

export default function SignIn() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();
  const { isDark } = useTheme();
  const [useLegacy, setUseLegacy] = useState(false);

  // Redirect if already signed in with Clerk
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/app', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (useLegacy) {
    return <LegacySignIn onBack={() => setUseLegacy(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
            Sign in to continue
          </p>
        </div>

        <ClerkSignIn 
          appearance={isDark ? clerkDarkAppearance : clerkAppearance}
          routing="path"
          path="/signin"
          signUpUrl="/signup"
          fallbackRedirectUrl="/app"
        />

        <div className="text-center space-y-4 pt-4">
          <button
            onClick={() => setUseLegacy(true)}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Existing user? Use legacy login
          </button>
          
          <div className="flex items-center gap-3 justify-center">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>
          
          <Link
            to="/signup"
            className="btn-brutalist btn-accent w-full py-3 block text-center"
          >
            CREATE ACCOUNT
          </Link>
          
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors block"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
