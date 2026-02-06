import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, useUser } from '@clerk/clerk-react';
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
  User,
  Check,
  Shield,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';
import { GoalsSection } from '@/components/settings/GoalsSection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { clerkAppearance, clerkDarkAppearance } from '@/lib/clerkTheme';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', description: '1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', description: '3-5 days/week' },
  { value: 'very', label: 'Very Active', description: '6-7 days/week' },
  { value: 'extra', label: 'Extra Active', description: 'Physical job + exercise' },
];

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_health', label: 'Improve Health' },
  { value: 'increase_strength', label: 'Increase Strength' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user: supabaseUser, signOut: supabaseSignOut, updateEmail, resetPassword } = useAuth();
  const { user: unifiedUser, provider, signOut: unifiedSignOut } = useUnifiedAuth();
  const { user: clerkUser, isSignedIn: clerkSignedIn } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading: prefsLoading } = useUserPreferences();

  // All sections collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Account management state (for Supabase users)
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Profile state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    height_cm: '',
    gender: '',
    activity_level: '',
    fitness_goal: '',
  });

  useEffect(() => {
    if (preferences) {
      setProfile({
        name: (preferences as any).name || '',
        age: (preferences as any).age?.toString() || '',
        height_cm: (preferences as any).height_cm?.toString() || '',
        gender: (preferences as any).gender || '',
        activity_level: (preferences as any).activity_level || '',
        fitness_goal: (preferences as any).fitness_goal || '',
      });
    }
  }, [preferences]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSignOut = async () => {
    await unifiedSignOut();
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
        activity_level: profile.activity_level || null,
        fitness_goal: profile.fitness_goal || null,
      } as any);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isProfileComplete = profile.age && profile.height_cm && profile.gender && profile.activity_level;
  const isClerkUser = provider === 'clerk';
  const displayEmail = isClerkUser ? clerkUser?.primaryEmailAddress?.emailAddress : supabaseUser?.email;
  const displayName = isClerkUser ? clerkUser?.fullName : profile.name;

  return (
    <MainLayout title="SETTINGS">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>

          {/* Account Section */}
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
                    {displayName || displayEmail}
                    {isClerkUser && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Clerk
                      </span>
                    )}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isProfileComplete && <Check size={14} className="text-primary" />}
                <ChevronRight
                  size={18}
                  style={{
                    transform: expandedSections.profile ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </Box>
            </Box>

            <Collapse in={expandedSections.profile}>
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Clerk User Profile */}
                {isClerkUser && (
                  <Box sx={{ 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    '& .cl-rootBox': { width: '100%' },
                    '& .cl-card': { 
                      boxShadow: 'none', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                    },
                  }}>
                    <UserProfile 
                      appearance={isDark ? clerkDarkAppearance : clerkAppearance}
                      routing="virtual"
                    />
                  </Box>
                )}

                {/* Fitness Profile (for all users) */}
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
                    Fitness Profile
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
                      {!isClerkUser && (
                        <Box>
                          <Label className="text-xs text-muted-foreground">NAME</Label>
                          <Input
                            type="text"
                            placeholder="Your name"
                            value={profile.name}
                            onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                            className="input-terminal mt-1"
                          />
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Label className="text-xs text-muted-foreground">AGE</Label>
                          <Input
                            type="number"
                            placeholder="25"
                            value={profile.age}
                            onChange={(e) => setProfile(p => ({ ...p, age: e.target.value }))}
                            className="input-terminal mt-1"
                          />
                        </Box>
                        <Box>
                          <Label className="text-xs text-muted-foreground">HEIGHT (CM)</Label>
                          <Input
                            type="number"
                            placeholder="175"
                            value={profile.height_cm}
                            onChange={(e) => setProfile(p => ({ ...p, height_cm: e.target.value }))}
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
                              onClick={() => setProfile(p => ({ ...p, gender: g }))}
                              className={cn(
                                "border p-2 text-sm capitalize transition-colors rounded-xl",
                                profile.gender === g
                                  ? "border-primary bg-primary/10 font-medium"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </Box>
                      </Box>

                      <Box>
                        <Label className="text-xs text-muted-foreground">ACTIVITY LEVEL</Label>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
                          {ACTIVITY_LEVELS.map((level) => (
                            <button
                              key={level.value}
                              onClick={() => setProfile(p => ({ ...p, activity_level: level.value }))}
                              className={cn(
                                "border p-2 w-full text-left transition-colors rounded-xl",
                                profile.activity_level === level.value
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              <div className="text-sm font-medium">{level.label}</div>
                              <div className="text-xs text-muted-foreground">{level.description}</div>
                            </button>
                          ))}
                        </Box>
                      </Box>

                      <Box>
                        <Label className="text-xs text-muted-foreground">FITNESS GOAL</Label>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mt: 0.5 }}>
                          {FITNESS_GOALS.map((goal) => (
                            <button
                              key={goal.value}
                              onClick={() => setProfile(p => ({ ...p, fitness_goal: goal.value }))}
                              className={cn(
                                "border p-2 text-sm transition-colors rounded-xl",
                                profile.fitness_goal === goal.value
                                  ? "border-primary bg-primary/10 font-medium"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              {goal.label}
                            </button>
                          ))}
                        </Box>
                      </Box>

                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        SAVE PROFILE
                      </button>
                    </Box>
                  )}
                </Box>

                {/* Legacy account management - only for Supabase users */}
                {!isClerkUser && (
                  <>
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
                          if (!supabaseUser?.email) return;
                          setIsResettingPassword(true);
                          try {
                            const { error } = await resetPassword(supabaseUser.email);
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
                  </>
                )}

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="btn-brutalist w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground"
                >
                  <LogOut size={16} />
                  SIGN OUT
                </button>
              </Box>
            </Collapse>
          </MuiCard>

          {/* Goals Section */}
          <GoalsSection
            isExpanded={expandedSections.goals || false}
            onToggle={() => toggleSection('goals')}
          />

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
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    iPhone / iPad
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    1. Tap the <strong>Share</strong> button (square with arrow)<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong><br />
                    3. Tap <strong>Add</strong> in the top right
                  </Typography>
                </Box>

                {/* Android Instructions */}
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Android
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    1. Tap the <strong>menu</strong> (three dots)<br />
                    2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong><br />
                    3. Tap <strong>Install</strong>
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </MuiCard>

          {/* Data Management */}
          <DataManagementSection
            isExpanded={expandedSections.data || false}
            onToggle={() => toggleSection('data')}
          />

        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
