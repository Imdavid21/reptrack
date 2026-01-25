import { useState } from 'react';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { Sun, Heart, Wind, Moon, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function MorningCheckinCard() {
  const { checkin, upsertCheckin, isUpserting, isLoading } = useMorningCheckin();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    sleep_hours: '',
    energy_level: '',
    heart_rate: '',
    oxygen_level: '',
  });

  const handleStartEdit = () => {
    setFormData({
      sleep_hours: checkin?.sleep_hours?.toString() || '',
      energy_level: checkin?.energy_level?.toString() || '',
      heart_rate: checkin?.heart_rate?.toString() || '',
      oxygen_level: checkin?.oxygen_level?.toString() || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsertCheckin({
        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : null,
        energy_level: formData.energy_level ? parseInt(formData.energy_level) : null,
        heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
        oxygen_level: formData.oxygen_level ? parseInt(formData.oxygen_level) : null,
      });
      setIsEditing(false);
      toast.success('Morning check-in saved');
    } catch (error) {
      toast.error('Failed to save check-in');
    }
  };

  if (isLoading) {
    return (
      <div className="card-brutalist animate-pulse">
        <div className="h-32 bg-muted" />
      </div>
    );
  }

  const hasData = checkin && (checkin.sleep_hours || checkin.energy_level || checkin.heart_rate);

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
              <div className="text-2xl font-bold tabular-nums">{checkin.sleep_hours || '-'}h</div>
              <div className="text-xs text-muted-foreground">SLEEP</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.energy_level || '-'}/10</div>
              <div className="text-xs text-muted-foreground">ENERGY</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.heart_rate || '-'}</div>
              <div className="text-xs text-muted-foreground">BPM</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.oxygen_level || '-'}%</div>
              <div className="text-xs text-muted-foreground">SpO2</div>
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
        <div>
          <Label className="text-xs text-muted-foreground">SLEEP (HRS)</Label>
          <Input
            type="number"
            step="0.5"
            placeholder="7.5"
            value={formData.sleep_hours}
            onChange={(e) => setFormData(prev => ({ ...prev, sleep_hours: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">ENERGY (1-10)</Label>
          <Input
            type="number"
            min="1"
            max="10"
            placeholder="7"
            value={formData.energy_level}
            onChange={(e) => setFormData(prev => ({ ...prev, energy_level: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">HEART RATE (BPM)</Label>
          <Input
            type="number"
            placeholder="65"
            value={formData.heart_rate}
            onChange={(e) => setFormData(prev => ({ ...prev, heart_rate: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">OXYGEN (SpO2 %)</Label>
          <Input
            type="number"
            min="90"
            max="100"
            placeholder="98"
            value={formData.oxygen_level}
            onChange={(e) => setFormData(prev => ({ ...prev, oxygen_level: e.target.value }))}
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
