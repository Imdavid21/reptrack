import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { Droplets, Utensils, Dumbbell, Scale, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { toast } from 'sonner';

export function QuickActionsBar() {
  const { addWaterLog, isAdding: isAddingWater } = useWaterLogs();
  const { upsertCheckin, isUpserting: isUpdatingWeight } = useMorningCheckin();
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [weight, setWeight] = useState('');

  const handleQuickWater = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('+250ml 💧');
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const handleQuickWeight = async () => {
    if (!weight) return;
    try {
      await upsertCheckin({ bodyweight: parseFloat(weight) });
      toast.success('Weight logged');
      setShowWeightDialog(false);
      setWeight('');
    } catch (error) {
      toast.error('Failed to log weight');
    }
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleQuickWater}
          disabled={isAddingWater}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          {isAddingWater ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Droplets className="h-5 w-5" />
          )}
          <span className="text-2xs text-muted-foreground">+WATER</span>
        </button>

        <Link
          to="/log"
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-2xs text-muted-foreground">WORKOUT</span>
        </Link>

        <Link
          to="/"
          state={{ openMealDialog: true }}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          <Utensils className="h-5 w-5" />
          <span className="text-2xs text-muted-foreground">MEAL</span>
        </Link>

        <button
          onClick={() => setShowWeightDialog(true)}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-border bg-card hover:bg-muted transition-colors"
        >
          <Scale className="h-5 w-5" />
          <span className="text-2xs text-muted-foreground">WEIGHT</span>
        </button>
      </div>

      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="border-border bg-background max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">QUICK WEIGHT LOG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              step="0.1"
              placeholder="75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-terminal text-2xl text-center"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">Enter weight in kg</p>
            <button
              onClick={handleQuickWeight}
              disabled={!weight || isUpdatingWeight}
              className="btn-brutalist w-full flex items-center justify-center gap-2"
            >
              {isUpdatingWeight ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'SAVE'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
