import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Switch,
  Button,
  Collapse,
  IconButton,
  Divider,
  TextField,
  Alert,
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
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/lib/toast';
import { Logo } from '@/components/layout/Logo';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { ApiKeySection } from '@/components/settings/ApiKeySection';

import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { GoalsSection } from '@/components/settings/GoalsSection';
import { cn } from '@/lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    goals: true,
  });
  
  // Account management state
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/', { replace: true });
  };

  return (
    <MainLayout title="SETTINGS">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
          
          {/* BASIC SETTINGS */}
          <Typography 
            variant="overline" 
            sx={{ color: 'text.secondary', letterSpacing: 1, mb: -0.5 }}
          >
            BASIC SETTINGS
          </Typography>

          {/* Profile Section */}
          <ProfileSection 
            isExpanded={expandedSections.profile || false}
            onToggle={() => toggleSection('profile')}
          />

          {/* Goals Section */}
          <GoalsSection
            isExpanded={expandedSections.goals || false}
            onToggle={() => toggleSection('goals')}
          />

          <MuiCard>
            <Box
              onClick={() => toggleSection('account')}
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
                <Typography variant="body1" fontWeight={600}>Account</Typography>
              </Box>
              <ChevronRight 
                size={18} 
                style={{ 
                  transform: expandedSections.account ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }} 
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user?.email}
            </Typography>
            
            <Collapse in={expandedSections.account}>
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

                <Button
                  fullWidth
                  color="error"
                  variant="outlined"
                  startIcon={<LogOut size={16} />}
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </Box>
            </Collapse>
          </MuiCard>

          {/* Appearance */}
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

          {/* Add to Home Screen */}
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
                <Typography variant="body1" fontWeight={600}>Add to Home Screen</Typography>
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
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {['Tap Share in Safari', 'Select \"Add to Home Screen\"', 'Tap \"Add\"'].map((step, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {i + 1}
                      </Box>
                      <Typography variant="body2">{step}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Collapse>
          </MuiCard>

          {/* ADVANCED / POWER USER */}
          <Typography 
            variant="overline" 
            sx={{ color: 'text.secondary', letterSpacing: 1, mt: 2, mb: -0.5 }}
          >
            ADVANCED &amp; AUTOMATIONS
          </Typography>

          {/* Data Management Section (advanced) */}
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
                  <Typography variant="body1" fontWeight={600}>API &amp; AI Agents</Typography>
                  <Typography variant="caption" color="text.secondary">
                    For integrations, automations, and Claude / AI tools
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

          {/* Appearance */}
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

          {/* Add to Home Screen */}
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
                <Typography variant="body1" fontWeight={600}>Add to Home Screen</Typography>
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
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {['Tap Share in Safari', 'Select "Add to Home Screen"', 'Tap "Add"'].map((step, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {i + 1}
                      </Box>
                      <Typography variant="body2">{step}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Collapse>
          </MuiCard>

          {/* Version */}
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Logo size="sm" />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              v3.0
            </Typography>
          </Box>
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
