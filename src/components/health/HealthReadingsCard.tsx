import { useState } from 'react';
import { useBloodPressureReadings, useBloodSugarReadings } from '@/hooks/useHealthReadings';
import { Heart, Droplets, AlertCircle, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';

export function HealthReadingsCard() {
  const { 
    latestReading: latestBP, 
    weeksSinceLastReading: bpWeeks, 
    readings: bpReadings,
    addReading: addBP, 
    isAdding: isAddingBP 
  } = useBloodPressureReadings();
  
  const { 
    latestReading: latestSugar, 
    monthsSinceLastReading: sugarMonths, 
    readings: sugarReadings,
    addReading: addSugar, 
    isAdding: isAddingSugar 
  } = useBloodSugarReadings();

  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [sugarDialogOpen, setSugarDialogOpen] = useState(false);
  const [showBpHistory, setShowBpHistory] = useState(false);
  const [showSugarHistory, setShowSugarHistory] = useState(false);
  
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

  return (
    <>
      <div className="card-brutalist">
        <h3 className="section-header">HEALTH READINGS</h3>

        <div className="space-y-4">
          {/* Blood Pressure */}
          <div className="border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">BLOOD PRESSURE (WEEKLY)</span>
              </div>
              {bpNeedsAttention && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  DUE
                </div>
              )}
            </div>

            {latestBP ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {latestBP.systolic}/{latestBP.diastolic}
                  </span>
                  <span className="text-sm text-muted-foreground">mmHg</span>
                  {latestBP.pulse && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {latestBP.pulse} BPM
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(latestBP.measured_at), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No readings yet</p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setBpDialogOpen(true)}
                className="btn-brutalist flex-1 text-xs py-2"
              >
                LOG READING
              </button>
              {bpReadings.length > 0 && (
                <button
                  onClick={() => setShowBpHistory(!showBpHistory)}
                  className="border border-border px-3 py-2 hover:bg-muted transition-colors"
                >
                  {showBpHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            {showBpHistory && bpReadings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-2 max-h-32 overflow-y-auto">
                {bpReadings.slice(0, 8).map((reading) => (
                  <div key={reading.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(reading.measured_at), 'MMM d')}
                    </span>
                    <span className="tabular-nums">
                      {reading.systolic}/{reading.diastolic}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blood Sugar */}
          <div className="border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">BLOOD SUGAR (MONTHLY)</span>
              </div>
              {sugarNeedsAttention && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  DUE
                </div>
              )}
            </div>

            {latestSugar ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {latestSugar.glucose_level}
                  </span>
                  <span className="text-sm text-muted-foreground">mg/dL</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(latestSugar.measured_at), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No readings yet</p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setSugarDialogOpen(true)}
                className="btn-brutalist flex-1 text-xs py-2"
              >
                LOG READING
              </button>
              {sugarReadings.length > 0 && (
                <button
                  onClick={() => setShowSugarHistory(!showSugarHistory)}
                  className="border border-border px-3 py-2 hover:bg-muted transition-colors"
                >
                  {showSugarHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>

            {showSugarHistory && sugarReadings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-2 max-h-32 overflow-y-auto">
                {sugarReadings.slice(0, 8).map((reading) => (
                  <div key={reading.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(reading.measured_at), 'MMM d')}
                    </span>
                    <span className="tabular-nums">
                      {reading.glucose_level} mg/dL
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
              {isAddingBP ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
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
              {isAddingSugar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              SAVE
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
