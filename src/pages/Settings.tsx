import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useWaterReminderConfig } from '@/hooks/useWaterReminderConfig';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Send, Smartphone, Moon, Sun, Loader2, TestTube, ExternalLink, Mail, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { config, isLoading, saveConfig, isSaving, toggleActive, isToggling } = useWaterReminderConfig();
  
  // Account management state
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
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
              <div className="text-xs text-muted-foreground">CURRENT EMAIL</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            
            {/* Change Email */}
            <div className="border border-border p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                CHANGE EMAIL
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">NEW EMAIL ADDRESS</Label>
                <Input
                  type="email"
                  placeholder="newemail@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-terminal mt-1"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newEmail.trim()) {
                    toast.error('Please enter a new email address');
                    return;
                  }
                  setIsUpdatingEmail(true);
                  try {
                    const { error } = await updateEmail(newEmail);
                    if (error) throw error;
                    toast.success('Confirmation email sent to both addresses. Please check your inbox.');
                    setNewEmail('');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to update email');
                  } finally {
                    setIsUpdatingEmail(false);
                  }
                }}
                disabled={isUpdatingEmail || !newEmail.trim()}
                className="btn-brutalist w-full flex items-center justify-center gap-2"
              >
                {isUpdatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                UPDATE EMAIL
              </button>
            </div>

            {/* Reset Password */}
            <div className="border border-border p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                CHANGE PASSWORD
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send a password reset link to your current email address.
              </p>
              <button
                onClick={async () => {
                  if (!user?.email) return;
                  setIsResettingPassword(true);
                  try {
                    const { error } = await resetPassword(user.email);
                    if (error) throw error;
                    toast.success('Password reset email sent! Check your inbox.');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to send reset email');
                  } finally {
                    setIsResettingPassword(false);
                  }
                }}
                disabled={isResettingPassword}
                className="btn-brutalist w-full flex items-center justify-center gap-2"
              >
                {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                SEND RESET LINK
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="btn-brutalist w-full flex items-center justify-center gap-2 border-destructive text-destructive"
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
                  <li>Click "Activate Reminders" below</li>
                  <li>
                    <a 
                      href="https://t.me/timeto_drinkwater_bot?start=1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline inline-flex items-center gap-1"
                    >
                      Click here to open @timeto_drinkwater_bot <ExternalLink className="h-3 w-3" />
                    </a> and press <code>/start</code>
                  </li>
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
                      : (
                        <a 
                          href="https://t.me/timeto_drinkwater_bot?start=1" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          Click here to start @timeto_drinkwater_bot <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
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

        {/* Add to Home Screen */}
        <div className="card-brutalist">
          <h3 className="section-header">ADD TO HOME SCREEN</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Install FitTrack as an app on your iPhone for instant access.
          </p>

          <div className="border border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div>
                <div className="font-medium">Tap the Share button</div>
                <p className="text-xs text-muted-foreground">
                  In Safari, tap the share icon (square with arrow) at the bottom of the screen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <div>
                <div className="font-medium">Select "Add to Home Screen"</div>
                <p className="text-xs text-muted-foreground">
                  Scroll down in the share sheet and tap "Add to Home Screen"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div>
                <div className="font-medium">Tap "Add"</div>
                <p className="text-xs text-muted-foreground">
                  Confirm the name and tap Add in the top right corner
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center border border-dashed border-border p-3">
            <Smartphone className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">
              Once installed, open FitTrack from your home screen for a full-screen app experience
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
