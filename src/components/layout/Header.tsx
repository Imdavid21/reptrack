import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, provider, signOut } = useUnifiedAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest">{title || 'Reptrack Fitness'}</h1>
        
        <div className="flex items-center gap-2">
          {provider === 'clerk' ? (
            // Clerk user - show UserButton
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-card border border-border",
                  userButtonPopoverActionButton: "text-foreground hover:bg-muted",
                  userButtonPopoverActionButtonText: "text-foreground",
                  userButtonPopoverFooter: "hidden",
                }
              }}
            />
          ) : provider === 'supabase' ? (
            // Supabase user - show email initial and sign out
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={signOut}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            // Not signed in
            <SignedOut>
              <SignInButton mode="redirect">
                <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <LogIn size={18} />
                </button>
              </SignInButton>
            </SignedOut>
          )}
        </div>
      </div>
    </header>
  );
}
