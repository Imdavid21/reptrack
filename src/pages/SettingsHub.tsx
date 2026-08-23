import { ChevronRight, Database, Dumbbell, Moon, Settings2, Sun, User, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDevicePreferences } from '@/hooks/useDevicePreferences';

function Row({ icon: Icon, title, detail, onClick, trailing }: { icon: typeof User; title: string; detail?: string; onClick?: () => void; trailing?: React.ReactNode }) {
  const Component = onClick ? 'button' : 'div';
  return <Component onClick={onClick} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{title}</span>{detail && <span className="block type-caption mt-0.5">{detail}</span>}</span>{trailing ?? (onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null)}</Component>;
}

export default function SettingsHub() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { preferences } = useUserPreferences();
  const { preferences: device, updateDevicePreference } = useDevicePreferences();

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[680px] pb-12">
      <header className="mb-6"><h1 className="type-page-title">Settings</h1><p className="type-supporting mt-1">Account, training preferences, data, and device behavior.</p></header>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-4">
        <Row icon={User} title="Account & goals" detail={preferences?.name || 'Profile, goals, body details'} onClick={() => navigate('/app/settings/advanced')} />
        <Row icon={isDark ? Moon : Sun} title="Appearance" detail={isDark ? 'Dark' : 'Light'} trailing={<button onClick={toggleTheme} className="min-h-10 px-3 rounded-xl bg-muted text-xs font-semibold">Use {isDark ? 'light' : 'dark'}</button>} />
        <Row icon={Settings2} title="Units" detail={preferences?.units_system === 'imperial' ? 'Imperial' : 'Metric'} onClick={() => navigate('/app/settings/advanced')} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Training</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-4">
        <Row icon={Dumbbell} title="Program & adaptive training" detail={`${preferences?.training_split?.toUpperCase() || 'Program'} · ${preferences?.adaptive_mode_enabled ? 'Adaptive on' : 'Adaptive off'}`} onClick={() => navigate('/app/settings/advanced')} />
        <Row icon={Dumbbell} title="Rest timer" detail={`${preferences?.default_rest_seconds || 90}s default · ${preferences?.auto_rest_timer === false ? 'Manual' : 'Auto-start'}`} onClick={() => navigate('/app/settings/advanced')} />
        <Row icon={Dumbbell} title="Keep screen awake" detail="Device-only. Used only while a workout set logger is active." trailing={<button role="switch" aria-checked={device.keepScreenAwake} onClick={() => updateDevicePreference('keepScreenAwake', !device.keepScreenAwake)} className={`relative h-7 w-12 rounded-full transition-colors ${device.keepScreenAwake ? 'bg-foreground' : 'bg-muted'}`}><span className={`absolute top-1 h-5 w-5 rounded-full transition-transform ${device.keepScreenAwake ? 'translate-x-5 bg-background' : 'translate-x-1 bg-foreground'}`} /></button>} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Data & advanced</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
        <Row icon={Database} title="Health & data" detail="Import, export, profile data, and existing health settings." onClick={() => navigate('/app/settings/advanced')} />
        <Row icon={Wrench} title="Advanced" detail="Integrations, MCP, lifecycle, diagnostics, and developer tools." onClick={() => navigate('/app/settings/advanced')} />
      </section>

      <p className="type-caption px-1 mt-4">Technical controls are intentionally kept out of the normal settings path. Existing capabilities remain available under Advanced.</p>
    </div>
  </MainLayout>;
}
