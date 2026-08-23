import { useEffect, useMemo, useState } from 'react';
import { Check, Key, Loader2, LogOut, Mail } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function SettingsAccount() {
  const navigate = useNavigate();
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [form, setForm] = useState({ name: '', date_of_birth: '', height_cm: '', gender: '', initial_weight_kg: '', nonexercise_lifestyle: 'mostly_seated', weight_goal: '', weight_goal_type: 'maintain', weekly_workout_goal: '5', sleep_goal: '8', daily_calorie_goal: '2000', daily_protein_goal: '165', daily_water_goal: '3000' });

  useEffect(() => {
    if (!preferences) return;
    setForm({
      name: preferences.name || '',
      date_of_birth: preferences.date_of_birth || '',
      height_cm: preferences.height_cm?.toString() || '',
      gender: preferences.gender || '',
      initial_weight_kg: preferences.initial_weight_kg?.toString() || '',
      nonexercise_lifestyle: preferences.nonexercise_lifestyle || 'mostly_seated',
      weight_goal: preferences.weight_goal?.toString() || '',
      weight_goal_type: preferences.weight_goal_type || 'maintain',
      weekly_workout_goal: preferences.weekly_workout_goal?.toString() || '5',
      sleep_goal: preferences.sleep_goal?.toString() || '8',
      daily_calorie_goal: preferences.daily_calorie_goal?.toString() || '2000',
      daily_protein_goal: preferences.daily_protein_goal?.toString() || '165',
      daily_water_goal: preferences.daily_water_goal?.toString() || '3000',
    });
  }, [preferences]);

  useEffect(() => {
    if (!window.location.hash) return;
    window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const dirtyPayload = useMemo(() => ({
    name: form.name.trim() || null,
    date_of_birth: form.date_of_birth || null,
    height_cm: form.height_cm ? Number(form.height_cm) : null,
    gender: form.gender || null,
    initial_weight_kg: form.initial_weight_kg ? Number(form.initial_weight_kg) : null,
    nonexercise_lifestyle: form.nonexercise_lifestyle as 'mostly_seated' | 'mixed_seated_standing' | 'physically_active_occupation',
    weight_goal: form.weight_goal ? Number(form.weight_goal) : null,
    weight_goal_type: form.weight_goal_type as 'lose' | 'gain' | 'maintain',
    weekly_workout_goal: Math.max(1, Math.min(7, Number(form.weekly_workout_goal) || 5)),
    sleep_goal: Math.max(1, Math.min(14, Number(form.sleep_goal) || 8)),
    daily_calorie_goal: Math.max(800, Number(form.daily_calorie_goal) || 2000),
    daily_protein_goal: Math.max(1, Number(form.daily_protein_goal) || 165),
    daily_water_goal: Math.max(0, Number(form.daily_water_goal) || 3000),
  }), [form]);

  const save = async () => {
    setSaving(true);
    try {
      await updatePreferences.mutateAsync(dirtyPayload);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const signOutNow = async () => {
    await signOut();
    navigate('/signin', { replace: true });
  };

  const field = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  return <MainLayout showBack backTo="/app/settings" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Settings</div><h1 className="type-page-title mt-1">Account & goals</h1><p className="type-supporting mt-1">Profile details and targets used by existing RepTrack calculations.</p></header>

      <section className="mb-7" id="profile"><div className="mb-3"><div className="type-eyebrow">Profile</div><h2 className="type-section-title mt-1">Body and account context</h2></div><div className="rounded-[20px] border border-border bg-card p-4 space-y-4">
        <div><Label htmlFor="settings-name">Name</Label><Input id="settings-name" value={form.name} onChange={event => field('name', event.target.value)} className="mt-1 h-12" /></div>
        <div className="grid sm:grid-cols-2 gap-4"><div><Label htmlFor="settings-dob">Date of birth</Label><Input id="settings-dob" type="date" value={form.date_of_birth} onChange={event => field('date_of_birth', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-height">Height (cm)</Label><Input id="settings-height" type="number" inputMode="decimal" value={form.height_cm} onChange={event => field('height_cm', event.target.value)} className="mt-1 h-12" /></div></div>
        <div><Label htmlFor="settings-initial-weight">Initial measured weight (kg)</Label><Input id="settings-initial-weight" type="number" inputMode="decimal" value={form.initial_weight_kg} onChange={event => field('initial_weight_kg', event.target.value)} className="mt-1 h-12" /></div>
        <div><div className="text-sm font-semibold mb-2">Gender used by existing energy formula</div><div className="flex gap-2 flex-wrap">{['male','female','other'].map(value => <button key={value} onClick={() => field('gender', value)} aria-pressed={form.gender === value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold capitalize', form.gender === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{value}</button>)}</div></div>
        <div><div className="text-sm font-semibold mb-2">Typical non-exercise day</div><div className="grid sm:grid-cols-3 gap-2">{[['mostly_seated','Mostly seated'],['mixed_seated_standing','Mixed'],['physically_active_occupation','Active job']].map(([value,label]) => <button key={value} onClick={() => field('nonexercise_lifestyle', value)} aria-pressed={form.nonexercise_lifestyle === value} className={cn('min-h-11 rounded-xl px-3 text-xs font-semibold', form.nonexercise_lifestyle === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{label}</button>)}</div></div>
      </div></section>

      <section className="mb-7 scroll-mt-4" id="goals"><div className="mb-3"><div className="type-eyebrow">Goals</div><h2 className="type-section-title mt-1">Targets</h2></div><div className="rounded-[20px] border border-border bg-card p-4 space-y-4">
        <div><div className="text-sm font-semibold mb-2">Weight direction</div><div className="flex gap-2">{[['lose','Lose'],['maintain','Maintain'],['gain','Gain']].map(([value,label]) => <button key={value} onClick={() => field('weight_goal_type', value)} aria-pressed={form.weight_goal_type === value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold', form.weight_goal_type === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{label}</button>)}</div></div>
        <div className="grid sm:grid-cols-3 gap-4"><div><Label htmlFor="settings-goal-weight">Goal weight (kg)</Label><Input id="settings-goal-weight" type="number" inputMode="decimal" value={form.weight_goal} onChange={event => field('weight_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-workouts">Workouts / week</Label><Input id="settings-workouts" type="number" min="1" max="7" value={form.weekly_workout_goal} onChange={event => field('weekly_workout_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-sleep">Sleep goal (h)</Label><Input id="settings-sleep" type="number" step="0.5" min="1" max="14" value={form.sleep_goal} onChange={event => field('sleep_goal', event.target.value)} className="mt-1 h-12" /></div></div>
      </div></section>

      <section className="mb-7 scroll-mt-4" id="nutrition"><div className="mb-3"><div className="type-eyebrow">Nutrition</div><h2 className="type-section-title mt-1">Daily targets</h2></div><div className="rounded-[20px] border border-border bg-card p-4"><div className="grid sm:grid-cols-3 gap-4"><div><Label htmlFor="settings-calories">Calories</Label><Input id="settings-calories" type="number" value={form.daily_calorie_goal} onChange={event => field('daily_calorie_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-protein">Protein (g)</Label><Input id="settings-protein" type="number" value={form.daily_protein_goal} onChange={event => field('daily_protein_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-water">Water (ml)</Label><Input id="settings-water" type="number" value={form.daily_water_goal} onChange={event => field('daily_water_goal', event.target.value)} className="mt-1 h-12" /></div></div><p className="type-caption mt-3">Deficit mode and its target are controlled from the main Settings screen. Existing energy-model automation remains unchanged.</p></div></section>

      <button onClick={save} disabled={saving || isLoading} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}Save account & goals</button>

      <section className="mt-8"><div className="mb-3"><div className="type-eyebrow">Security</div><h2 className="type-section-title mt-1">Sign-in</h2></div><div className="divide-y divide-border border-y border-border">
        <div className="py-4"><div className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4"/>Email</div><div className="type-caption mt-1">{user?.email || 'Unavailable'}</div><div className="mt-3 flex gap-2"><Input type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="New email" className="h-11"/><button disabled={emailBusy || !newEmail.trim()} onClick={async () => { setEmailBusy(true); try { const { error } = await updateEmail(newEmail.trim()); if (error) throw error; toast.success('Email update requested'); setNewEmail(''); } catch (error) { toast.error(error instanceof Error ? error.message : 'Email update failed'); } finally { setEmailBusy(false); } }} className="min-h-11 rounded-xl bg-muted px-4 text-xs font-semibold disabled:opacity-50">Update</button></div></div>
        <div className="py-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold"><Key className="h-4 w-4"/>Password</div><div className="type-caption mt-1">Send a reset link to your current email.</div></div><button disabled={resetBusy || !user?.email} onClick={async () => { if (!user?.email) return; setResetBusy(true); try { const { error } = await resetPassword(user.email); if (error) throw error; toast.success('Password reset email sent'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send reset email'); } finally { setResetBusy(false); } }} className="min-h-11 rounded-xl bg-muted px-4 text-xs font-semibold disabled:opacity-50">Reset</button></div>
      </div></section>

      <button onClick={signOutNow} className="mt-8 min-h-12 w-full rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"><LogOut className="h-4 w-4"/>Sign out</button>
    </div>
  </MainLayout>;
}
