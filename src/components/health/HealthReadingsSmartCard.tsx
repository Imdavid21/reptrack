import { useState } from 'react';
import { useBloodPressureReadings, useBloodSugarReadings } from '@/hooks/useHealthReadings';
import { Heart, Droplets, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

/**
 * Smart Health Readings Card
 * - Shows BP card only when due (weekly)
 * - Shows Sugar card only when due (monthly)
 * - Otherwise shows compact summary line
 */
export function HealthReadingsSmartCard() {
  const { 
    latestReading: latestBP, 
    weeksSinceLastReading: bpWeeks, 
    addReading: addBP, 
    isAdding: isAddingBP 
  } = useBloodPressureReadings();
  
  const { 
    latestReading: latestSugar, 
    monthsSinceLastReading: sugarMonths, 
    addReading: addSugar, 
    isAdding: isAddingSugar 
  } = useBloodSugarReadings();

  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [sugarDialogOpen, setSugarDialogOpen] = useState(false);
  
  const [bpForm, setBpForm] = useState({ systolic: '', diastolic: '', pulse: '' });
  const [sugarForm, setSugarForm] = useState({ glucose_level: '' });

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

  const handleAddSugar = async () => {
    if (!sugarForm.glucose_level) {
      toast.error('Please enter glucose level');
      return;
    }

    try {
      await addSugar({
        glucose_level: parseFloat(sugarForm.glucose_level),
      });
      toast.success('Blood sugar logged');
      setSugarDialogOpen(false);
      setSugarForm({ glucose_level: '' });
    } catch (error) {
      toast.error('Failed to save reading');
    }
  };

  const bpNeedsAttention = bpWeeks === null || bpWeeks >= 1;
  const sugarNeedsAttention = sugarMonths === null || sugarMonths >= 1;
  const needsAnyAttention = bpNeedsAttention || sugarNeedsAttention;

  // If nothing needs attention, show compact summary
  if (!needsAnyAttention) {
    return (
      <div className="card-brutalist p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Health Readings</span>
          <div className="flex items-center gap-4 text-muted-foreground">
            {latestBP && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span className="tabular-nums">{latestBP.systolic}/{latestBP.diastolic}</span>
                <span className="text-xs">({format(new Date(latestBP.measured_at), 'MMM d')})</span>
              </span>
            )}
            {latestSugar && (
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                <span className="tabular-nums">{latestSugar.glucose_level}</span>
                <span className="text-xs">({format(new Date(latestSugar.measured_at), 'MMM d')})</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show cards only for items that need attention
  return (
    <>
      <div className="space-y-3">
        {/* Blood Pressure - Due */}
        {bpNeedsAttention && (
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
        )}

        {/* Blood Sugar - Due */}
        {sugarNeedsAttention && (
          <div className="card-brutalist border-destructive/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium">BLOOD SUGAR DUE</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {sugarMonths === null ? 'Never logged' : `${sugarMonths}+ month${sugarMonths > 1 ? 's' : ''} ago`}
              </div>
            </div>

            {latestSugar && (
              <p className="text-sm text-muted-foreground mb-3">
                Last: {latestSugar.glucose_level} mg/dL on {format(new Date(latestSugar.measured_at), 'MMM d')}
              </p>
            )}

            <button
              onClick={() => setSugarDialogOpen(true)}
              className="btn-brutalist w-full py-2 text-sm"
            >
              LOG BLOOD SUGAR
            </button>
          </div>
        )}

        {/* Compact summary for non-due items */}
        {!bpNeedsAttention && latestBP && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
            <Heart className="h-3 w-3" />
            BP: {latestBP.systolic}/{latestBP.diastolic} ({format(new Date(latestBP.measured_at), 'MMM d')})
          </div>
        )}
        {!sugarNeedsAttention && latestSugar && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
            <Droplets className="h-3 w-3" />
            Sugar: {latestSugar.glucose_level} ({format(new Date(latestSugar.measured_at), 'MMM d')})
          </div>
        )}
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

      {/* Blood Sugar Dialog */}
      <Dialog open={sugarDialogOpen} onOpenChange={setSugarDialogOpen}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">LOG BLOOD SUGAR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">GLUCOSE LEVEL (mg/dL)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="100"
                value={sugarForm.glucose_level}
                onChange={(e) => setSugarForm({ glucose_level: e.target.value })}
                className="input-terminal mt-1"
              />
            </div>
            <button
              onClick={handleAddSugar}
              disabled={isAddingSugar}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isAddingSugar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
