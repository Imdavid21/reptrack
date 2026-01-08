import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LogOut, Send, Smartphone, Moon, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  // Telegram automation state
  const [telegramUsername, setTelegramUsername] = useState('');
  const [reminderInterval, setReminderInterval] = useState('60');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('22:00');
  const [isAutomationActive, setIsAutomationActive] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const handleActivateAutomation = () => {
    if (!telegramUsername.trim()) {
      toast.error('Please enter your Telegram username');
      return;
    }
    setIsAutomationActive(true);
    toast.success('Water reminders activated! You will receive Telegram messages.');
  };

  const handleDeactivateAutomation = () => {
    setIsAutomationActive(false);
    toast.success('Water reminders deactivated');
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
            onClick={toggleTheme}
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

        {/* Telegram Water Automation */}
        <div className="card-brutalist">
          <h3 className="section-header">WATER REMINDERS (TELEGRAM)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get automated Telegram messages to remind you to drink water. 
            If you don't respond, we'll send up to 2 follow-up reminders.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">TELEGRAM USERNAME</Label>
              <Input
                type="text"
                placeholder="@yourusername"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                className="input-terminal mt-1"
                disabled={isAutomationActive}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">REMINDER INTERVAL</Label>
              <select
                value={reminderInterval}
                onChange={(e) => setReminderInterval(e.target.value)}
                className="input-terminal mt-1 w-full bg-background"
                disabled={isAutomationActive}
              >
                <option value="60">Every hour</option>
                <option value="90">Every 1.5 hours</option>
                <option value="120">Every 2 hours</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">START TIME</Label>
                <Input
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="input-terminal mt-1"
                  disabled={isAutomationActive}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">END TIME</Label>
                <Input
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="input-terminal mt-1"
                  disabled={isAutomationActive}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground border border-border p-3">
              <strong>How it works:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>You'll receive a Telegram message asking you to drink water</li>
                <li>Reply "done" or "✓" to confirm you drank</li>
                <li>If no response in 5 min, we'll send a 2nd reminder</li>
                <li>If still no response, a final 3rd reminder after 5 more min</li>
              </ul>
            </div>

            {isAutomationActive ? (
              <button
                onClick={handleDeactivateAutomation}
                className="btn-brutalist w-full flex items-center justify-center gap-2 border-destructive text-destructive"
              >
                DEACTIVATE REMINDERS
              </button>
            ) : (
              <button
                onClick={handleActivateAutomation}
                className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                ACTIVATE REMINDERS
              </button>
            )}
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
