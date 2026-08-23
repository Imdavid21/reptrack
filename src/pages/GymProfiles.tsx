import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedLabData, useAdvancedMode } from '@/hooks/useAdvancedMode';
import { Input } from '@/components/ui/input';
import { plateLoad } from '@/lib/advanced/engine';
import { toast } from '@/lib/toast';

export default function GymProfiles() {
  const { settings } = useAdvancedMode();
  const lab = useAdvancedLabData(settings.enabled);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', bar: '20', plates: '25, 20, 15, 10, 5, 2.5, 1.25', isDefault: true });

  const openNew = () => { setForm({ name: '', bar: '20', plates: '25, 20, 15, 10, 5, 2.5, 1.25', isDefault: lab.gyms.length === 0 }); setEditing('new'); };
  const openEdit = (id: string) => { const gym = lab.gyms.find(item => item.id === id); if (!gym) return; setForm({ name: gym.name, bar: String(gym.barWeightKg), plates: gym.platesKg.join(', '), isDefault: gym.isDefault }); setEditing(id); };
  const parsedPlates = form.plates.split(',').map(value => Number(value.trim())).filter(value => Number.isFinite(value) && value > 0);
  const preview = plateLoad(100, Number(form.bar) || 20, parsedPlates.length ? parsedPlates : undefined);

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  return <MainLayout showBack backTo="/app/lab" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-5 flex items-end justify-between gap-4"><div><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">Gyms</h1></div><button onClick={openNew} className="h-11 w-11 rounded-full bg-foreground text-background flex items-center justify-center" aria-label="Add gym"><Plus className="h-5 w-5"/></button></header>

      <div className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-6">{lab.gyms.map(gym => <button key={gym.id} onClick={() => openEdit(gym.id)} className="w-full p-4 text-left hover:bg-muted/30"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{gym.name}</div>{gym.isDefault && <span className="inline-flex items-center gap-1 type-caption"><Check className="h-3.5 w-3.5"/>Default</span>}</div><div className="type-caption mt-1">{gym.barWeightKg} kg bar · {gym.platesKg.join(' / ')}</div></button>)}{!lab.gyms.length && <button onClick={openNew} className="w-full p-5 text-left type-caption">Add your first gym.</button>}</div>

      {editing && <section className="rounded-[20px] border border-border bg-card p-4 space-y-4"><Input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} placeholder="Gym name"/><div className="grid grid-cols-[100px_1fr] gap-3"><Input type="number" inputMode="decimal" value={form.bar} onChange={event => setForm(value => ({ ...value, bar: event.target.value }))} placeholder="Bar kg"/><Input value={form.plates} onChange={event => setForm(value => ({ ...value, plates: event.target.value }))} placeholder="Plate sizes"/></div><button onClick={() => setForm(value => ({ ...value, isDefault: !value.isDefault }))} className="flex items-center gap-2 text-sm font-semibold"><span className={`h-5 w-5 rounded-md border border-border flex items-center justify-center ${form.isDefault ? 'bg-foreground text-background' : ''}`}>{form.isDefault && <Check className="h-3.5 w-3.5"/>}</span>Default gym</button><div className="border-y border-border py-3 flex items-center justify-between gap-3"><span className="type-caption">100 kg example</span><span className="text-sm font-semibold tabular-nums">{preview.perSide.join(' + ') || 'bar'} / side</span></div><div className="grid grid-cols-2 gap-2"><button onClick={() => setEditing(null)} className="min-h-11 rounded-xl bg-muted text-sm font-semibold">Cancel</button><button disabled={!form.name.trim() || !parsedPlates.length || lab.saveGym.isPending} onClick={async () => { try { await lab.saveGym.mutateAsync({ ...(editing !== 'new' ? { id: editing } : {}), name: form.name, barWeightKg: Number(form.bar) || 20, platesKg: parsedPlates, isDefault: form.isDefault }); setEditing(null); } catch { toast.error('Gym was not saved.'); } }} className="min-h-11 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-50">Save</button></div></section>}
    </div>
  </MainLayout>;
}
