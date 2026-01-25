import { Slider } from '@/components/ui/slider';

export interface PreWorkoutData {
  energy: number;
  motivation: number;
  soreness: number;
}

interface PreWorkoutCheckinProps {
  data: PreWorkoutData;
  onChange: (data: PreWorkoutData) => void;
}

const EMOJI_SCALE = ['😴', '😐', '🙂', '😊', '🔥'];

function getEmoji(value: number): string {
  const index = Math.min(Math.floor((value - 1) / 2), 4);
  return EMOJI_SCALE[index];
}

function getColorClass(value: number): string {
  if (value <= 3) return 'text-muted-foreground';
  if (value <= 6) return 'text-foreground';
  return 'text-foreground';
}

export function PreWorkoutCheckin({ data, onChange }: PreWorkoutCheckinProps) {
  const handleChange = (field: keyof PreWorkoutData, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const metrics = [
    { 
      key: 'energy' as const, 
      label: 'ENERGY LEVEL', 
      description: 'How energized do you feel right now?',
      lowLabel: 'Exhausted',
      highLabel: 'Energized',
    },
    { 
      key: 'motivation' as const, 
      label: 'MOTIVATION', 
      description: 'How motivated are you to train?',
      lowLabel: 'Not feeling it',
      highLabel: 'Let\'s go!',
    },
    { 
      key: 'soreness' as const, 
      label: 'MUSCLE SORENESS', 
      description: 'How sore are your muscles from previous workouts?',
      lowLabel: 'Fresh',
      highLabel: 'Very sore',
      inverted: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">PRE-WORKOUT CHECK-IN</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How are you feeling before this workout?
        </p>
      </div>

      {metrics.map(({ key, label, description, lowLabel, highLabel, inverted }) => (
        <div key={key} className="card-brutalist p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <div className="text-sm">{description}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getEmoji(inverted ? 11 - data[key] : data[key])}</span>
              <span className={`text-xl font-bold tabular-nums ${getColorClass(data[key])}`}>
                {data[key]}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Slider
              value={[data[key]]}
              onValueChange={([v]) => handleChange(key, v)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{lowLabel}</span>
              <span>{highLabel}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center text-xs text-muted-foreground">
        This data helps track performance correlations over time
      </div>
    </div>
  );
}
