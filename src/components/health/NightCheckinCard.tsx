import { useState } from 'react';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import { Moon, Activity, Footprints, Star, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function NightCheckinCard() {
  const { checkin, upsertCheckin, isUpserting, isLoading } = useNightCheckin();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    performance_score: '',
    energy_score: '',
    steps: '',
  });

  const handleStartEdit = () => {
    setFormData({
      performance_score: checkin?.performance_score?.toString() || '',
      energy_score: checkin?.energy_score?.toString() || '',
      steps: checkin?.steps?.toString() || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsertCheckin({
        performance_score: formData.performance_score ? parseInt(formData.performance_score) : null,
        energy_score: formData.energy_score ? parseInt(formData.energy_score) : null,
        steps: formData.steps ? parseInt(formData.steps) : 0,
      });
      setIsEditing(false);
      toast.success('Night check-in saved');
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

  const hasData = checkin && (checkin.performance_score || checkin.energy_score || checkin.steps);

  if (!isEditing && hasData) {
    return (
      <div className="card-brutalist cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleStartEdit}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-header mb-0">NIGHT CHECK-IN</h3>
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.performance_score || '-'}/10</div>
              <div className="text-xs text-muted-foreground">PERF</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.energy_score || '-'}/10</div>
              <div className="text-xs text-muted-foreground">ENERGY</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold tabular-nums">{checkin.steps?.toLocaleString() || '-'}</div>
              <div className="text-xs text-muted-foreground">STEPS</div>
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
        <h3 className="section-header mb-0">NIGHT CHECK-IN</h3>
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">PERFORMANCE</Label>
          <Input
            type="number"
            min="1"
            max="10"
            placeholder="7"
            value={formData.performance_score}
            onChange={(e) => setFormData(prev => ({ ...prev, performance_score: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">ENERGY</Label>
          <Input
            type="number"
            min="1"
            max="10"
            placeholder="7"
            value={formData.energy_score}
            onChange={(e) => setFormData(prev => ({ ...prev, energy_score: e.target.value }))}
            className="input-terminal mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">STEPS</Label>
          <Input
            type="number"
            placeholder="10000"
            value={formData.steps}
            onChange={(e) => setFormData(prev => ({ ...prev, steps: e.target.value }))}
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
