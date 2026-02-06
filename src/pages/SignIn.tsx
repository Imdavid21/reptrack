import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { LegacySignIn } from '@/components/auth/LegacySignIn';

const isClerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function SignIn() {
  const [useLegacy, setUseLegacy] = useState(!isClerkAvailable);

  if (useLegacy || !isClerkAvailable) {
    return <LegacySignIn onBack={isClerkAvailable ? () => setUseLegacy(false) : undefined} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold tracking-widest inline-block hover:opacity-80 transition-opacity">
            REPTRACK<span className="text-muted-foreground"> </span>FITNESS
          </Link>
        </div>

        <ClerkSignIn 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-card border border-border shadow-sm rounded-xl",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
              formFieldInput: "bg-background border-border text-foreground",
              formFieldLabel: "text-muted-foreground",
              footerActionLink: "text-primary hover:text-primary/80",
              identityPreviewEditButton: "text-primary",
              formFieldAction: "text-primary",
            },
          }}
          routing="path"
          path="/signin"
          signUpUrl="/signup"
          fallbackRedirectUrl="/app"
        />

        <div className="text-center space-y-3">
          <button
            onClick={() => setUseLegacy(true)}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Use legacy login
          </button>
          
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
