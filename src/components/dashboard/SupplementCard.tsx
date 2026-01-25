import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pill, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useState, useEffect } from 'react';

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

type SupplementState = Record<SupplementKey, boolean>;

const DEFAULT_SUPPLEMENTS: SupplementState = {
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

  const todayData = data?.dataPoints.find(d => d.date === today);
  
  // Local state for optimistic updates
  const [localSupplements, setLocalSupplements] = useState<SupplementState>(DEFAULT_SUPPLEMENTS);
  
  // Sync local state with server data
  useEffect(() => {
    if (todayData?.supplements) {
      setLocalSupplements({
        ...DEFAULT_SUPPLEMENTS,
        ...todayData.supplements,
      });
    }
  }, [todayData?.supplements]);

  const takenCount = Object.values(localSupplements).filter(Boolean).length;
  const totalCount = supplements.length;

  const handleToggle = async (key: SupplementKey) => {
    const willBeChecked = !localSupplements[key];
    
    // Optimistic update
    const newSupplements = {
      ...localSupplements,
      [key]: willBeChecked,
    };
    setLocalSupplements(newSupplements);
    haptic('light');
    
    try {
      await upsertMetrics({
        date: today,
        supplements: newSupplements,
        sleep_hours: todayData?.sleep_hours,
        energy_level: todayData?.energy_level,
        bodyweight: todayData?.bodyweight,
        pullups: todayData?.pullups ?? 0,
        notes: todayData?.notes,
      });

      const action = willBeChecked ? 'logged' : 'removed';
      toast.success(`${supplements.find(s => s.key === key)?.label} ${action}`);
    } catch (error) {
      // Revert on error
      setLocalSupplements(prev => ({
        ...prev,
        [key]: !willBeChecked,
      }));
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
            const isChecked = localSupplements[key];
            
            return (
              <button
                key={key}
                onClick={() => handleToggle(key)}
                disabled={isUpserting}
                className="flex items-center gap-3 text-left disabled:opacity-50"
              >
                <div
                  className={cn(
                    "w-4 h-4 border flex items-center justify-center transition-colors duration-150",
                    isChecked 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground bg-transparent"
                  )}
                >
                  <Check 
                    className={cn(
                      "h-2.5 w-2.5 text-primary-foreground transition-opacity duration-150",
                      isChecked ? "opacity-100" : "opacity-0"
                    )} 
                  />
                </div>
                <Label 
                  className={cn(
                    "text-sm cursor-pointer transition-colors duration-150",
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
