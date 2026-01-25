import { cn } from '@/lib/utils';

export interface PostWorkoutData {
  difficulty: number;
  satisfaction: number;
  durationMinutes?: number;
}

interface PostWorkoutV3Props {
  data: PostWorkoutData;
  onChange: (data: PostWorkoutData) => void;
  autoCalculatedDuration?: number;
  totalVolume?: number;
}

const RATINGS = [1, 2, 3, 4, 5];

export function PostWorkoutV3({ 
  data, 
  onChange, 
  autoCalculatedDuration,
  totalVolume
}: PostWorkoutV3Props) {
  const handleRatingChange = (field: 'difficulty' | 'satisfaction', value: number) => {
    onChange({ ...data, [field]: value });
  };

  const displayDuration = data.durationMinutes || autoCalculatedDuration || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-h1 font-bold">WORKOUT COMPLETE</div>
      </div>

      <div className="divider-v3" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-v3 text-center">
          <div className="stat-v3-value">{displayDuration}</div>
          <div className="stat-v3-label">MINUTES</div>
        </div>
        {totalVolume && totalVolume > 0 && (
          <div className="stat-v3 text-center">
            <div className="stat-v3-value">{Math.round(totalVolume)}</div>
            <div className="stat-v3-label">KG VOLUME</div>
          </div>
        )}
      </div>

      <div className="divider-v3" />

      {/* Performance rating */}
      <div className="space-y-4">
        <div className="label-v3">HOW DID IT GO?</div>
        
        {/* Satisfaction */}
        <div className="flex items-center justify-between">
          <span className="text-sm">SATISFACTION</span>
          <div className="flex gap-1">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => handleRatingChange('satisfaction', r)}
                className={cn(
                  "toggle-v3 w-10 h-10",
                  data.satisfaction === r && "toggle-v3-selected"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex items-center justify-between">
          <span className="text-sm">DIFFICULTY</span>
          <div className="flex gap-1">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => handleRatingChange('difficulty', r)}
                className={cn(
                  "toggle-v3 w-10 h-10",
                  data.difficulty === r && "toggle-v3-selected"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
