import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react';

export interface PostWorkoutData {
  difficulty: number;
  satisfaction: number;
  durationMinutes?: number;
}

interface PostWorkoutSimpleProps {
  data: PostWorkoutData;
  onChange: (data: PostWorkoutData) => void;
  autoCalculatedDuration?: number;
}

const DIFFICULTY_EMOJIS = ['😌', '💪', '😤', '🔥'];
const SATISFACTION_EMOJIS = ['😕', '🙂', '😊', '🤩'];

function getDifficultyEmoji(value: number): string {
  if (value <= 3) return DIFFICULTY_EMOJIS[0];
  if (value <= 5) return DIFFICULTY_EMOJIS[1];
  if (value <= 7) return DIFFICULTY_EMOJIS[2];
  return DIFFICULTY_EMOJIS[3];
}

function getSatisfactionEmoji(value: number): string {
  if (value <= 3) return SATISFACTION_EMOJIS[0];
  if (value <= 5) return SATISFACTION_EMOJIS[1];
  if (value <= 7) return SATISFACTION_EMOJIS[2];
  return SATISFACTION_EMOJIS[3];
}

export function PostWorkoutSimple({ data, onChange, autoCalculatedDuration }: PostWorkoutSimpleProps) {
  const handleChange = <K extends keyof PostWorkoutData>(field: K, value: PostWorkoutData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const displayDuration = data.durationMinutes ?? autoCalculatedDuration;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">WORKOUT COMPLETE! 💪</h2>
        <p className="text-sm text-muted-foreground mt-1">Quick review</p>
      </div>

      {/* Duration display */}
      {displayDuration && (
        <div className="card-brutalist p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Duration</span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{displayDuration} min</span>
        </div>
      )}

      {/* Difficulty & Satisfaction in compact row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Difficulty */}
        <div className="card-brutalist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">DIFFICULTY</span>
            <span className="text-2xl">{getDifficultyEmoji(data.difficulty)}</span>
          </div>
          <div className="text-center text-2xl font-bold tabular-nums">{data.difficulty}/10</div>
          <Slider
            value={[data.difficulty]}
            onValueChange={([v]) => handleChange('difficulty', v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* Satisfaction */}
        <div className="card-brutalist p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">SATISFACTION</span>
            <span className="text-2xl">{getSatisfactionEmoji(data.satisfaction)}</span>
          </div>
          <div className="text-center text-2xl font-bold tabular-nums">{data.satisfaction}/10</div>
          <Slider
            value={[data.satisfaction]}
            onValueChange={([v]) => handleChange('satisfaction', v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>
      </div>

    </div>
  );
}
