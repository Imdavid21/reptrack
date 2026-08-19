import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exerciseLibrary, ExerciseOption, getExerciseType } from '@/lib/exerciseLibrary';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { cn } from '@/lib/utils';
import { Plus, Search, X, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExercisePickerProps {
  existingExercises: WorkoutExercise[];
  onAddExercise: (exercise: WorkoutExercise) => void;
  dayType?: 'Push' | 'Pull' | 'Legs';
  autoOpen?: boolean;
  onClose?: () => void;
}

// Parse target reps like "4x8-10" into number of sets and rep range
function parseTargetReps(targetReps: string): { sets: number; reps: string } {
  const match = targetReps.match(/^(\d+)x(.+)$/);
  if (match) {
    return { sets: parseInt(match[1], 10), reps: match[2] };
  }
  return { sets: 3, reps: targetReps };
}

// Build muscle group map for each category
function getMuscleGroups(category: string): string[] {
  const exercises = exerciseLibrary[category] || [];
  const groups = new Set<string>();
  exercises.forEach(ex => groups.add(ex.muscleGroup));
  return Array.from(groups);
}

// Get all exercises across all categories
function getAllExercises(): ExerciseOption[] {
  return Object.values(exerciseLibrary).flat();
}

export function ExercisePicker({ existingExercises, onAddExercise, dayType, autoOpen = false, onClose }: ExercisePickerProps) {
  const [open, setOpen] = useState(autoOpen);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>(dayType || 'Push');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');
  const { isFavorite, toggleFavorite, recordUsage, sortByPreference, topUsed, favorites } = useExercisePreferences();

  const existingNames = new Set(existingExercises.map(e => e.name.toLowerCase()));

  const handleAddExercise = (option: ExerciseOption) => {
    const { sets: numSets, reps } = parseTargetReps(option.defaultReps);

    const setsArray: ExerciseSet[] = Array.from({ length: numSets }, (_, i) => ({
      setNumber: i + 1,
      targetWeight: option.defaultWeight,
      targetReps: reps,
      actualWeight: '',
      actualReps: '',
      completed: false,
    }));

    const exType = option.exerciseType || getExerciseType(option.name, option.defaultWeight, option.defaultReps);

    // For timed exercises, parse seconds from the reps field into targetTime
    if (exType === 'timed') {
      const seconds = parseInt(reps, 10);
      if (!isNaN(seconds)) {
        setsArray.forEach(s => {
          s.targetTime = seconds;
          s.targetReps = String(seconds);
        });
      }
    }

    const newExercise: WorkoutExercise = {
      name: option.name,
      category: option.category,
      sets: setsArray,
      sort_order: existingExercises.length,
      exerciseType: exType,
    };

    recordUsage([option.name]);
    onAddExercise(newExercise);
    setOpen(false);
    setSearch('');
  };

  // When searching, look across all categories
  const isSearching = search.length > 0;
  const searchLower = search.toLowerCase();

  const allExercises = useMemo(() => getAllExercises(), []);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return allExercises.filter(
      ex => ex.name.toLowerCase().includes(searchLower) ||
            ex.muscleGroup.toLowerCase().includes(searchLower)
    );
  }, [isSearching, searchLower, allExercises]);

  // "Your exercises" - favorites first, then most-used, resolved to library options.
  const quickExercises = useMemo(() => {
    const names = [...favorites, ...topUsed(12).filter(n => !favorites.includes(n))];
    return names
      .map(name => allExercises.find(ex => ex.name === name))
      .filter((ex): ex is ExerciseOption => !!ex)
      .slice(0, 8);
  }, [favorites, topUsed, allExercises]);

  // Muscle groups for the active tab
  const muscleGroups = useMemo(() => getMuscleGroups(activeTab), [activeTab]);

  const filterExercises = (exercises: ExerciseOption[]) => {
    let filtered = exercises;
    if (search) {
      filtered = filtered.filter(
        ex => ex.name.toLowerCase().includes(searchLower) ||
              ex.muscleGroup.toLowerCase().includes(searchLower)
      );
    }
    if (selectedMuscle !== 'All') {
      filtered = filtered.filter(ex => ex.muscleGroup === selectedMuscle);
    }
    // Surface the user's favorites / most-used at the top of the list.
    return sortByPreference(filtered);
  };

  const categories = ['Push', 'Pull', 'Legs'] as const;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch('');
      setSelectedMuscle('All');
      if (onClose) onClose();
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedMuscle('All');
  };

  const renderExerciseRow = (option: ExerciseOption) => {
    const alreadyAdded = existingNames.has(option.name.toLowerCase());
    const fav = isFavorite(option.name);
    return (
      <div
        key={option.name}
        className={cn(
          'flex items-stretch rounded-xl border transition-colors',
          alreadyAdded ? 'bg-muted/50 border-border' : 'border-border hover:bg-muted'
        )}
      >
        <button
          onClick={() => !alreadyAdded && handleAddExercise(option)}
          disabled={alreadyAdded}
          className={cn('flex-1 text-left p-3 min-w-0', alreadyAdded && 'cursor-not-allowed')}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className={cn('font-medium text-sm truncate', alreadyAdded && 'text-muted-foreground')}>{option.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {option.muscleGroup} | {option.defaultWeight} | {option.defaultReps}
                {option.exerciseType && option.exerciseType !== 'weighted' && (
                  <span className="ml-1 text-xs  opacity-60">
                    ({option.exerciseType === 'bodyweight' ? 'bw' : option.exerciseType === 'weighted_bw' ? 'bw+' : 'timed'})
                  </span>
                )}
              </div>
              {alreadyAdded && <div className="text-xs text-muted-foreground mt-0.5">Already in workout</div>}
            </div>
            <span className={cn(
              'shrink-0 text-xs px-2 py-0.5 rounded-md',
              option.category === 'primary' ? 'bg-energy-soft text-energy-ink' : 'bg-muted text-muted-foreground'
            )}>
              {option.category}
            </span>
          </div>
        </button>
        <button
          onClick={() => toggleFavorite(option.name)}
          aria-label={fav ? `Remove ${option.name} from favorites` : `Add ${option.name} to favorites`}
          aria-pressed={fav}
          className="shrink-0 px-3 flex items-center justify-center text-muted-foreground hover:text-energy-ink transition-colors"
        >
          <Star className={cn('h-4 w-4', fav && 'fill-energy text-energy-ink')} />
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!autoOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Exercise
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises or muscle groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Cross-category search results */}
        {isSearching ? (
          <div className="flex-1 overflow-y-auto mt-2 space-y-1">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No exercises found for "{search}"
              </p>
            ) : (
              <>
                <p className="type-caption px-1 mb-1">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} across all categories
                </p>
                {searchResults.map(renderExerciseRow)}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Your exercises - favorites + most used */}
            {quickExercises.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 px-1">
                  <Star className="h-3 w-3 text-energy-ink" />
                  <span className="type-caption">Your exercises</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {quickExercises.map((option) => {
                    const alreadyAdded = existingNames.has(option.name.toLowerCase());
                    return (
                      <button
                        key={option.name}
                        onClick={() => !alreadyAdded && handleAddExercise(option)}
                        disabled={alreadyAdded}
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors',
                          alreadyAdded
                            ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed border-transparent'
                            : 'border-border hover:bg-muted hover:border-foreground/20'
                        )}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-3">
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                ))}
              </TabsList>

              {categories.map(cat => (
                <TabsContent key={cat} value={cat} className="flex-1 overflow-y-auto mt-2 space-y-1">
                  {/* Muscle group filter chips */}
                  {cat === activeTab && muscleGroups.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide sticky top-0 bg-background z-10">
                      <button
                        onClick={() => setSelectedMuscle('All')}
                        className={cn(
                          'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                          selectedMuscle === 'All'
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        All
                      </button>
                      {muscleGroups.map(group => (
                        <button
                          key={group}
                          onClick={() => setSelectedMuscle(selectedMuscle === group ? 'All' : group)}
                          className={cn(
                            'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                            selectedMuscle === group
                              ? 'bg-foreground text-background'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  )}

                  {filterExercises(exerciseLibrary[cat]).map(renderExerciseRow)}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
