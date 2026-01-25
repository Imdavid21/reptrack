import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pill, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useState } from 'react';

const supplements = [
  { key: 'whey', label: 'Whey' },
  { key: 'casein', label: 'Casein' },
  { key: 'creatine', label: 'Creatine' },
  { key: 'omega3', label: 'Omega-3' },
  { key: 'vitaminD', label: 'Vitamin D' },
  { key: 'magnesium', label: 'Magnesium' },
  { key: 'zinc', label: 'Zinc' },
] as const;

type SupplementKey = typeof supplements[number]['key'];

const DEFAULT_SUPPLEMENTS: Record<SupplementKey, boolean> = {
  whey: false,
  casein: false,
  creatine: false,
  omega3: false,
  vitaminD: false,
  magnesium: false,
  zinc: false,
};

export function SupplementCard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, upsertMetrics, isUpserting } = useDailyMetrics({
    from: new Date(),
    to: new Date(),
  });
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);

  const todayData = data?.dataPoints.find(d => d.date === today);
  const currentSupplements = todayData?.supplements || DEFAULT_SUPPLEMENTS;

  const takenCount = Object.values(currentSupplements).filter(Boolean).length;
  const totalCount = supplements.length;

  const handleToggle = async (key: SupplementKey) => {
    const willBeChecked = !currentSupplements[key];
    
    // Trigger animation and haptic
    setAnimatingKey(key);
    haptic(willBeChecked ? 'success' : 'light');
    setTimeout(() => setAnimatingKey(null), 300);
    
    try {
      const newSupplements = {
        ...currentSupplements,
        [key]: willBeChecked,
      };

      await upsertMetrics({
        date: today,
        supplements: newSupplements,
        // Preserve other fields if they exist
        sleep_hours: todayData?.sleep_hours,
        energy_level: todayData?.energy_level,
        bodyweight: todayData?.bodyweight,
        pullups: todayData?.pullups ?? 0,
        notes: todayData?.notes,
      });

      const action = newSupplements[key] ? 'logged' : 'removed';
      toast.success(`${supplements.find(s => s.key === key)?.label} ${action}`);
    } catch (error) {
      toast.error('Failed to update supplement');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">SUPPLEMENTS</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {takenCount}/{totalCount} taken
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {supplements.map(({ key, label }) => {
            const isChecked = currentSupplements[key];
            const isAnimating = animatingKey === key;
            
            return (
              <button
                key={key}
                onClick={() => handleToggle(key)}
                disabled={isUpserting}
                className="flex items-center gap-3 text-left disabled:opacity-50"
              >
                <div
                  className={cn(
                    "w-5 h-5 border-2 flex items-center justify-center transition-all duration-200",
                    isChecked 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground bg-transparent",
                    isAnimating && "scale-125"
                  )}
                >
                  <Check 
                    className={cn(
                      "h-3 w-3 text-primary-foreground transition-all duration-200",
                      isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    )} 
                  />
                </div>
                <Label 
                  className={cn(
                    "text-sm cursor-pointer transition-colors",
                    isChecked ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </Label>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
