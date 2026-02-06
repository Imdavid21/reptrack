import { SignedIn, SignedOut, UserButton, SignInButton, useClerk } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

// Check if Clerk is available
const isClerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest">{title || 'Reptrack Fitness'}</h1>
        
        <div className="flex items-center gap-2">
          {isClerkAvailable ? (
            <>
              <SignedIn>
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
              </SignedIn>
              <SignedOut>
                <SignInButton mode="redirect">
                  <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <LogIn size={18} />
                  </button>
                </SignInButton>
              </SignedOut>
            </>
          ) : (
            <Link 
              to="/signin"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <LogIn size={18} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
