import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exerciseLibrary, ExerciseOption } from '@/lib/exerciseLibrary';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { cn } from '@/lib/utils';
import { Plus, Search, X } from 'lucide-react';
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

export function ExercisePicker({ existingExercises, onAddExercise, dayType, autoOpen = false, onClose }: ExercisePickerProps) {
  const [open, setOpen] = useState(autoOpen);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>(dayType || 'Push');

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

    const newExercise: WorkoutExercise = {
      name: option.name,
      category: option.category,
      sets: setsArray,
      sort_order: existingExercises.length,
    };

    onAddExercise(newExercise);
    setOpen(false);
    setSearch('');
  };

  const filterExercises = (exercises: ExerciseOption[]) => {
    if (!search) return exercises;
    const searchLower = search.toLowerCase();
    return exercises.filter(
      ex => ex.name.toLowerCase().includes(searchLower) ||
            ex.muscleGroup.toLowerCase().includes(searchLower)
    );
  };

  const categories = ['Push', 'Pull', 'Legs'] as const;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) onClose();
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
            placeholder="Search exercises..."
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

        {/* Category tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="flex-1 overflow-y-auto mt-2">
              <div className="space-y-1">
                {filterExercises(exerciseLibrary[cat]).map((option) => {
                  const alreadyAdded = existingNames.has(option.name.toLowerCase());
                  
                  return (
                    <button
                      key={option.name}
                      onClick={() => !alreadyAdded && handleAddExercise(option)}
                      disabled={alreadyAdded}
                      className={cn(
                        'w-full text-left p-3 rounded border transition-colors',
                        alreadyAdded 
                          ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                          : 'hover:bg-muted border-border'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.muscleGroup} • {option.defaultWeight} • {option.defaultReps}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          option.category === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted'
                        )}>
                          {option.category}
                        </span>
                      </div>
                      {alreadyAdded && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Already in workout
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
