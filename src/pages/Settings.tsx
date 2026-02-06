import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Switch,
  Button,
  Collapse,
  TextField,
} from '@mui/material';
import {
  LogOut,
  Moon,
  Sun,
  Loader2,
  Mail,
  Key,
  ChevronRight,
  Smartphone,
  Code,
  User,
  ChevronDown,
  Check,
  
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';
import { Logo } from '@/components/layout/Logo';
import { ApiKeySection } from '@/components/settings/ApiKeySection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();

  // All sections collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Account management state
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Profile state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    height_cm: '',
    gender: '',
  });

  useEffect(() => {
    if (preferences) {
      setProfile({
        name: (preferences as any).name || '',
        age: (preferences as any).age?.toString() || '',
        height_cm: (preferences as any).height_cm?.toString() || '',
        gender: (preferences as any).gender || '',
      });
      setProfileDirty(false);
    }
  }, [preferences]);

  // Advanced section visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/signin', { replace: true });
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updatePreferences.mutateAsync({
        name: profile.name || null,
        age: profile.age ? parseInt(profile.age) : null,
        height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
        gender: profile.gender || null,
      } as any);
      toast.success('Profile updated');
      setProfileDirty(false);
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isProfileComplete = profile.age && profile.height_cm && profile.gender;

  return (
    <MainLayout>
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>

          {/* Profile & Account - Merged */}
          <MuiCard>
            <Box
              onClick={() => toggleSection('profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <User size={18} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>Account</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {profile.name || user?.email}
                  </Typography>
                </Box>
              </Box>
              <ChevronRight
                size={18}
                style={{
                  transform: expandedSections.profile ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            <Collapse in={expandedSections.profile}>
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Profile Info */}
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
                    Profile Details
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Help AI give you better insights
                  </Typography>

                  {prefsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Label className="text-xs text-muted-foreground">NAME</Label>
                        <Input
                          type="text"
                          placeholder="Your name"
                          value={profile.name}
                          onChange={(e) => { setProfile(p => ({ ...p, name: e.target.value })); setProfileDirty(true); }}
                          className="input-terminal mt-1"
                        />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Label className="text-xs text-muted-foreground">AGE</Label>
                          <Input
                            type="number"
                            placeholder="25"
                            value={profile.age}
                            onChange={(e) => { setProfile(p => ({ ...p, age: e.target.value })); setProfileDirty(true); }}
                            className="input-terminal mt-1"
                          />
                        </Box>
                        <Box>
                          <Label className="text-xs text-muted-foreground">HEIGHT (CM)</Label>
                          <Input
                            type="number"
                            placeholder="175"
                            value={profile.height_cm}
                            onChange={(e) => { setProfile(p => ({ ...p, height_cm: e.target.value })); setProfileDirty(true); }}
                            className="input-terminal mt-1"
                          />
                        </Box>
                      </Box>

                      <Box>
                        <Label className="text-xs text-muted-foreground">GENDER</Label>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 0.5 }}>
                          {['male', 'female', 'other'].map((g) => (
                            <button
                              key={g}
                              onClick={() => { setProfile(p => ({ ...p, gender: g })); setProfileDirty(true); }}
                              className={cn(
                                "border p-2 text-sm capitalize transition-colors rounded",
                                profile.gender === g
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </Box>
                      </Box>


                      {profileDirty ? (
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
                        >
                          {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          SAVE PROFILE
                        </button>
                      ) : isProfileComplete ? (
                        <div className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-primary" />
                          Profile saved
                        </div>
                      ) : (
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
                        >
                          {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          SAVE PROFILE
                        </button>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Change Email */}
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Mail size={16} />
                    <Typography variant="body2" fontWeight={600}>Change Email</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="newemail@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={isUpdatingEmail || !newEmail.trim()}
                    startIcon={isUpdatingEmail ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                    onClick={async () => {
                      if (!newEmail.trim()) return;
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
                  >
                    Update Email
                  </Button>
                </Box>

                {/* Reset Password */}
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Key size={16} />
                    <Typography variant="body2" fontWeight={600}>Change Password</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    We'll send a password reset link to your email.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={isResettingPassword}
                    startIcon={isResettingPassword ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
                    onClick={async () => {
                      if (!user?.email) return;
                      setIsResettingPassword(true);
                      try {
                        const { error } = await resetPassword(user.email);
                        if (error) throw error;
                        toast.success('Password reset email sent!');
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to send reset email');
                      } finally {
                        setIsResettingPassword(false);
                      }
                    }}
                  >
                    Send Reset Link
                  </Button>
                </Box>

              </Box>
            </Collapse>
          </MuiCard>

          {/* Appearance - Dark Mode Toggle */}
          <MuiCard>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                <Typography variant="body1" fontWeight={600}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Typography>
              </Box>
              <Switch
                checked={isDark}
                onChange={toggleTheme}
                color="primary"
              />
            </Box>
          </MuiCard>


          {/* Install as App */}
          <MuiCard>
            <Box
              onClick={() => toggleSection('pwa')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Smartphone size={18} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>Install as App</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use like a real app on your phone
                  </Typography>
                </Box>
              </Box>
              <ChevronRight
                size={18}
                style={{
                  transform: expandedSections.pwa ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            <Collapse in={expandedSections.pwa}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add this app to your home screen and it will work just like any other app - with its own icon, full screen experience, and offline access.
                </Typography>

                {/* iPhone Instructions */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                    iPhone (Safari)
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      'Tap the Share button (square with arrow)',
                      'Scroll down and tap "Add to Home Screen"',
                      'Tap "Add" in the top right'
                    ].map((step, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 16 }}>
                          {i + 1}.
                        </Typography>
                        <Typography variant="body2">{step}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Android Instructions */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Android (Chrome)
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      'Tap the menu (three dots) in the top right',
                      'Tap "Add to Home screen" or "Install app"',
                      'Tap "Add" to confirm'
                    ].map((step, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 16 }}>
                          {i + 1}.
                        </Typography>
                        <Typography variant="body2">{step}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </MuiCard>

          {/* ============ ADVANCED SECTION ============ */}
          <Box
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 2,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              transition: 'color 0.2s',
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.75rem', letterSpacing: 1 }}>
              {showAdvanced ? 'HIDE ADVANCED OPTIONS' : 'SHOW ADVANCED OPTIONS'}
            </Typography>
            <ChevronDown
              size={14}
              style={{
                transform: showAdvanced ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </Box>

          <Collapse in={showAdvanced}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', letterSpacing: 1, mb: -0.5 }}
              >
                DEVELOPER & INTEGRATIONS
              </Typography>

              {/* Data Management Section */}
              <DataManagementSection
                isExpanded={expandedSections.data || false}
                onToggle={() => toggleSection('data')}
              />

              {/* API Access */}
              <MuiCard>
                <Box
                  onClick={() => toggleSection('api')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    py: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Code size={18} />
                    <Box>
                      <Typography variant="body1" fontWeight={600}>API & AI Agents</Typography>
                      <Typography variant="caption" color="text.secondary">
                        REST API, MCP for Claude, webhooks
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRight
                    size={18}
                    style={{
                      transform: expandedSections.api ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </Box>

                <Collapse in={expandedSections.api}>
                  <Box sx={{ mt: 2 }}>
                    <ApiKeySection />
                  </Box>
                </Collapse>
              </MuiCard>
            </Box>
          </Collapse>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={15} />
            Sign Out
          </button>

          {/* Version */}
          <Box sx={{ textAlign: 'center', pb: 3 }}>
            <Logo size="sm" />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              v3.2
            </Typography>
          </Box>
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
