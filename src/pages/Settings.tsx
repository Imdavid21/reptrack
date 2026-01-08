import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useWaterReminderConfig } from '@/hooks/useWaterReminderConfig';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Send, Smartphone, Moon, Sun, Loader2, TestTube } from 'lucide-react';
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
      await saveConfig({
        telegram_username: telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`,
        frequency_minutes: parseInt(reminderInterval),
        start_time: startHour,
        end_time: endHour,
        is_active: true,
      });
      toast.success('Water reminders activated! Message @FitTrackWaterBot on Telegram to start.');
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
      const { data, error } = await supabase.functions.invoke('telegram-water-reminder', {
        body: {},
        headers: {},
      });
      
      // Need to call with query param, use fetch directly
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
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">TELEGRAM USERNAME</Label>
                <Input
                  type="text"
                  placeholder="@yourusername"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="input-terminal mt-1"
                  disabled={isActive}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">REMINDER INTERVAL</Label>
                <select
                  value={reminderInterval}
                  onChange={(e) => setReminderInterval(e.target.value)}
                  className="input-terminal mt-1 w-full bg-background"
                  disabled={isActive}
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
                    disabled={isActive}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">END TIME</Label>
                  <Input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="input-terminal mt-1"
                    disabled={isActive}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground border border-border p-3">
                <strong>How it works:</strong>
                <ol className="mt-2 space-y-1 list-decimal list-inside">
                  <li>Message <strong>@FitTrackWaterBot</strong> on Telegram and send <code>/start</code></li>
                  <li>You'll receive reminders during your active hours</li>
                  <li>Reply <strong>done</strong> or <strong>✓</strong> to confirm you drank</li>
                  <li>If no response in 5 min, 2 more follow-up reminders</li>
                </ol>
              </div>

              {isActive && (
                <div className="border border-success/50 bg-success/10 p-3 text-sm">
                  <div className="flex items-center gap-2 text-success">
                    <Send className="h-4 w-4" />
                    <strong>Active</strong>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {config?.telegram_chat_id 
                      ? 'Connected and sending reminders!'
                      : 'Message @FitTrackWaterBot on Telegram to connect.'}
                  </p>
                </div>
              )}

              {isActive ? (
                <div className="space-y-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !config?.telegram_chat_id}
                    className="btn-brutalist w-full flex items-center justify-center gap-2"
                  >
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    SEND TEST MESSAGE
                  </button>
                  <button
                    onClick={handleDeactivateAutomation}
                    disabled={isToggling}
                    className="btn-brutalist w-full flex items-center justify-center gap-2 border-destructive text-destructive"
                  >
                    {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    DEACTIVATE REMINDERS
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleActivateAutomation}
                  disabled={isSaving}
                  className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ACTIVATE REMINDERS
                </button>
              )}
            </div>
          )}
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
