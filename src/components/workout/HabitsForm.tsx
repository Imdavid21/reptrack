import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Habits } from '@/hooks/useWorkouts';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { Droplets, Moon, Zap, Scale } from 'lucide-react';

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
  const { totalToday } = useWaterLogs();
  const { checkin: morningCheckin } = useMorningCheckin();

  const handleChange = (field: 'pullups', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
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
      <h3 className="section-header">WORKOUT HABITS</h3>

      {/* Today's Stats (Read-only from other sources) */}
      <div className="bg-muted/50 border border-border p-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Check-in Data</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Water:</span>
            <span className="font-medium">{totalToday.toFixed(2)}L</span>
          </div>
          {morningCheckin?.sleep_hours && (
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Sleep:</span>
              <span className="font-medium">{morningCheckin.sleep_hours}h</span>
            </div>
          )}
          {morningCheckin?.energy_level && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Energy:</span>
              <span className="font-medium">{morningCheckin.energy_level}/10</span>
            </div>
          )}
          {morningCheckin?.bodyweight && (
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Weight:</span>
              <span className="font-medium">{morningCheckin.bodyweight}kg</span>
            </div>
          )}
        </div>
      </div>

      {/* Workout-specific tracking */}
      <div>
        <Label className="text-xs text-muted-foreground">PULL-UPS TODAY</Label>
        <Input
          type="number"
          placeholder="0"
          value={habits.pullups || ''}
          onChange={(e) => handleChange('pullups', e.target.value)}
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
        <Label className="text-xs text-muted-foreground">WORKOUT NOTES</Label>
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
