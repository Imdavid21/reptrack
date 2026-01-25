import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useWaterReminderConfig } from '@/hooks/useWaterReminderConfig';
import { supabase } from '@/integrations/supabase/client';
import { 
  LogOut, Send, Smartphone, Moon, Sun, Loader2, TestTube, ExternalLink, 
  Mail, Key, Droplets, Utensils, Scale, ChevronRight, Settings2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/layout/Logo';
import { ProfileSection } from '@/components/settings/ProfileSection';

export default function Settings() {
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { config, isLoading, saveConfig, isSaving, toggleActive, isToggling } = useWaterReminderConfig();
  
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
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
  
  // Telegram logging options
  const [waterLogging, setWaterLogging] = useState(true);
  const [mealLogging, setMealLogging] = useState(false);
  const [weightLogging, setWeightLogging] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      toast.success('Telegram automation activated!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleDeactivateAutomation = async () => {
    try {
      await toggleActive(false);
      toast.success('Telegram automation deactivated');
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
    <MainLayout title="SETTINGS">
      <div className="space-y-4 animate-fade-in pb-8">
        
        {/* Profile Section */}
        <ProfileSection 
          isExpanded={expandedSections.profile || false}
          onToggle={() => toggleSection('profile')}
        />
        
        {/* Telegram Automation - Primary Section */}
        <div className="card-brutalist">
          <h3 className="section-header flex items-center gap-2">
            <Send className="h-4 w-4" />
            TELEGRAM AUTOMATION
          </h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Status */}
              {isActive && (
                <div className={cn(
                  "border p-3 text-sm",
                  config?.telegram_chat_id 
                    ? "border-success/50 bg-success/10" 
                    : "border-warning/50 bg-warning/10"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 font-medium",
                    config?.telegram_chat_id ? "text-success" : "text-warning"
                  )}>
                    <Send className="h-4 w-4" />
                    {config?.telegram_chat_id ? 'Connected' : 'Pending Connection'}
                  </div>
                  {!config?.telegram_chat_id && (
                    <a 
                      href="https://t.me/timeto_drinkwater_bot?start=1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline inline-flex items-center gap-1 mt-1"
                    >
                      Start bot to connect <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Username */}
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

              {/* Logging Features Toggle */}
              <Collapsible open={expandedSections.logging} onOpenChange={() => toggleSection('logging')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b border-border">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    LOGGING FEATURES
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", expandedSections.logging && "rotate-90")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  {/* Water Logging */}
                  <div className="flex items-center justify-between p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <Droplets className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">Water Reminders</div>
                        <div className="text-xs text-muted-foreground">Get reminded to drink water</div>
                      </div>
                    </div>
                    <Switch checked={waterLogging} onCheckedChange={setWaterLogging} />
                  </div>

                  {/* Meal Logging */}
                  <div className="flex items-center justify-between p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <Utensils className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">Meal Logging</div>
                        <div className="text-xs text-muted-foreground">Log meals via photo or text</div>
                      </div>
                    </div>
                    <Switch checked={mealLogging} onCheckedChange={setMealLogging} />
                  </div>

                  {/* Weight Logging */}
                  <div className="flex items-center justify-between p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">Weight Logging</div>
                        <div className="text-xs text-muted-foreground">Log weight via Telegram</div>
                      </div>
                    </div>
                    <Switch checked={weightLogging} onCheckedChange={setWeightLogging} />
                  </div>

                  <div className="text-xs text-muted-foreground border border-dashed border-border p-3">
                    <strong>Commands:</strong>
                    <ul className="mt-2 space-y-1">
                      {waterLogging && <li>• <code>done</code> or <code>✓</code> - Log 250ml water</li>}
                      {mealLogging && <li>• <code>meal [food] [calories]</code> - Log a meal</li>}
                      {mealLogging && <li>• Send a photo to analyze food with AI</li>}
                      {weightLogging && <li>• <code>weight [kg]</code> - Log your weight</li>}
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Water Reminder Settings */}
              {waterLogging && (
                <Collapsible open={expandedSections.waterSchedule} onOpenChange={() => toggleSection('waterSchedule')}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-b border-border">
                    <span className="flex items-center gap-2">
                      <Droplets className="h-4 w-4" />
                      WATER REMINDER SCHEDULE
                    </span>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", expandedSections.waterSchedule && "rotate-90")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">REMINDER INTERVAL</Label>
                      <select
                        value={reminderInterval}
                        onChange={(e) => setReminderInterval(e.target.value)}
                        className="input-terminal mt-1 w-full bg-background"
                        disabled={isActive}
                      >
                        <option value="30">Every 30 minutes</option>
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
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Action Buttons */}
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
                    DEACTIVATE
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground border border-border p-3">
                    <strong>Setup:</strong>
                    <ol className="mt-2 space-y-1 list-decimal list-inside">
                      <li>Enter your Telegram username above</li>
                      <li>Click "Activate"</li>
                      <li>
                        <a 
                          href="https://t.me/timeto_drinkwater_bot?start=1" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          Open @timeto_drinkwater_bot <ExternalLink className="h-3 w-3" />
                        </a> and press /start
                      </li>
                    </ol>
                  </div>
                  <button
                    onClick={handleActivateAutomation}
                    disabled={isSaving}
                    className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    ACTIVATE
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Account */}
        <Collapsible open={expandedSections.account} onOpenChange={() => toggleSection('account')}>
          <div className="card-brutalist">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="section-header mb-0">ACCOUNT</h3>
              <ChevronRight className={cn("h-4 w-4 transition-transform", expandedSections.account && "rotate-90")} />
            </CollapsibleTrigger>
            
            <div className="mt-3 text-xs text-muted-foreground">{user?.email}</div>
            
            <CollapsibleContent className="space-y-4 mt-4">
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
                      toast.success('Email updated successfully');
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
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Appearance */}
        <div className="card-brutalist">
          <h3 className="section-header">APPEARANCE</h3>
          <button
            onClick={toggleTheme}
            className="btn-brutalist w-full flex items-center justify-center gap-2"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" />
                LIGHT MODE
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                DARK MODE
              </>
            )}
          </button>
        </div>

        {/* Add to Home Screen */}
        <Collapsible open={expandedSections.pwa} onOpenChange={() => toggleSection('pwa')}>
          <div className="card-brutalist">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="section-header mb-0 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                ADD TO HOME SCREEN
              </h3>
              <ChevronRight className={cn("h-4 w-4 transition-transform", expandedSections.pwa && "rotate-90")} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div className="text-sm">Tap Share in Safari</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div className="text-sm">Select "Add to Home Screen"</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div className="text-sm">Tap "Add"</div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Version */}
        <div className="text-center py-4">
          <Logo size="sm" />
          <div className="text-xs text-muted-foreground mt-1">v2.1</div>
        </div>
      </div>
    </MainLayout>
  );
}
