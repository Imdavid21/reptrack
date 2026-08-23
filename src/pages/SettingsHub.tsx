import type { ReactNode } from 'react';
import { ChevronRight, Database, Dumbbell, Moon, Settings2, Sun, Target, Timer, TrendingDown, User, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDevicePreferences } from '@/hooks/useDevicePreferences';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

function Row({ icon: Icon, title, detail, onClick, trailing }: { icon: typeof User; title: string; detail?: string; onClick?: () => void; trailing?: ReactNode }) {
  const Component = onClick ? 'button' : 'div';
  return <Component onClick={onClick} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{title}</span>{detail && <span className="block type-caption mt-0.5">{detail}</span>}</span>{trailing ?? (onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null)}</Component>;
}

function SwitchControl({ checked, label, onChange, disabled = false }: { checked: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return <button disabled={disabled} role="switch" aria-label={label} aria-checked={checked} onClick={event => { event.stopPropagation(); onChange(); }} className={cn('relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-50', checked ? 'bg-foreground' : 'bg-muted')}><span className={cn('absolute top-1 h-5 w-5 rounded-full transition-transform', checked ? 'translate-x-5 bg-background' : 'translate-x-1 bg-foreground')} /></button>;
}

function ChoiceRow({ label, detail, value, options, onChange, disabled = false }: { label: string; detail?: string; value: string | number; options: Array<{ label: string; value: string | number }>; onChange: (value: string | number) => void; disabled?: boolean }) {
  return <div className="px-4 py-3"><div className="text-sm font-semibold">{label}</div>{detail && <div className="type-caption mt-0.5 mb-2">{detail}</div>}<div className={cn('flex flex-wrap gap-2', !detail && 'mt-2')}>{options.map(option => <button disabled={disabled} key={String(option.value)} onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-50', value === option.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{option.label}</button>)}</div></div>;
}

export default function SettingsHub() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const { preferences: device, updateDevicePreference } = useDevicePreferences();

  const update = (patch: Parameters<typeof updatePreferences.mutate>[0]) => {
    updatePreferences.mutate(patch, {
      onError: error => toast.error(error instanceof Error ? error.message : 'Setting was not saved.'),
    });
  };
  const deficitMode = preferences?.deficit_mode_enabled ?? false;
  const pending = updatePreferences.isPending;
  const calorieMode = preferences?.calorie_target_locked ? `${preferences.daily_calorie_goal || 2000} kcal manual` : 'Calories automatic';
  const proteinMode = preferences?.protein_target_locked ? `${preferences.daily_protein_goal || 165} g protein manual` : 'Protein automatic';

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><h1 className="type-page-title">Settings</h1><p className="type-supporting mt-1">Preferences that currently affect RepTrack. Diagnostics and maintenance stay under Advanced.</p></header>

      <div className="type-eyebrow px-1 mb-2">Account</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={User} title="Account & profile" detail={preferences?.name || 'Body details, email, password, and sign-in'} onClick={() => navigate('/app/settings/account')} />
        <Row icon={Target} title="Goals" detail={preferences?.weight_goal ? `${preferences.weight_goal_type || 'Goal'} · ${preferences.weight_goal} kg` : 'Weight, training, sleep, and nutrition targets'} onClick={() => navigate('/app/settings/account#goals')} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Appearance</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={isDark ? Moon : Sun} title="Theme" detail={isDark ? 'Dark' : 'Light'} trailing={<button onClick={toggleTheme} className="min-h-10 px-3 rounded-xl bg-muted text-xs font-semibold">Use {isDark ? 'light' : 'dark'}</button>} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Training</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={Dumbbell} title="Adaptive training" detail={preferences?.adaptive_mode_enabled ? 'On · readiness can adjust today’s existing prescription' : 'Off · today uses the normal prescription'} trailing={<SwitchControl disabled={pending} checked={preferences?.adaptive_mode_enabled ?? false} label="Adaptive training" onChange={() => update({ adaptive_mode_enabled: !(preferences?.adaptive_mode_enabled ?? false) })} />} />
        <ChoiceRow disabled={pending} label="Coaching goal" detail="Saved as coaching context. It does not replace the fixed PPL sequence." value={preferences?.fitness_goal || 'build_muscle'} options={[{ label: 'Build muscle', value: 'build_muscle' }, { label: 'Strength', value: 'increase_strength' }, { label: 'Lose weight', value: 'lose_weight' }, { label: 'Maintain', value: 'maintain' }, { label: 'Health', value: 'improve_health' }]} onChange={value => update({ fitness_goal: String(value) })} />
        <ChoiceRow disabled={pending} label="Fallback rest" detail="Used when an exercise does not already carry its own programmed rest time." value={preferences?.default_rest_seconds || 90} options={[{ label: '60s', value: 60 }, { label: '90s', value: 90 }, { label: '2m', value: 120 }, { label: '3m', value: 180 }, { label: '5m', value: 300 }]} onChange={value => update({ default_rest_seconds: Number(value) })} />
        <Row icon={Timer} title="Auto-start rest timer" detail="Start after a completed working set" trailing={<SwitchControl disabled={pending} checked={preferences?.auto_rest_timer !== false} label="Auto-start rest timer" onChange={() => update({ auto_rest_timer: preferences?.auto_rest_timer === false })} />} />
        <Row icon={Dumbbell} title="Keep screen awake" detail="Device-only · active workout logger only" trailing={<SwitchControl checked={device.keepScreenAwake} label="Keep screen awake during workouts" onChange={() => updateDevicePreference('keepScreenAwake', !device.keepScreenAwake)} />} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Nutrition & energy</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={TrendingDown} title="Deficit mode" detail={deficitMode ? `On · ${preferences?.daily_deficit_target ?? 500} kcal target deficit` : 'Off'} trailing={<SwitchControl disabled={pending} checked={deficitMode} label="Deficit mode" onChange={() => update({ deficit_mode_enabled: !deficitMode })} />} />
        {deficitMode && <ChoiceRow disabled={pending} label="Daily deficit target" value={preferences?.daily_deficit_target ?? 500} options={[{ label: '250 kcal', value: 250 }, { label: '500 kcal', value: 500 }, { label: '750 kcal', value: 750 }]} onChange={value => update({ daily_deficit_target: Number(value) })} />}
        <Row icon={Settings2} title="Energy & nutrition goals" detail={`${calorieMode} · ${proteinMode}`} onClick={() => navigate('/app/settings/account#nutrition')} />
        <Row icon={Settings2} title="Show energy breakdown on Today" detail="Show resting/baseline and activity detail inside the calorie card" trailing={<SwitchControl disabled={pending} checked={preferences?.show_bmr_on_dashboard !== false} label="Show energy breakdown on Today" onChange={() => update({ show_bmr_on_dashboard: !(preferences?.show_bmr_on_dashboard !== false) })} />} />
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
