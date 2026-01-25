import { useState, useEffect } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Loader2, Check, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', description: '1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', description: '3-5 days/week' },
  { value: 'very', label: 'Very Active', description: '6-7 days/week' },
  { value: 'extra', label: 'Extra Active', description: 'Physical job + exercise' },
];

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_health', label: 'Improve Health' },
  { value: 'increase_strength', label: 'Increase Strength' },
];

interface ProfileSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function ProfileSection({ isExpanded, onToggle }: ProfileSectionProps) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    age: '',
    height_cm: '',
    gender: '',
    activity_level: '',
    fitness_goal: '',
  });

  useEffect(() => {
    if (preferences) {
      setProfile({
        age: (preferences as any).age?.toString() || '',
        height_cm: (preferences as any).height_cm?.toString() || '',
        gender: (preferences as any).gender || '',
        activity_level: (preferences as any).activity_level || '',
        fitness_goal: (preferences as any).fitness_goal || '',
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync({
        age: profile.age ? parseInt(profile.age) : null,
        height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
        gender: profile.gender || null,
        activity_level: profile.activity_level || null,
        fitness_goal: profile.fitness_goal || null,
      } as any);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const isComplete = profile.age && profile.height_cm && profile.gender && profile.activity_level;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="card-brutalist">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <h3 className="section-header mb-0 flex items-center gap-2">
            <User className="h-4 w-4" />
            PROFILE
          </h3>
          <div className="flex items-center gap-2">
            {isComplete && <Check className="h-4 w-4 text-primary" />}
            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
          </div>
        </CollapsibleTrigger>
        
        <p className="text-xs text-muted-foreground mt-2">
          Help AI give you better insights
        </p>

        <CollapsibleContent className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">AGE</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={profile.age}
                    onChange={(e) => setProfile(p => ({ ...p, age: e.target.value }))}
                    className="input-terminal mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">HEIGHT (CM)</Label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={profile.height_cm}
                    onChange={(e) => setProfile(p => ({ ...p, height_cm: e.target.value }))}
                    className="input-terminal mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">GENDER</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setProfile(p => ({ ...p, gender: g }))}
                      className={cn(
                        "border p-2 text-sm capitalize transition-colors",
                        profile.gender === g 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">ACTIVITY LEVEL</Label>
                <div className="space-y-2 mt-1">
                  {ACTIVITY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setProfile(p => ({ ...p, activity_level: level.value }))}
                      className={cn(
                        "border p-3 w-full text-left transition-colors",
                        profile.activity_level === level.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="text-sm font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">FITNESS GOAL</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {FITNESS_GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setProfile(p => ({ ...p, fitness_goal: goal.value }))}
                      className={cn(
                        "border p-2 text-sm transition-colors",
                        profile.fitness_goal === goal.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                SAVE PROFILE
              </button>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
