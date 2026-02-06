import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';
import { LogIn } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest">{title || 'Reptrack Fitness'}</h1>
        
        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
