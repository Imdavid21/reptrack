import { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  User,
  ChevronDown,
  Check,
  Edit2,
  Dumbbell,
  Link2,
  TrendingDown,
  Server,
} from 'lucide-react';
import AppleIcon from '@/components/landing/AppleIcon';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAutoMaintenanceCalories } from '@/hooks/useAutoMaintenanceCalories';
import { toast } from '@/lib/toast';

import { DataManagementSection } from '@/components/settings/DataManagementSection';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_health', label: 'Improve Health' },
  { value: 'increase_strength', label: 'Increase Strength' },
];

const settingsCardSx = {
  bgcolor: 'transparent',
  backgroundImage: 'none',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'none',
  '& .MuiCardContent-root': { p: 1.5, '&:last-child': { pb: 1.5 } },
};

const settingsPanelSx = {
  p: 2,
  bgcolor: 'transparent',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1.5,
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const autoMaintenance = useAutoMaintenanceCalories();

  // All sections collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Account management state
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  

  // Profile state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    date_of_birth: '',
    height_cm: '',
    gender: '',
    initial_weight_kg: '',
    nonexercise_lifestyle: 'mostly_seated',
  });

  useEffect(() => {
    if (preferences) {
      setProfile({
        name: preferences.name || '',
        age: preferences.age?.toString() || '',
        date_of_birth: preferences.date_of_birth || '',
        height_cm: preferences.height_cm?.toString() || '',
        gender: preferences.gender || '',
        initial_weight_kg: preferences.initial_weight_kg?.toString() || '',
        nonexercise_lifestyle: preferences.nonexercise_lifestyle || 'mostly_seated',
      });
      setProfileDirty(false);
    }
  }, [preferences]);

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
        date_of_birth: profile.date_of_birth || null,
        height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
        gender: profile.gender || null,
        initial_weight_kg: profile.initial_weight_kg ? parseFloat(profile.initial_weight_kg) : null,
        nonexercise_lifestyle: profile.nonexercise_lifestyle as 'mostly_seated' | 'mixed_seated_standing' | 'physically_active_occupation',
      });
      toast.success('Profile updated');
      setProfileDirty(false);
      setIsEditingProfile(false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save profile: ${detail}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isProfileComplete = (profile.date_of_birth || profile.age) && profile.height_cm && profile.gender;

  return (
    <MainLayout>
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4, minHeight: 'calc(100vh - 140px)' }}>

          {/* Profile & Account - Merged */}
          <MuiCard sx={settingsCardSx}>
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
                  <Typography variant="h6">Account</Typography>
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
                <Box sx={settingsPanelSx}>
                  {prefsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </Box>
                  ) : isProfileComplete && !isEditingProfile ? (
                    /* Saved state - compact summary */
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={600}>Profile Details</Typography>
                        <button
                          onClick={() => setIsEditingProfile(true)}
                          className="p-1.5 -mr-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          aria-label="Edit profile"
                          title="Edit profile"
                        >
                          <Edit2 size={12} />
                        </button>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {profile.name && (
                          <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5">
                            {profile.name}
                          </span>
                        )}
                        {(profile.date_of_birth || profile.age) && (
                          <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5">
                            {profile.date_of_birth || `${profile.age} yrs`}
                          </span>
                        )}
                        {profile.height_cm && (
                          <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5">
                            {profile.height_cm} cm
                          </span>
                        )}
                        {profile.gender && (
                          <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 capitalize">
                            {profile.gender}
                          </span>
                        )}
                        {profile.initial_weight_kg && (
                          <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5">
                            Initial {profile.initial_weight_kg} kg
                          </span>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    /* Edit state - full form */
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Profile Details
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Used for personalised energy estimates
                      </Typography>

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
                            <Label className="text-xs text-muted-foreground">DATE OF BIRTH</Label>
                            <Input
                              type="date"
                              value={profile.date_of_birth}
                              onChange={(e) => { setProfile(p => ({ ...p, date_of_birth: e.target.value })); setProfileDirty(true); }}
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
                          <Label className="text-xs text-muted-foreground">INITIAL MEASURED WEIGHT (KG)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="Used until weight is logged"
                            value={profile.initial_weight_kg}
                            onChange={(e) => { setProfile(p => ({ ...p, initial_weight_kg: e.target.value })); setProfileDirty(true); }}
                            className="input-terminal mt-1"
                          />
                        </Box>

                        <Box>
                          <Label className="text-xs text-muted-foreground">TYPICAL NON-EXERCISE DAY</Label>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 0.5 }}>
                            {[
                              ['mostly_seated', 'Mostly seated'],
                              ['mixed_seated_standing', 'Mixed'],
                              ['physically_active_occupation', 'Active job'],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => { setProfile(p => ({ ...p, nonexercise_lifestyle: value })); setProfileDirty(true); }}
                                className={cn(
                                  'border p-2 text-xs transition-colors rounded',
                                  profile.nonexercise_lifestyle === value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:bg-muted'
                                )}
                              >
                                {label}
                              </button>
                            ))}
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

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {isProfileComplete && (
                            <button
                              onClick={() => { setIsEditingProfile(false); setProfileDirty(false); }}
                              className="flex-1 py-3 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (profileDirty) {
                                handleSaveProfile();
                              } else {
                                setIsEditingProfile(false);
                              }
                            }}
                            disabled={isSavingProfile}
                            className="btn-brutalist btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                          >
                            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {profileDirty ? 'SAVE PROFILE' : 'DONE'}
                          </button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Change Email */}
                <Box sx={settingsPanelSx}>
                  {!isEditingEmail ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Mail size={16} />
                          <Typography variant="body2" fontWeight={600}>Email</Typography>
                        </Box>
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          className="p-1.5 -mr-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          aria-label="Edit email"
                          title="Edit email"
                        >
                          <Edit2 size={12} />
                        </button>
                      </Box>
                      <span className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 inline-block">
                        {user?.email}
                      </span>
                    </Box>
                  ) : (
                    <Box>
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <button
                          onClick={() => { setIsEditingEmail(false); setNewEmail(''); }}
                          className="flex-1 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                        <Button
                          sx={{ flex: 1, borderRadius: 3 }}
                          variant="contained"
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
                              setIsEditingEmail(false);
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to update email');
                            } finally {
                              setIsUpdatingEmail(false);
                            }
                          }}
                        >
                          Update
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Reset Password */}
                <Box sx={settingsPanelSx}>
                  {!isEditingPassword ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Key size={16} />
                          <Typography variant="body2" fontWeight={600}>Password</Typography>
                        </Box>
                        <button
                          onClick={() => setIsEditingPassword(true)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          Change
                        </button>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        ••••••••
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Key size={16} />
                        <Typography variant="body2" fontWeight={600}>Change Password</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        We'll send a password reset link to your email.
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <button
                          onClick={() => setIsEditingPassword(false)}
                          className="flex-1 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                        <Button
                          sx={{ flex: 1, borderRadius: 3 }}
                          variant="contained"
                          disabled={isResettingPassword}
                          startIcon={isResettingPassword ? <Loader2 className="animate-spin" size={16} /> : <Key size={16} />}
                          onClick={async () => {
                            if (!user?.email) return;
                            setIsResettingPassword(true);
                            try {
                              const { error } = await resetPassword(user.email);
                              if (error) throw error;
                              toast.success('Password reset email sent!');
                              setIsEditingPassword(false);
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
                  )}
                </Box>

                {/* Linked Accounts */}
                <Box sx={settingsPanelSx}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Link2 size={16} />
                    <Typography variant="body2" fontWeight={600}>Sign-in Methods</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Accounts used to sign in
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Email */}
                    {user?.identities?.some(i => i.provider === 'email') && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Mail size={16} />
                          <Box>
                            <Typography variant="body2" fontWeight={500}>Email</Typography>
                            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                          </Box>
                        </Box>
                        <span className="text-xs text-primary font-medium">Active</span>
                      </Box>
                    )}
                    {/* Google */}
                    {(() => {
                      const googleIdentity = user?.identities?.find(i => i.provider === 'google');
                      if (!googleIdentity) return null;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>Google</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(googleIdentity.identity_data as any)?.email || 'Connected'}
                              </Typography>
                            </Box>
                          </Box>
                          <span className="text-xs text-primary font-medium">Active</span>
                        </Box>
                      );
                    })()}
                    {/* Apple */}
                    {(() => {
                      const appleIdentity = user?.identities?.find(i => i.provider === 'apple');
                      if (!appleIdentity) return null;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <AppleIcon className="w-4 h-4" />
                            <Box>
                              <Typography variant="body2" fontWeight={500}>Apple</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(appleIdentity.identity_data as any)?.email || 'Connected'}
                              </Typography>
                            </Box>
                          </Box>
                          <span className="text-xs text-primary font-medium">Active</span>
                        </Box>
                      );
                    })()}
                    {/* Show message if only email */}
                    {!user?.identities?.some(i => i.provider === 'google' || i.provider === 'apple') && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sign in with Google or Apple from the login page to add them here.
                      </Typography>
                    )}
                  </Box>
                </Box>

              </Box>
            </Collapse>
          </MuiCard>

          {/* Appearance - Dark Mode Toggle */}
          <MuiCard sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
                <Typography variant="h6">
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


          {/* Workout Preferences */}
          <MuiCard sx={settingsCardSx}>
            <Box
              onClick={() => toggleSection('workout')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Dumbbell size={18} />
                <Box>
                  <Typography variant="h6">Workout</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rest timer and training preferences
                  </Typography>
                </Box>
              </Box>
              <ChevronRight
                size={18}
                style={{
                  transform: expandedSections.workout ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            <Collapse in={expandedSections.workout}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Default Rest Timer */}
                <Box sx={settingsPanelSx}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Default Rest Timer
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                    Rest between sets (can always adjust per-set)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {[
                      { label: '60s', value: 60 },
                      { label: '90s', value: 90 },
                      { label: '2m', value: 120 },
                      { label: '3m', value: 180 },
                      { label: '5m', value: 300 },
                    ].map(opt => {
                      const current = preferences?.default_rest_seconds || 90;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => updatePreferences.mutate({ default_rest_seconds: opt.value })}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            current === opt.value
                              ? 'bg-foreground text-background'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </Box>
                </Box>

                {/* Fitness goal - drives rest-time tweaks in the programming
                    engine and the profile the AI coach reads. Moved here from
                    Insights so training preferences live in one place. */}
                <Box sx={settingsPanelSx}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Fitness Goal
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                    Shapes rest times and the coaching advice you get
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {FITNESS_GOALS.map(goal => (
                      <button
                        key={goal.value}
                        onClick={() => updatePreferences.mutate({ fitness_goal: goal.value } as any)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          preferences?.fitness_goal === goal.value
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {goal.label}
                      </button>
                    ))}
                  </Box>
                </Box>

                {/* Auto-start rest timer toggle */}
                <Box sx={{ ...settingsPanelSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Auto-start Rest Timer</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Start timer automatically after completing a set
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences?.auto_rest_timer !== false}
                    onChange={() => {
                      const current = preferences?.auto_rest_timer !== false;
                      updatePreferences.mutate({ auto_rest_timer: !current });
                    }}
                    color="primary"
                  />
                </Box>
              </Box>
            </Collapse>
          </MuiCard>

          {/* Deficit Mode */}
          <MuiCard sx={settingsCardSx}>
            <Box
              onClick={() => toggleSection('deficit')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TrendingDown size={18} />
                <Box>
                  <Typography variant="h6">Deficit Mode</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {preferences?.deficit_mode_enabled
                      ? `Active | -${preferences?.daily_deficit_target ?? 500} kcal/day`
                      : 'Track for fat loss'}
                  </Typography>
                </Box>
              </Box>
              <ChevronRight
                size={18}
                style={{
                  transform: expandedSections.deficit ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            <Collapse in={expandedSections.deficit}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ ...settingsPanelSx, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Enable Deficit Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Dashboard switches to remaining-calories view
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences?.deficit_mode_enabled ?? false}
                    onChange={(e) => updatePreferences.mutate({ deficit_mode_enabled: e.target.checked } as any)}
                    color="primary"
                  />
                </Box>

                {preferences?.deficit_mode_enabled && (
                  <>
                    <Box sx={settingsPanelSx}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Personal energy model
                      </Typography>
                      {autoMaintenance.isAvailable ? (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                            Uses weight at the time, dynamic age, normal-day movement, logged activity, and completed workout time.
                          </Typography>
                          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.paper', textAlign: 'center', mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Estimated expenditure today</Typography>
                            <Typography variant="body1" fontWeight={700}>{autoMaintenance.predictedTdee.toLocaleString()} kcal</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Likely {autoMaintenance.likelyRange[0].toLocaleString()}–{autoMaintenance.likelyRange[1].toLocaleString()} | {autoMaintenance.confidence} confidence
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Normal day {autoMaintenance.maintenance.toLocaleString()} | REE {autoMaintenance.bmr.toLocaleString()} | calibration {autoMaintenance.calibrationAdjustment >= 0 ? '+' : ''}{autoMaintenance.calibrationAdjustment}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                              Target {autoMaintenance.calorieTarget.toLocaleString()} kcal | Protein {autoMaintenance.proteinTarget} g | Model v{autoMaintenance.modelVersion}
                            </Typography>
                          </Box>
                          {(preferences?.calorie_target_locked || preferences?.protein_target_locked) && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {preferences.calorie_target_locked && (
                                <Button size="small" variant="outlined" onClick={() => updatePreferences.mutate({ calorie_target_locked: false })}>
                                  Use automatic calories
                                </Button>
                              )}
                              {preferences.protein_target_locked && (
                                <Button size="small" variant="outlined" onClick={() => updatePreferences.mutate({ protein_target_locked: false })}>
                                  Use automatic protein
                                </Button>
                              )}
                            </Box>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                          Add your date of birth, height, gender, and a measured weight in Account above.
                        </Typography>
                      )}
                    </Box>

                    <Box sx={settingsPanelSx}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Daily Deficit Target
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Mild | 250', value: 250 },
                          { label: 'Moderate | 500', value: 500 },
                          { label: 'Aggressive | 750', value: 750 },
                        ].map(opt => {
                          const current = preferences?.daily_deficit_target ?? 500;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updatePreferences.mutate({ daily_deficit_target: opt.value } as any)}
                              className={cn(
                                'flex-1 min-w-[100px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                current === opt.value
                                  ? 'bg-foreground text-background'
                                  : 'bg-muted text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Collapse>
          </MuiCard>

          <Box
            component="button"
            type="button"
            onClick={() => setShowAdvanced(open => !open)}
            aria-expanded={showAdvanced}
            sx={{
              width: '100%',
              border: 0,
              bgcolor: 'transparent',
              px: 1,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'text.primary',
              textAlign: 'left',
              '&:hover': { bgcolor: 'action.hover', borderRadius: 2 },
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>Advanced & data</Typography>
              <Typography variant="caption" color="text.secondary">Connection, install, data, and updates</Typography>
            </Box>
            <ChevronDown size={18} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </Box>

          <Collapse in={showAdvanced}>
            <Box sx={{ display: 'grid', gap: 2 }}>

          {/* Install as App - only show when NOT running as installed PWA */}
          {!window.matchMedia('(display-mode: standalone)').matches && !('standalone' in navigator && (navigator as any).standalone) && (
          <MuiCard sx={settingsCardSx}>
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
                  <Typography variant="h6">Install as App</Typography>
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
                    bgcolor: 'transparent',
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
                    bgcolor: 'transparent',
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
          )}

          {/* Force Update App */}
          <MuiCard sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <RefreshCw size={18} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6">Force Update</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Clear cache and reload to latest version
                  </Typography>
                </Box>
              </Box>
              <button
                onClick={async () => {
                  toast.success('Updating…');
                  try {
                    if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      await Promise.all(regs.map(r => r.unregister()));
                    }
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      await Promise.all(keys.map(k => caches.delete(k)));
                    }
                  } catch (e) {
                    console.error('Force update error:', e);
                  } finally {
                    window.location.reload();
                  }
                }}
                className="btn-brutalist btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw size={14} />
                UPDATE
              </button>
            </Box>
          </MuiCard>


          {/* Data Management Section */}
          <DataManagementSection
            isExpanded={expandedSections.data || false}
            onToggle={() => toggleSection('data')}
          />

          <MuiCard sx={settingsCardSx}>
            <Box
              onClick={() => navigate('/app/settings/mcp')}
              sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', py:1 }}
            >
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                <Server size={18} />
                <Box>
                  <Typography variant="h6">ChatGPT data connection</Typography>
                  <Typography variant="caption" color="text.secondary">MCP status, tools, and setup</Typography>
                </Box>
              </Box>
              <ChevronRight size={18} />
            </Box>
          </MuiCard>

            </Box>
          </Collapse>

          {/* Sign Out */}
          <MuiCard sx={settingsCardSx}>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </MuiCard>

        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
