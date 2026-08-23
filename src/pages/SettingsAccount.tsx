import { useEffect, useMemo, useState } from 'react';
import { Check, Key, Link2, Loader2, LogOut, Mail } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory, type GoalKey } from '@/hooks/useGoalHistory';
import { normalizeWaterGoalLiters } from '@/lib/bodyScore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function SettingsAccount() {
  const navigate = useNavigate();
  const { user, signOut, updateEmail, resetPassword } = useAuth();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const { recordGoalHistory } = useGoalHistory();
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', date_of_birth: '', height_cm: '', gender: '', initial_weight_kg: '', nonexercise_lifestyle: 'mostly_seated', weight_goal: '', weight_goal_type: 'maintain', weekly_workout_goal: '5', sleep_goal: '8', daily_calorie_goal: '2000', daily_protein_goal: '165', daily_water_goal: '3' });

  useEffect(() => {
    if (!preferences) return;
    setForm({
      name: preferences.name || '',
      age: preferences.age?.toString() || '',
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
      daily_water_goal: normalizeWaterGoalLiters(preferences.daily_water_goal).toString(),
    });
  }, [preferences]);

  useEffect(() => {
    if (!window.location.hash) return;
    window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const dirtyPayload = useMemo(() => ({
    name: form.name.trim() || null,
    age: form.age ? Math.max(1, Math.min(120, Number(form.age))) : null,
    date_of_birth: form.date_of_birth || null,
    height_cm: form.height_cm ? Number(form.height_cm) : null,
    gender: form.gender || null,
    initial_weight_kg: form.initial_weight_kg ? Number(form.initial_weight_kg) : null,
    nonexercise_lifestyle: form.nonexercise_lifestyle as 'mostly_seated' | 'mixed_seated_standing' | 'physically_active_occupation',
    weight_goal: form.weight_goal ? Number(form.weight_goal) : null,
    weight_goal_type: form.weight_goal_type as 'lose' | 'gain' | 'maintain',
    weekly_workout_goal: Math.max(1, Math.min(7, Number(form.weekly_workout_goal) || 5)),
    sleep_goal: Math.max(1, Math.min(14, Number(form.sleep_goal) || 8)),
    daily_calorie_goal: Math.max(800, Math.min(6000, Number(form.daily_calorie_goal) || 2000)),
    daily_protein_goal: Math.max(1, Math.min(500, Number(form.daily_protein_goal) || 165)),
    daily_water_goal: Math.max(0.25, Math.min(15, Number(form.daily_water_goal) || 3)),
  }), [form]);

  const validate = () => {
    if (form.date_of_birth && new Date(`${form.date_of_birth}T12:00:00`).getTime() > Date.now()) return 'Date of birth cannot be in the future.';
    if (dirtyPayload.height_cm != null && (dirtyPayload.height_cm < 100 || dirtyPayload.height_cm > 250)) return 'Height must be between 100 and 250 cm.';
    if (dirtyPayload.initial_weight_kg != null && (dirtyPayload.initial_weight_kg < 25 || dirtyPayload.initial_weight_kg > 350)) return 'Initial weight looks invalid.';
    if (dirtyPayload.weight_goal != null && (dirtyPayload.weight_goal < 25 || dirtyPayload.weight_goal > 350)) return 'Goal weight looks invalid.';
    return null;
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) { toast.error(validationError); return; }
    setSaving(true);
    try {
      const previousWater = normalizeWaterGoalLiters(preferences?.daily_water_goal);
      const tracked: Array<{ key: GoalKey; next: number; previous: number | null | undefined }> = [
        { key: 'weekly_workout_goal', next: dirtyPayload.weekly_workout_goal, previous: preferences?.weekly_workout_goal },
        { key: 'sleep_goal', next: dirtyPayload.sleep_goal, previous: preferences?.sleep_goal },
        { key: 'daily_calorie_goal', next: dirtyPayload.daily_calorie_goal, previous: preferences?.daily_calorie_goal },
        { key: 'daily_protein_goal', next: dirtyPayload.daily_protein_goal, previous: preferences?.daily_protein_goal },
        { key: 'daily_water_goal', next: dirtyPayload.daily_water_goal, previous: previousWater },
      ];
      const changed = tracked.filter(item => item.previous == null || Math.abs(item.next - Number(item.previous)) > 0.0001);
      const patch = {
        ...dirtyPayload,
        ...(changed.some(item => item.key === 'daily_calorie_goal') ? { calorie_target_locked: true } : {}),
        ...(changed.some(item => item.key === 'daily_protein_goal') ? { protein_target_locked: true } : {}),
      };
      await updatePreferences.mutateAsync(patch);

      let historyFailed = false;
      for (const item of changed) {
        try {
          await recordGoalHistory(item.key, item.next, item.previous);
        } catch (error) {
          historyFailed = true;
          console.error('[SettingsAccount] goal history update failed', item.key, error);
        }
      }
      toast.success('Settings saved');
      if (historyFailed) toast.info('Saved current settings, but one historical goal entry could not be recorded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const useAutomatic = async (field: 'calorie_target_locked' | 'protein_target_locked') => {
    try {
      await updatePreferences.mutateAsync({ [field]: false });
      toast.success(field === 'calorie_target_locked' ? 'Automatic calorie target restored' : 'Automatic protein target restored');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update target mode');
    }
  };

  const signOutNow = async () => {
    await signOut();
    navigate('/signin', { replace: true });
  };

  const field = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const identities = user?.identities || [];

  return <MainLayout showBack backTo="/app/settings" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Settings</div><h1 className="type-page-title mt-1">Account & goals</h1><p className="type-supporting mt-1">Profile details and targets used by RepTrack calculations.</p></header>

      <section className="mb-7" id="profile"><div className="mb-3"><div className="type-eyebrow">Profile</div><h2 className="type-section-title mt-1">Body and account context</h2></div><div className="rounded-[20px] border border-border bg-card p-4 space-y-4">
        <div><Label htmlFor="settings-name">Name</Label><Input id="settings-name" value={form.name} onChange={event => field('name', event.target.value)} className="mt-1 h-12" /></div>
        <div className="grid sm:grid-cols-2 gap-4"><div><Label htmlFor="settings-dob">Date of birth</Label><Input id="settings-dob" type="date" value={form.date_of_birth} onChange={event => field('date_of_birth', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-age">Age fallback</Label><Input id="settings-age" type="number" inputMode="numeric" min="1" max="120" value={form.age} onChange={event => field('age', event.target.value)} className="mt-1 h-12" /><p className="type-caption mt-1">Used only when date of birth is unavailable.</p></div></div>
        <div className="grid sm:grid-cols-2 gap-4"><div><Label htmlFor="settings-height">Height (cm)</Label><Input id="settings-height" type="number" inputMode="decimal" min="100" max="250" value={form.height_cm} onChange={event => field('height_cm', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-initial-weight">Initial measured weight (kg)</Label><Input id="settings-initial-weight" type="number" inputMode="decimal" min="25" max="350" value={form.initial_weight_kg} onChange={event => field('initial_weight_kg', event.target.value)} className="mt-1 h-12" /></div></div>
        <div><div className="text-sm font-semibold mb-2">Gender used by existing energy formula</div><div className="flex gap-2 flex-wrap">{['male','female','other'].map(value => <button key={value} onClick={() => field('gender', value)} aria-pressed={form.gender === value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold capitalize', form.gender === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{value}</button>)}</div></div>
        <div><div className="text-sm font-semibold mb-2">Typical non-exercise day</div><div className="grid sm:grid-cols-3 gap-2">{[['mostly_seated','Mostly seated'],['mixed_seated_standing','Mixed'],['physically_active_occupation','Active job']].map(([value,label]) => <button key={value} onClick={() => field('nonexercise_lifestyle', value)} aria-pressed={form.nonexercise_lifestyle === value} className={cn('min-h-11 rounded-xl px-3 text-xs font-semibold', form.nonexercise_lifestyle === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{label}</button>)}</div></div>
      </div></section>

      <section className="mb-7 scroll-mt-4" id="goals"><div className="mb-3"><div className="type-eyebrow">Goals</div><h2 className="type-section-title mt-1">Targets</h2></div><div className="rounded-[20px] border border-border bg-card p-4 space-y-4">
        <div><div className="text-sm font-semibold mb-2">Weight direction</div><div className="flex gap-2">{[['lose','Lose'],['maintain','Maintain'],['gain','Gain']].map(([value,label]) => <button key={value} onClick={() => field('weight_goal_type', value)} aria-pressed={form.weight_goal_type === value} className={cn('min-h-10 rounded-xl px-3 text-xs font-semibold', form.weight_goal_type === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{label}</button>)}</div></div>
        <div className="grid sm:grid-cols-3 gap-4"><div><Label htmlFor="settings-goal-weight">Goal weight (kg)</Label><Input id="settings-goal-weight" type="number" inputMode="decimal" min="25" max="350" value={form.weight_goal} onChange={event => field('weight_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-workouts">Workouts / week</Label><Input id="settings-workouts" type="number" min="1" max="7" value={form.weekly_workout_goal} onChange={event => field('weekly_workout_goal', event.target.value)} className="mt-1 h-12" /></div><div><Label htmlFor="settings-sleep">Sleep goal (h)</Label><Input id="settings-sleep" type="number" step="0.5" min="1" max="14" value={form.sleep_goal} onChange={event => field('sleep_goal', event.target.value)} className="mt-1 h-12" /></div></div>
      </div></section>

      <section className="mb-7 scroll-mt-4" id="nutrition"><div className="mb-3"><div className="type-eyebrow">Nutrition</div><h2 className="type-section-title mt-1">Daily targets</h2></div><div className="rounded-[20px] border border-border bg-card p-4 space-y-4"><div className="grid sm:grid-cols-3 gap-4"><div><Label htmlFor="settings-calories">Calories</Label><Input id="settings-calories" type="number" min="800" max="6000" value={form.daily_calorie_goal} onChange={event => field('daily_calorie_goal', event.target.value)} className="mt-1 h-12" /><p className="type-caption mt-1">{preferences?.calorie_target_locked ? 'Manual target' : 'Automatic unless you edit and save this value'}</p></div><div><Label htmlFor="settings-protein">Protein (g)</Label><Input id="settings-protein" type="number" min="1" max="500" value={form.daily_protein_goal} onChange={event => field('daily_protein_goal', event.target.value)} className="mt-1 h-12" /><p className="type-caption mt-1">{preferences?.protein_target_locked ? 'Manual target' : 'Automatic unless you edit and save this value'}</p></div><div><Label htmlFor="settings-water">Water (L)</Label><Input id="settings-water" type="number" step="0.25" min="0.25" max="15" value={form.daily_water_goal} onChange={event => field('daily_water_goal', event.target.value)} className="mt-1 h-12" /></div></div>
        {(preferences?.calorie_target_locked || preferences?.protein_target_locked) && <div className="flex flex-wrap gap-2 border-t border-border pt-4">{preferences?.calorie_target_locked && <button type="button" onClick={() => useAutomatic('calorie_target_locked')} className="min-h-10 rounded-xl bg-muted px-3 text-xs font-semibold">Use automatic calories</button>}{preferences?.protein_target_locked && <button type="button" onClick={() => useAutomatic('protein_target_locked')} className="min-h-10 rounded-xl bg-muted px-3 text-xs font-semibold">Use automatic protein</button>}</div>}
        <p className="type-caption">Changing a tracked target also records its effective date so historical Dataroom comparisons keep the goal that was actually in effect.</p>
      </div></section>

      <button onClick={save} disabled={saving || isLoading} className="w-full min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}Save account & goals</button>

      <section className="mt-8"><div className="mb-3"><div className="type-eyebrow">Security</div><h2 className="type-section-title mt-1">Sign-in</h2></div><div className="divide-y divide-border border-y border-border">
        <div className="py-4"><div className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4"/>Email</div><div className="type-caption mt-1">{user?.email || 'Unavailable'}</div><div className="mt-3 flex gap-2"><Input type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="New email" className="h-11"/><button disabled={emailBusy || !newEmail.trim()} onClick={async () => { setEmailBusy(true); try { const { error } = await updateEmail(newEmail.trim()); if (error) throw error; toast.success('Email update requested'); setNewEmail(''); } catch (error) { toast.error(error instanceof Error ? error.message : 'Email update failed'); } finally { setEmailBusy(false); } }} className="min-h-11 rounded-xl bg-muted px-4 text-xs font-semibold disabled:opacity-50">Update</button></div></div>
        <div className="py-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold"><Key className="h-4 w-4"/>Password</div><div className="type-caption mt-1">Send a reset link to your current email.</div></div><button disabled={resetBusy || !user?.email} onClick={async () => { if (!user?.email) return; setResetBusy(true); try { const { error } = await resetPassword(user.email); if (error) throw error; toast.success('Password reset email sent'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send reset email'); } finally { setResetBusy(false); } }} className="min-h-11 rounded-xl bg-muted px-4 text-xs font-semibold disabled:opacity-50">Reset</button></div>
        <div className="py-4"><div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4"/>Sign-in methods</div><div className="mt-3 flex flex-wrap gap-2">{identities.length ? identities.map(identity => <span key={identity.id} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium capitalize">{identity.provider}</span>) : <span className="type-caption">No identity details available.</span>}</div><p className="type-caption mt-2">Additional Google or Apple identities can be added through the normal sign-in flow.</p></div>
      </div></section>

      <button onClick={signOutNow} className="mt-8 min-h-12 w-full rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"><LogOut className="h-4 w-4"/>Sign out</button>
    </div>
  </MainLayout>;
}
