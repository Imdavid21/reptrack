import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Habits } from '@/hooks/useWorkouts';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets } from 'lucide-react';

interface HabitsFormProps {
  habits: Habits;
  onChange: (habits: Habits) => void;
}

export function HabitsForm({ habits, onChange }: HabitsFormProps) {
  const { totalToday } = useWaterLogs();

  const handleChange = (field: 'pullups', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    onChange({
      ...habits,
      [field]: isNaN(numValue) ? 0 : numValue,
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
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Data</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Water:</span>
            <span className="font-medium">{totalToday.toFixed(2)}L</span>
          </div>
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
