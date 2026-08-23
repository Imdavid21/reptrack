import type { ReactNode } from 'react';
import { ChevronRight, Database, Dumbbell, Gauge, Moon, Settings2, Sun, Target, TrendingDown, User, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDevicePreferences } from '@/hooks/useDevicePreferences';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

function Row({ icon: Icon, title, detail, onClick, trailing }: { icon: typeof User; title: string; detail?: string; onClick?: () => void; trailing?: ReactNode }) {
  const Component = onClick ? 'button' : 'div';
  return <Component onClick={onClick} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{title}</span>{detail && <span className="block type-caption mt-0.5">{detail}</span>}</span>{trailing ?? (onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null)}</Component>;
}

function SwitchControl({ checked, label, onChange, disabled = false }: { checked: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return <button disabled={disabled} role="switch" aria-label={label} aria-checked={checked} onClick={event => { event.stopPropagation(); onChange(); }} className={cn('relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-50', checked ? 'bg-foreground' : 'bg-muted')}><span className={cn('absolute top-1 h-5 w-5 rounded-full transition-transform', checked ? 'translate-x-5 bg-background' : 'translate-x-1 bg-foreground')} /></button>;
}

function ChoiceRow({ label, value, options, onChange, disabled = false }: { label: string; value: string | number; options: Array<{ label: string; value: string | number }>; onChange: (value: string | number) => void; disabled?: boolean }) {
  return <div className="px-4 py-3"><div className="text-sm font-semibold mb-2">{label}</div><div className="flex flex-wrap gap-2">{options.map(option => <button disabled={disabled} key={String(option.value)} onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-50', value === option.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{option.label}</button>)}</div></div>;
}

export default function SettingsHub() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const { preferences: device, updateDevicePreference } = useDevicePreferences();
  const advanced = useAdvancedMode();

  const update = (patch: Parameters<typeof updatePreferences.mutate>[0]) => {
    updatePreferences.mutate(patch, { onError: error => toast.error(error instanceof Error ? error.message : 'Setting was not saved.') });
  };
  const deficitMode = preferences?.deficit_mode_enabled ?? false;
  const pending = updatePreferences.isPending;
  const calorieMode = preferences?.calorie_target_locked ? `${preferences.daily_calorie_goal || 2000} kcal manual` : 'Calories automatic';
  const proteinMode = preferences?.protein_target_locked ? `${preferences.daily_protein_goal || 165} g protein manual` : 'Protein automatic';

  return <MainLayout showBack backTo="/app" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><h1 className="type-page-title">Settings</h1></header>

      <div className="type-eyebrow px-1 mb-2">Account</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={User} title="Account & profile" detail={preferences?.name || 'Body details and sign-in'} onClick={() => navigate('/app/settings/account')} />
        <Row icon={Target} title="Goals" detail={preferences?.weight_goal ? `${preferences.weight_goal_type || 'Goal'} · ${preferences.weight_goal} kg` : 'Weight, training, sleep, nutrition'} onClick={() => navigate('/app/settings/account#goals')} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Mode</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={Gauge} title="Advanced Mode" detail={advanced.settings.enabled ? 'On' : 'Off'} trailing={<SwitchControl disabled={advanced.save.isPending} checked={advanced.settings.enabled} label="Advanced Mode" onChange={async () => { try { await advanced.setEnabled(!advanced.settings.enabled); } catch { toast.error('Advanced Mode was not updated.'); } }} />} />
        {advanced.settings.enabled && <Row icon={Gauge} title="Performance Lab" detail="Blocks, progression, recovery, simulator" onClick={() => navigate('/app/lab')} />}
      </section>

      <div className="type-eyebrow px-1 mb-2">Appearance</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={isDark ? Moon : Sun} title="Theme" detail={isDark ? 'Dark' : 'Light'} trailing={<button onClick={toggleTheme} className="min-h-10 px-3 rounded-xl bg-muted text-xs font-semibold">{isDark ? 'Light' : 'Dark'}</button>} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Training</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={Dumbbell} title="Keep screen awake" detail="During workouts" trailing={<SwitchControl checked={device.keepScreenAwake} label="Keep screen awake during workouts" onChange={() => updateDevicePreference('keepScreenAwake', !device.keepScreenAwake)} />} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Nutrition & energy</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
        <Row icon={TrendingDown} title="Deficit mode" detail={deficitMode ? `${preferences?.daily_deficit_target ?? 500} kcal` : 'Off'} trailing={<SwitchControl disabled={pending} checked={deficitMode} label="Deficit mode" onChange={() => update({ deficit_mode_enabled: !deficitMode })} />} />
        {deficitMode && <ChoiceRow disabled={pending} label="Daily deficit" value={preferences?.daily_deficit_target ?? 500} options={[{ label: '250', value: 250 }, { label: '500', value: 500 }, { label: '750', value: 750 }]} onChange={value => update({ daily_deficit_target: Number(value) })} />}
        <Row icon={Settings2} title="Energy & nutrition goals" detail={`${calorieMode} · ${proteinMode}`} onClick={() => navigate('/app/settings/account#nutrition')} />
      </section>

      <div className="type-eyebrow px-1 mb-2">Data</div>
      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
        <Row icon={Database} title="Health & data" detail="Export · import" onClick={() => navigate('/app/settings/data')} />
        <Row icon={Wrench} title="Advanced settings" detail="MCP · lifecycle · maintenance" onClick={() => navigate('/app/settings/advanced')} />
      </section>

      {(isLoading || advanced.isLoading) && <p className="type-caption px-1 mt-4">Loading…</p>}
    </div>
  </MainLayout>;
}
