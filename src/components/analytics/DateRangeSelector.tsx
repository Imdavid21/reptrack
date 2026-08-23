import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateRange, DATE_PRESETS } from '@/contexts/DateRangeContext';

export function DateRangeSelector() {
  const { preset, setPreset } = useDateRange();

  return (
    <Select value={preset} onValueChange={setPreset}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        {DATE_PRESETS.map((p) => (
          <SelectItem key={p.value} value={p.value} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
