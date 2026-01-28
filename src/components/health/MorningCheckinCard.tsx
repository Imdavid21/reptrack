import { useState } from 'react';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { Sun, Moon, Check, Loader2, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast} from '@/lib/toast';

export function MorningCheckinCard() {
  const { checkin, upsertCheckin, isUpserting, isLoading } = useMorningCheckin();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    sleep_hours: '',
    sleep_minutes: '',
    bodyweight: '',
  });

  const handleStartEdit = () => {
    const totalSleepHours = checkin?.sleep_hours || 0;
    const hours = Math.floor(totalSleepHours);
    const minutes = Math.round((totalSleepHours - hours) * 60);
    
    setFormData({
      sleep_hours: hours ? hours.toString() : '',
      sleep_minutes: minutes ? minutes.toString() : '',
      bodyweight: checkin?.bodyweight?.toString() || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const hours = formData.sleep_hours ? parseInt(formData.sleep_hours) : 0;
      const minutes = formData.sleep_minutes ? parseInt(formData.sleep_minutes) : 0;
      const totalHours = hours + (minutes / 60);

      await upsertCheckin({
        sleep_hours: totalHours > 0 ? totalHours : null,
        bodyweight: formData.bodyweight ? parseFloat(formData.bodyweight) : null,
      });
      setIsEditing(false);
      toast.success('Morning check-in saved');
    } catch (error) {
      toast.error('Failed to save check-in');
    }
  };

  const formatSleepDisplay = (totalHours: number | null) => {
    if (!totalHours) return '-';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="card-brutalist animate-pulse">
        <div className="h-32 bg-muted" />
      </div>
    );
  }

  const hasData = checkin && (checkin.sleep_hours || checkin.bodyweight);

  if (!isEditing && hasData) {
    return (
      <div className="card-brutalist cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleStartEdit}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header mb-0">MORNING CHECK-IN</h3>
          <Sun className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{formatSleepDisplay(checkin.sleep_hours)}</div>
              <div className="text-xs text-muted-foreground">SLEEP</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.bodyweight || '-'} kg</div>
              <div className="text-xs text-muted-foreground">WEIGHT</div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">Tap to edit</p>
      </div>
    );
  }

  return (
    <div className="card-brutalist">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">MORNING CHECK-IN</h3>
        <Sun className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">SLEEP DURATION</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                max="24"
                placeholder="7"
                value={formData.sleep_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, sleep_hours: e.target.value }))}
                className="input-terminal"
              />
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={formData.sleep_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, sleep_minutes: e.target.value }))}
                className="input-terminal"
              />
              <span className="text-xs text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">WEIGHT (KG)</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="75.5"
            value={formData.bodyweight}
            onChange={(e) => setFormData(prev => ({ ...prev, bodyweight: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isUpserting}
        className="btn-brutalist w-full mt-4 flex items-center justify-center gap-2"
      >
        {isUpserting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        SAVE CHECK-IN
      </button>
    </div>
  );
}
