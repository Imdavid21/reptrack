import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useWaterReminderConfig } from '@/hooks/useWaterReminderConfig';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { config, isLoading, saveConfig, isSaving, toggleActive, isToggling } = useWaterReminderConfig();
  
  const [telegramUsername, setTelegramUsername] = useState('');
  const [reminderInterval, setReminderInterval] = useState('60');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('22:00');
  const [isTesting, setIsTesting] = useState(false);

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
      toast.error('Enter your Telegram username');
      return;
    }

    try {
      fetch(
        `https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/telegram-water-reminder?action=setup-webhook`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      ).catch(() => {});

      await saveConfig({
        telegram_username: telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`,
        frequency_minutes: parseInt(reminderInterval),
        start_time: startHour,
        end_time: endHour,
        is_active: true,
      });
      toast.success('Activated');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDeactivateAutomation = async () => {
    try {
      await toggleActive(false);
      toast.success('Deactivated');
    } catch (error) {
      toast.error('Failed');
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
        toast.success('Test sent');
      } else {
        toast.error(result.error || 'Failed');
      }
    } catch (error) {
      toast.error('Failed');
    } finally {
      setIsTesting(false);
    }
  };

  const isActive = config?.is_active || false;

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 animate-fade-in">
        {/* Account */}
        <div className="border border-border rounded-lg p-5">
          <div className="text-sm text-muted-foreground mb-1">Account</div>
          <div className="font-medium mb-4">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="w-full p-3 border border-border rounded-lg text-sm font-medium active:opacity-70"
          >
            Sign Out
          </button>
        </div>

        {/* Theme */}
        <div className="border border-border rounded-lg p-5">
          <div className="text-sm text-muted-foreground mb-3">Appearance</div>
          <button
            onClick={toggleTheme}
            className="w-full p-3 border border-border rounded-lg text-sm font-medium active:opacity-70"
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Water Reminders */}
        <div className="border border-border rounded-lg p-5">
          <div className="text-sm text-muted-foreground mb-4">Water Reminders</div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Telegram</Label>
                <Input
                  type="text"
                  placeholder="@username"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="mt-1.5 bg-background"
                  disabled={isActive}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Interval</Label>
                <select
                  value={reminderInterval}
                  onChange={(e) => setReminderInterval(e.target.value)}
                  className="mt-1.5 w-full p-3 border border-border rounded-lg bg-background text-sm"
                  disabled={isActive}
                >
                  <option value="60">Every hour</option>
                  <option value="90">Every 1.5 hours</option>
                  <option value="120">Every 2 hours</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="mt-1.5 bg-background"
                    disabled={isActive}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="mt-1.5 bg-background"
                    disabled={isActive}
                  />
                </div>
              </div>

              {!isActive && (
                <a 
                  href="https://t.me/timeto_drinkwater_bot?start=1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border border-border rounded-lg text-sm"
                >
                  <span>Open bot first</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </a>
              )}

              {isActive && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {config?.telegram_chat_id 
                    ? 'Connected'
                    : (
                      <a 
                        href="https://t.me/timeto_drinkwater_bot?start=1" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        Start bot <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                </div>
              )}

              {isActive ? (
                <div className="space-y-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !config?.telegram_chat_id}
                    className="w-full p-3 border border-border rounded-lg text-sm font-medium active:opacity-70 disabled:opacity-50"
                  >
                    {isTesting ? 'Sending...' : 'Test'}
                  </button>
                  <button
                    onClick={handleDeactivateAutomation}
                    disabled={isToggling}
                    className="w-full p-3 border border-border rounded-lg text-sm font-medium active:opacity-70"
                  >
                    Deactivate
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleActivateAutomation}
                  disabled={isSaving}
                  className="w-full p-3 bg-foreground text-background rounded-lg text-sm font-medium active:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Activate'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* iOS Shortcuts */}
        <div className="border border-border rounded-lg p-5">
          <div className="text-sm text-muted-foreground mb-4">iOS Shortcuts</div>

          <div className="space-y-2">
            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Workout&input=text&text=fitnesstrack://log-workout?day=1"
              className="flex items-center justify-between p-3 border border-border rounded-lg text-sm"
            >
              <span>Log Workout</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </a>

            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Water&input=text&text=fitnesstrack://log-water?amount=0.25"
              className="flex items-center justify-between p-3 border border-border rounded-lg text-sm"
            >
              <span>Log 250ml</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </a>

            <a
              href="shortcuts://x-callback-url/run-shortcut?name=Log%20Water%20Large&input=text&text=fitnesstrack://log-water?amount=0.5"
              className="flex items-center justify-between p-3 border border-border rounded-lg text-sm"
            >
              <span>Log 500ml</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">v1.0</p>
        </div>
      </div>
    </MainLayout>
  );
}