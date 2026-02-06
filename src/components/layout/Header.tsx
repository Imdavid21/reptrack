import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { clerkAppearance, clerkDarkAppearance } from '@/lib/clerkTheme';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, provider, signOut } = useUnifiedAuth();
  const { isDark } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest">{title || 'REPTRACK FITNESS'}</h1>
        
        <div className="flex items-center gap-2">
          {provider === 'clerk' ? (
            <UserButton 
              afterSignOutUrl="/"
              appearance={isDark ? clerkDarkAppearance : clerkAppearance}
            />
          ) : provider === 'supabase' ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={signOut}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
              >
                Sign out
              </button>
            </div>
          ) : (
            <SignedOut>
              <Link 
                to="/signin"
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogIn size={18} />
              </Link>
            </SignedOut>
          )}
        </div>
      </div>
    </header>
  );
}
