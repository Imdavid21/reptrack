import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-12">Last updated: February 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">What we collect</h2>
            <p className="mb-3">
              Reptrack only collects data you actively enter. We never track you in the background or sell your information.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Account info:</strong> Email address and password (stored securely via authentication services, never in plaintext)</li>
              <li><strong className="text-foreground">Workout data:</strong> Exercises, sets, reps, and weights you log during training sessions</li>
              <li><strong className="text-foreground">Health metrics:</strong> Bodyweight, sleep hours, and calorie intake you choose to track</li>
              <li><strong className="text-foreground">Water intake:</strong> Hydration logs you add throughout the day</li>
              <li><strong className="text-foreground">Food photos:</strong> Meal images you upload for AI calorie analysis (stored securely, only accessible by you)</li>
              <li><strong className="text-foreground">Preferences:</strong> Training split, goals, and display settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">What we never collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Location data</li>
              <li>Contacts or phone data</li>
              <li>Browsing history</li>
              <li>Device identifiers for advertising</li>
              <li>Third-party tracking cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">How we use your data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Show your progress:</strong> Charts, trends, and insights are generated from your logged data</li>
              <li><strong className="text-foreground">AI features:</strong> Food photos are sent to AI models for calorie estimation. The AI does not store your images after processing</li>
              <li><strong className="text-foreground">Coaching tips:</strong> Your workout patterns are analyzed locally and via AI to suggest improvements</li>
              <li><strong className="text-foreground">Account management:</strong> Your email is used solely for login and password resets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">How we protect your data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All data is encrypted in transit (HTTPS/TLS)</li>
              <li>Database access is protected by Row-Level Security. Only you can see your data</li>
              <li>Passwords are hashed and never stored in plaintext</li>
              <li>Food photos are stored in private, authenticated storage buckets</li>
              <li>No analytics or tracking SDKs are embedded in the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Third-party services</h2>
            <p className="mb-3">Reptrack uses the following services to function:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Authentication and database:</strong> Securely managed cloud infrastructure for storing your account and fitness data</li>
              <li><strong className="text-foreground">AI models:</strong> Used for food photo analysis and coaching suggestions. No personal data is retained by AI providers</li>
              <li><strong className="text-foreground">Email delivery:</strong> Used only for password reset and account verification emails</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Your rights</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You can export all your data at any time from the Settings page</li>
              <li>You can delete your account and all associated data</li>
              <li>You can update your email or password at any time</li>
              <li>We will never share or sell your data to third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Data retention</h2>
            <p>
              Your data is kept as long as your account is active. If you delete your account, all data is permanently removed from our systems. We do not keep backups of deleted accounts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Changes to this policy</h2>
            <p>
              If we make meaningful changes to how we handle your data, we will update this page and the date above. We will never retroactively weaken your privacy protections.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
