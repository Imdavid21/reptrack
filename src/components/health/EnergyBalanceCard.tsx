import { useMeals } from '@/hooks/useMeals';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { Flame, TrendingUp, TrendingDown, Minus, Dumbbell } from 'lucide-react';

export function EnergyBalanceCard() {
  const { totalCalories: caloriesIn } = useMeals();
  const { totalBurned, todayWorkout } = useCalorieBurn();

  const displayBurned = totalBurned;
  const netCalories = caloriesIn - displayBurned;
  const isDeficit = netCalories < 0;
  const isSurplus = netCalories > 200;

  // Calculate percentages for the bar visualization
  const maxValue = Math.max(caloriesIn, displayBurned, 1);
  const intakePercent = (caloriesIn / maxValue) * 100;
  const burnPercent = (displayBurned / maxValue) * 100;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-insight-coral/15">
          <Flame className="h-4 w-4 text-insight-coral" />
        </div>
        <h3 className="text-sm font-semibold">Energy Balance</h3>
      </div>

      {/* Visual bar comparison */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Intake</span>
            <span className="font-medium text-insight-coral">+{caloriesIn.toLocaleString()} cal</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-insight-coral rounded-full transition-all duration-500"
              style={{ width: `${intakePercent}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Burned</span>
            <span className="font-medium text-insight-mint">-{displayBurned.toLocaleString()} cal</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-insight-mint rounded-full transition-all duration-500"
              style={{ width: `${burnPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Net result */}
      <div className={`p-3 rounded-xl text-center ${
        isDeficit 
          ? 'bg-insight-mint/10' 
          : isSurplus 
            ? 'bg-insight-coral/10' 
            : 'bg-muted/30'
      }`}>
        <div className={`text-2xl font-bold tabular-nums ${
          isDeficit ? 'text-insight-mint' : isSurplus ? 'text-insight-coral' : ''
        }`}>
          {netCalories >= 0 ? '+' : ''}{netCalories.toLocaleString()} cal
        </div>
        <div className="text-xs text-muted-foreground mt-1">Net Balance</div>
      </div>

      {/* Burn breakdown - show workout details */}
      {todayWorkout && todayWorkout.calculatedDuration > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {todayWorkout.day_name} ({todayWorkout.calculatedDuration}min)
              </span>
            </div>
            <span className="tabular-nums font-medium">-{todayWorkout.calculatedCalories} cal</span>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className={`mt-3 p-2.5 rounded-xl text-center text-xs ${
        isDeficit 
          ? 'bg-insight-mint/10 text-insight-mint' 
          : isSurplus 
            ? 'bg-insight-coral/10 text-insight-coral' 
            : 'bg-muted/30 text-muted-foreground'
      }`}>
        {isDeficit ? (
          <div className="flex items-center justify-center gap-2">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Calorie deficit — great for fat loss</span>
          </div>
        ) : isSurplus ? (
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Calorie surplus — good for muscle gain</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Minus className="h-3.5 w-3.5" />
            <span>Near maintenance</span>
          </div>
        )}
      </div>
    </div>
  );
}
