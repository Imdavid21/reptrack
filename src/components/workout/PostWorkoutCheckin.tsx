import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

export interface PostWorkoutData {
  difficulty: number;
  satisfaction: number;
  durationMinutes?: number;
}

interface PostWorkoutCheckinProps {
  data: PostWorkoutData;
  onChange: (data: PostWorkoutData) => void;
}

const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Hard', 'Brutal'];
const SATISFACTION_LABELS = ['Poor', 'Okay', 'Good', 'Great'];

function getDifficultyLabel(value: number): string {
  if (value <= 3) return DIFFICULTY_LABELS[0];
  if (value <= 5) return DIFFICULTY_LABELS[1];
  if (value <= 7) return DIFFICULTY_LABELS[2];
  return DIFFICULTY_LABELS[3];
}

function getSatisfactionLabel(value: number): string {
  if (value <= 3) return SATISFACTION_LABELS[0];
  if (value <= 5) return SATISFACTION_LABELS[1];
  if (value <= 7) return SATISFACTION_LABELS[2];
  return SATISFACTION_LABELS[3];
}

function getDifficultyEmoji(value: number): string {
  if (value <= 3) return '😌';
  if (value <= 5) return '💪';
  if (value <= 7) return '😤';
  return '🔥';
}

function getSatisfactionEmoji(value: number): string {
  if (value <= 3) return '😕';
  if (value <= 5) return '🙂';
  if (value <= 7) return '😊';
  return '🤩';
}

export function PostWorkoutCheckin({ data, onChange }: PostWorkoutCheckinProps) {
  const handleChange = <K extends keyof PostWorkoutData>(field: K, value: PostWorkoutData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">POST-WORKOUT CHECK-IN</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How was that workout?
        </p>
      </div>

      {/* Difficulty (RPE) */}
      <div className="card-brutalist p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">DIFFICULTY (RPE)</div>
            <div className="text-sm">How hard was this workout?</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getDifficultyEmoji(data.difficulty)}</span>
            <div className="text-right">
              <div className="text-xl font-bold tabular-nums">{data.difficulty}</div>
              <div className="text-xs text-muted-foreground">{getDifficultyLabel(data.difficulty)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[data.difficulty]}
            onValueChange={([v]) => handleChange('difficulty', v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Easy</span>
            <span>Maximum effort</span>
          </div>
        </div>
      </div>

      {/* Satisfaction */}
      <div className="card-brutalist p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">SATISFACTION</div>
            <div className="text-sm">How do you feel about this session?</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getSatisfactionEmoji(data.satisfaction)}</span>
            <div className="text-right">
              <div className="text-xl font-bold tabular-nums">{data.satisfaction}</div>
              <div className="text-xs text-muted-foreground">{getSatisfactionLabel(data.satisfaction)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[data.satisfaction]}
            onValueChange={([v]) => handleChange('satisfaction', v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Poor session</span>
            <span>Amazing session</span>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="card-brutalist p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">DURATION</div>
            <div className="text-sm">How long did this workout take?</div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={data.durationMinutes ?? ''}
              onChange={(e) => handleChange('durationMinutes', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="45"
              className="w-20 text-right font-mono"
              min={1}
              max={300}
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Track RPE to monitor fatigue and optimize training intensity
      </div>
    </div>
  );
}
