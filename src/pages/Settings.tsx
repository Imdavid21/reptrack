import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useWaterReminderConfig } from '@/hooks/useWaterReminderConfig';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Send, Smartphone, Moon, Sun, Loader2, TestTube, ExternalLink, User, Palette, Bell, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { config, isLoading, saveConfig, isSaving, toggleActive, isToggling } = useWaterReminderConfig();
  
  // Telegram automation state
  const [telegramUsername, setTelegramUsername] = useState('');
  const [reminderInterval, setReminderInterval] = useState('60');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('22:00');
  const [isTesting, setIsTesting] = useState(false);

  // Load config when available
  useEffect(() => {
    if (config) {
      setTelegramUsername(config.telegram_username || '');
      setReminderInterval(config.frequency_minutes?.toString() || '60');
      setStartHour(config.start_time || '08:00');
      setEndHour(config.end_time || '22:00');
    }
  }, [config]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const handleActivateAutomation = async () => {
    if (!telegramUsername.trim()) {
      toast.error('Please enter your Telegram username');
      return;
    }

    try {
      // Auto-setup webhook in background
      fetch(
        `https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/telegram-water-reminder?action=setup-webhook`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      ).catch(() => {}); // Silent fail, webhook may already be set

      await saveConfig({
        telegram_username: telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`,
        frequency_minutes: parseInt(reminderInterval),
        start_time: startHour,
        end_time: endHour,
        is_active: true,
      });
      toast.success('Water reminders activated! Click the link to start the bot.');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleDeactivateAutomation = async () => {
    try {
      await toggleActive(false);
      toast.success('Water reminders deactivated');
    } catch (error) {
      toast.error('Failed to deactivate');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/telegram-water-reminder?action=test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Test message sent! Check your Telegram.');
      } else {
        toast.error(result.error || 'Failed to send test message');
      }
    } catch (error) {
      toast.error('Failed to send test message');
    } finally {
      setIsTesting(false);
    }
  };

  const isActive = config?.is_active || false;

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 animate-fade-in">
        {/* Account */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Account</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="btn-premium btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Palette className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground">Customize your experience</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-premium btn-secondary w-full flex items-center justify-center gap-2"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Switch to Dark Mode
              </>
            )}
          </button>
        </div>

        {/* Telegram Water Automation */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold">Water Reminders</h3>
              <p className="text-sm text-muted-foreground">Telegram automation</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Telegram Username</Label>
                <Input
                  type="text"
                  placeholder="@yourusername"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="input-premium mt-2"
                  disabled={isActive}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-medium">Reminder Interval</Label>
                <select
                  value={reminderInterval}
                  onChange={(e) => setReminderInterval(e.target.value)}
                  className="input-premium mt-2 w-full bg-background"
                  disabled={isActive}
                >
                  <option value="60">Every hour</option>
                  <option value="90">Every 1.5 hours</option>
                  <option value="120">Every 2 hours</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="input-premium mt-2"
                    disabled={isActive}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="input-premium mt-2"
                    disabled={isActive}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                <strong className="text-foreground">How it works</strong>
                <ol className="mt-2 space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">1.</span>
                    Click "Activate" below
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">2.</span>
                    <span>
                      <a 
                        href="https://t.me/timeto_drinkwater_bot?start=1" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        Open @timeto_drinkwater_bot <ExternalLink className="h-3 w-3" />
                      </a> and press /start
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">3.</span>
                    Receive reminders during active hours
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">4.</span>
                    Reply <strong className="text-foreground">done</strong> or ✓ to confirm
                  </li>
                </ol>
              </div>

              {isActive && (
                <div className="rounded-xl bg-success/10 border border-success/20 p-4">
                  <div className="flex items-center gap-2 text-success font-medium">
                    <Send className="h-4 w-4" />
                    Active
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {config?.telegram_chat_id 
                      ? 'Connected and sending reminders!'
                      : (
                        <a 
                          href="https://t.me/timeto_drinkwater_bot?start=1" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          Click here to start the bot <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                  </p>
                </div>
              )}

              {isActive ? (
                <div className="space-y-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !config?.telegram_chat_id}
                    className="btn-premium btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    Send Test Message
                  </button>
                  <button
                    onClick={handleDeactivateAutomation}
                    disabled={isToggling}
                    className="btn-premium w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                  >
                    {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Deactivate Reminders
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleActivateAutomation}
                  disabled={isSaving}
                  className="btn-premium btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Activate Reminders
                </button>
              )}
            </div>
          )}
        </div>

        {/* iOS Shortcuts */}
        <div className="card-premium">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold">iOS Shortcuts</h3>
              <p className="text-sm text-muted-foreground">One-tap to add shortcuts</p>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Workout&input=text&text=fitnesstrack://log-workout?day=1"
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏋️</span>
                <div>
                  <div className="font-medium">Log Workout</div>
                  <div className="text-xs text-muted-foreground">Say "Hey Siri, log workout"</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>

            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Water&input=text&text=fitnesstrack://log-water?amount=0.25"
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💧</span>
                <div>
                  <div className="font-medium">Log 250ml Water</div>
                  <div className="text-xs text-muted-foreground">Say "Hey Siri, log water"</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>

            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Water%20Large&input=text&text=fitnesstrack://log-water?amount=0.5"
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧴</span>
                <div>
                  <div className="font-medium">Log 500ml Water</div>
                  <div className="text-xs text-muted-foreground">Quick-log a full bottle</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Tap on your iPhone to add shortcuts
          </p>
        </div>

        {/* Version */}
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            FitTrack v1.0.0
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            12 Week Transformation
          </p>
        </div>
      </div>
    </MainLayout>
  );
}