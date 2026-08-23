import type { ReactNode } from 'react';
import { ChevronRight, Database, Dumbbell, Moon, Settings2, Sun, Target, Timer, TrendingDown, User, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDevicePreferences } from '@/hooks/useDevicePreferences';
import { cn } from '@/lib/utils';

function Row({ icon: Icon, title, detail, onClick, trailing }: { icon: typeof User; title: string; detail?: string; onClick?: () => void; trailing?: ReactNode }) {
  const Component = onClick ? 'button' : 'div';
  return <Component onClick={onClick} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{title}</span>{detail && <span className="block type-caption mt-0.5">{detail}</span>}</span>{trailing ?? (onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null)}</Component>;
}

function SwitchControl({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <button role="switch" aria-label={label} aria-checked={checked} onClick={event => { event.stopPropagation(); onChange(); }} className={cn('relative h-7 w-12 rounded-full transition-colors shrink-0', checked ? 'bg-foreground' : 'bg-muted')}><span className={cn('absolute top-1 h-5 w-5 rounded-full transition-transform', checked ? 'translate-x-5 bg-background' : 'translate-x-1 bg-foreground')} /></button>;
}

function ChoiceRow({ label, value, options, onChange }: { label: string; value: string | number; options: Array<{ label: string; value: string | number }>; onChange: (value: string | number) => void }) {
  return <div className="px-4 py-3"><div className="text-sm font-semibold mb-2">{label}</div><div className="flex flex-wrap gap-2">{options.map(option => <button key={String(option.value)} onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors', value === option.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{option.label}</button>)}</div></div>;
}

export default function SettingsHub() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const { preferences: device, updateDevicePreference } = useDevicePreferences();

  const update = (patch: Parameters<typeof updatePreferences.mutate>[0]) => updatePreferences.mutate(patch);
  const deficitMode = preferences?.deficit_mode_enabled ?? false;

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><h1 className="type-page-title">Settings</h1><p className="type-supporting mt-1">Normal preferences live here. Diagnostics and engineering controls stay under Advanced.</p></header>

      <div className="type-eyebrow px-1 mb-2">Account</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={User} title="Account & profile" detail={preferences?.name || 'Body details, email, password, and sign-in'} onClick={() => navigate('/app/settings/account')} />
        <Row icon={Target} title="Goals" detail={preferences?.weight_goal ? `${preferences.weight_goal_type || 'Goal'} · ${preferences.weight_goal} kg` : 'Weight, training, and sleep targets'} onClick={() => navigate('/app/settings/account#goals')} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Preferences</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={isDark ? Moon : Sun} title="Appearance" detail={isDark ? 'Dark' : 'Light'} trailing={<button onClick={toggleTheme} className="min-h-10 px-3 rounded-xl bg-muted text-xs font-semibold">Use {isDark ? 'light' : 'dark'}</button>} />
        <ChoiceRow label="Units" value={preferences?.units_system || 'metric'} options={[{ label: 'Metric', value: 'metric' }, { label: 'Imperial', value: 'imperial' }]} onChange={value => update({ units_system: value as 'metric' | 'imperial' })} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Training</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={Dumbbell} title="Adaptive training" detail={preferences?.adaptive_mode_enabled ? 'On · RepTrack can adapt the existing program' : 'Off'} trailing={<SwitchControl checked={preferences?.adaptive_mode_enabled ?? false} label="Adaptive training" onChange={() => update({ adaptive_mode_enabled: !(preferences?.adaptive_mode_enabled ?? false) })} />} />
        <ChoiceRow label="Training intent" value={preferences?.fitness_goal || 'build_muscle'} options={[{ label: 'Build muscle', value: 'build_muscle' }, { label: 'Strength', value: 'increase_strength' }, { label: 'Lose weight', value: 'lose_weight' }, { label: 'Maintain', value: 'maintain' }, { label: 'Health', value: 'improve_health' }]} onChange={value => update({ fitness_goal: String(value) })} />
        <ChoiceRow label="Default rest" value={preferences?.default_rest_seconds || 90} options={[{ label: '60s', value: 60 }, { label: '90s', value: 90 }, { label: '2m', value: 120 }, { label: '3m', value: 180 }, { label: '5m', value: 300 }]} onChange={value => update({ default_rest_seconds: Number(value) })} />
        <Row icon={Timer} title="Auto-start rest timer" detail="Start after a completed set" trailing={<SwitchControl checked={preferences?.auto_rest_timer !== false} label="Auto-start rest timer" onChange={() => update({ auto_rest_timer: preferences?.auto_rest_timer === false })} />} />
        <Row icon={Dumbbell} title="Keep screen awake" detail="Device-only · active workout logger only" trailing={<SwitchControl checked={device.keepScreenAwake} label="Keep screen awake during workouts" onChange={() => updateDevicePreference('keepScreenAwake', !device.keepScreenAwake)} />} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Nutrition & energy</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={TrendingDown} title="Deficit mode" detail={deficitMode ? `On · ${preferences?.daily_deficit_target ?? 500} kcal target deficit` : 'Off'} trailing={<SwitchControl checked={deficitMode} label="Deficit mode" onChange={() => update({ deficit_mode_enabled: !deficitMode })} />} />
        {deficitMode && <ChoiceRow label="Daily deficit target" value={preferences?.daily_deficit_target ?? 500} options={[{ label: '250 kcal', value: 250 }, { label: '500 kcal', value: 500 }, { label: '750 kcal', value: 750 }]} onChange={value => update({ daily_deficit_target: Number(value) })} />}
        <Row icon={Settings2} title="Energy & nutrition goals" detail={`${preferences?.daily_calorie_goal || 2000} kcal · ${preferences?.daily_protein_goal || 165} g protein · ${preferences?.daily_water_goal || 3000} ml water`} onClick={() => navigate('/app/settings/account#nutrition')} />
        <Row icon={Settings2} title="Show energy breakdown on Today" detail="BMR / baseline context inside the calorie balance view" trailing={<SwitchControl checked={preferences?.show_bmr_on_dashboard !== false} label="Show energy breakdown on Today" onChange={() => update({ show_bmr_on_dashboard: !(preferences?.show_bmr_on_dashboard !== false) })} />} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Data & advanced</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
        <Row icon={Database} title="Health & data" detail="Export and import your existing RepTrack data" onClick={() => navigate('/app/settings/data')} />
        <Row icon={Wrench} title="Advanced" detail="MCP, lifecycle, PWA, diagnostics, and maintenance tools" onClick={() => navigate('/app/settings/advanced')} />
      </section>

      {isLoading && <p className="type-caption px-1 mt-4">Loading saved preferences…</p>}
    </div>
  </MainLayout>;
}
