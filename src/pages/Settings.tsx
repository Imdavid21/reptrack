import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Droplets, Smartphone, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('light');
    } else {
      html.classList.add('light');
    }
  }, [isDark]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  return (
    <MainLayout title="SETTINGS">
      <div className="space-y-6 animate-fade-in">
        {/* Account */}
        <div className="card-brutalist">
          <h3 className="section-header">ACCOUNT</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">EMAIL</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="card-brutalist">
          <h3 className="section-header">APPEARANCE</h3>
          <button
            onClick={() => setIsDark(!isDark)}
            className="btn-brutalist w-full flex items-center justify-center gap-2"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" />
                SWITCH TO LIGHT MODE
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                SWITCH TO DARK MODE
              </>
            )}
          </button>
        </div>

        {/* Water Automation */}
        <div className="card-brutalist">
          <h3 className="section-header">WATER AUTOMATION</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get automated calls to remind you to drink water throughout the day.
          </p>
          <div className="text-center py-6 border border-border bg-muted/20">
            <Droplets className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Water automation requires additional setup
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Twilio integration coming soon
            </p>
          </div>
        </div>

        {/* iOS Shortcuts */}
        <div className="card-brutalist">
          <h3 className="section-header">IOS SHORTCUTS</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use iOS Shortcuts to quickly log workouts and water intake.
          </p>

          <div className="space-y-4">
            <div className="border border-border p-4">
              <div className="font-bold mb-2">Quick Log Workout</div>
              <p className="text-xs text-muted-foreground mb-3">
                Opens the app and pre-selects today's workout
              </p>
              <code className="text-xs bg-muted px-2 py-1 block break-all">
                fitnesstrack://log-workout?day=1
              </code>
            </div>

            <div className="border border-border p-4">
              <div className="font-bold mb-2">Quick Log Water</div>
              <p className="text-xs text-muted-foreground mb-3">
                Instantly log 250ml of water
              </p>
              <code className="text-xs bg-muted px-2 py-1 block break-all">
                fitnesstrack://log-water?amount=0.25
              </code>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Smartphone className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              Copy URLs and add to iOS Shortcuts app
            </p>
          </div>
        </div>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground py-4">
          FITTRACK v1.0.0 • 12-WEEK TRANSFORMATION
        </div>
      </div>
    </MainLayout>
  );
}
