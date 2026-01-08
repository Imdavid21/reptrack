import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Habits } from '@/hooks/useWorkouts';

interface HabitsFormProps {
  habits: Habits;
  onChange: (habits: Habits) => void;
}

const supplements = [
  { key: 'whey', label: 'Whey' },
  { key: 'casein', label: 'Casein' },
  { key: 'creatine', label: 'Creatine' },
  { key: 'omega3', label: 'Omega-3' },
  { key: 'vitaminD', label: 'Vitamin D' },
  { key: 'magnesium', label: 'Magnesium' },
  { key: 'zinc', label: 'Zinc' },
] as const;

export function HabitsForm({ habits, onChange }: HabitsFormProps) {
  const handleChange = (field: keyof Omit<Habits, 'supplements'>, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    onChange({
      ...habits,
      [field]: isNaN(numValue) ? 0 : numValue,
    });
  };

  const handleSupplementChange = (key: keyof Habits['supplements']) => {
    onChange({
      ...habits,
      supplements: {
        ...habits.supplements,
        [key]: !habits.supplements[key],
      },
    });
  };

  const handleNotesChange = (value: string) => {
    onChange({
      ...habits,
      notes: value,
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="section-header">DAILY HABITS</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">PULL-UPS</Label>
          <Input
            type="number"
            placeholder="0"
            value={habits.pullups || ''}
            onChange={(e) => handleChange('pullups', e.target.value)}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">WATER (L)</Label>
          <Input
            type="number"
            step="0.25"
            placeholder="0.00"
            value={habits.water_intake || ''}
            onChange={(e) => handleChange('water_intake', e.target.value)}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">SLEEP (HRS)</Label>
          <Input
            type="number"
            step="0.5"
            placeholder="0.0"
            value={habits.sleep_hours || ''}
            onChange={(e) => handleChange('sleep_hours', e.target.value)}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">ENERGY (1-10)</Label>
          <Input
            type="number"
            min="1"
            max="10"
            placeholder="5"
            value={habits.energy_level || ''}
            onChange={(e) => handleChange('energy_level', e.target.value)}
            className="input-terminal mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">BODYWEIGHT (KG) - OPTIONAL</Label>
        <Input
          type="number"
          step="0.1"
          placeholder="0.0"
          value={habits.bodyweight || ''}
          onChange={(e) => handleChange('bodyweight', e.target.value)}
          className="input-terminal mt-1"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-3 block">SUPPLEMENTS</Label>
        <div className="grid grid-cols-2 gap-3">
          {supplements.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={key}
                checked={habits.supplements[key]}
                onCheckedChange={() => handleSupplementChange(key)}
                className="checkbox-brutalist"
              />
              <Label htmlFor={key} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">NOTES</Label>
        <Textarea
          placeholder="How did today's workout feel? Any PRs? Notes for next time..."
          value={habits.notes || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="input-terminal mt-1 min-h-[100px] resize-none"
        />
      </div>
    </div>
  );
}
