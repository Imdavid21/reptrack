import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pill } from 'lucide-react';

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

  const todayData = data?.dataPoints.find(d => d.date === today);
  const currentSupplements = todayData?.supplements || DEFAULT_SUPPLEMENTS;

  const takenCount = Object.values(currentSupplements).filter(Boolean).length;
  const totalCount = supplements.length;

  const handleToggle = async (key: SupplementKey) => {
    try {
      const newSupplements = {
        ...currentSupplements,
        [key]: !currentSupplements[key],
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
          {supplements.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={`supp-${key}`}
                checked={currentSupplements[key]}
                onCheckedChange={() => handleToggle(key)}
                disabled={isUpserting}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label 
                htmlFor={`supp-${key}`} 
                className={`text-sm cursor-pointer ${currentSupplements[key] ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
