import { cn } from '@/lib/utils';

interface ToggleGroupProps<T extends string | number> {
  value: T;
  options: T[];
  onChange: (value: T) => void;
  formatOption?: (option: T) => string;
  className?: string;
}

export function ToggleGroup<T extends string | number>({ 
  value, 
  options, 
  onChange,
  formatOption,
  className
}: ToggleGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "toggle-v3 min-w-[48px]",
            value === option && "toggle-v3-selected"
          )}
        >
          {formatOption ? formatOption(option) : String(option)}
        </button>
      ))}
    </div>
  );
}
