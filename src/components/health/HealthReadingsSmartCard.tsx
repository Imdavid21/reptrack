import { useState } from 'react';
import { useBloodPressureReadings } from '@/hooks/useHealthReadings';
import { Heart, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * Smart Health Readings Card (V1 Simplified)
 * - Shows BP card only when due (weekly)
 * - Blood sugar tracking removed for V1
 */
export function HealthReadingsSmartCard() {
  const { 
    latestReading: latestBP, 
    weeksSinceLastReading: bpWeeks, 
    addReading: addBP, 
    isAdding: isAddingBP 
  } = useBloodPressureReadings();

  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [bpForm, setBpForm] = useState({ systolic: '', diastolic: '', pulse: '' });

  const handleAddBP = async () => {
    if (!bpForm.systolic || !bpForm.diastolic) {
      toast.error('Please enter blood pressure values');
      return;
    }

    try {
      await addBP({
        systolic: parseInt(bpForm.systolic),
        diastolic: parseInt(bpForm.diastolic),
        pulse: bpForm.pulse ? parseInt(bpForm.pulse) : undefined,
      });
      toast.success('Blood pressure logged');
      setBpDialogOpen(false);
      setBpForm({ systolic: '', diastolic: '', pulse: '' });
    } catch (error) {
      toast.error('Failed to save reading');
    }
  };

  const bpNeedsAttention = bpWeeks === null || bpWeeks >= 1;

  // If BP doesn't need attention, show compact summary
  if (!bpNeedsAttention && latestBP) {
    return (
      <div className="card-brutalist p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Blood Pressure</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-muted-foreground" />
            <span className="tabular-nums">{latestBP.systolic}/{latestBP.diastolic}</span>
            <span className="text-xs text-muted-foreground">({format(new Date(latestBP.measured_at), 'MMM d')})</span>
          </span>
        </div>
      </div>
    );
  }

  // Show card when BP is due or never logged
  return (
    <>
      <div className="card-brutalist border-destructive/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium">BLOOD PRESSURE DUE</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {bpWeeks === null ? 'Never logged' : `${bpWeeks}+ week${bpWeeks > 1 ? 's' : ''} ago`}
          </div>
        </div>

        {latestBP && (
          <p className="text-sm text-muted-foreground mb-3">
            Last: {latestBP.systolic}/{latestBP.diastolic} mmHg on {format(new Date(latestBP.measured_at), 'MMM d')}
          </p>
        )}

        <button
          onClick={() => setBpDialogOpen(true)}
          className="btn-brutalist w-full py-2 text-sm"
        >
          LOG BLOOD PRESSURE
        </button>
      </div>

      {/* Blood Pressure Dialog */}
      <Dialog open={bpDialogOpen} onOpenChange={setBpDialogOpen}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">LOG BLOOD PRESSURE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">SYSTOLIC (TOP)</Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={bpForm.systolic}
                  onChange={(e) => setBpForm(prev => ({ ...prev, systolic: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">DIASTOLIC (BOTTOM)</Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={bpForm.diastolic}
                  onChange={(e) => setBpForm(prev => ({ ...prev, diastolic: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">PULSE (OPTIONAL)</Label>
              <Input
                type="number"
                placeholder="72"
                value={bpForm.pulse}
                onChange={(e) => setBpForm(prev => ({ ...prev, pulse: e.target.value }))}
                className="input-terminal mt-1"
              />
            </div>
            <button
              onClick={handleAddBP}
              disabled={isAddingBP}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isAddingBP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
