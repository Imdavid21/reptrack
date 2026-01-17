import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DaySelector } from '@/components/workout/DaySelector';
import { ExerciseList } from '@/components/workout/ExerciseList';
import { HabitsForm } from '@/components/workout/HabitsForm';
import { defaultRoutine } from '@/lib/workoutPresets';
import { useWorkouts, WorkoutExercise, Habits, ExerciseSet } from '@/hooks/useWorkouts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type Step = 'select-day' | 'exercises' | 'habits';

const defaultHabits: Habits = {
  pullups: 0,
  water_intake: 0,
  sleep_hours: 0,
  energy_level: 5,
  bodyweight: undefined,
  notes: '',
  supplements: {
    whey: false,
    casein: false,
    creatine: false,
    omega3: false,
    vitaminD: false,
    magnesium: false,
    zinc: false,
  },
};

// Parse target reps like "4x8-10" into number of sets and rep range
function parseTargetReps(targetReps: string): { sets: number; reps: string } {
  const match = targetReps.match(/^(\d+)x(.+)$/);
  if (match) {
    return { sets: parseInt(match[1], 10), reps: match[2] };
  }
  return { sets: 3, reps: targetReps }; // Default to 3 sets
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const { createWorkout, isCreating } = useWorkouts();
  
  const [step, setStep] = useState<Step>('select-day');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [habits, setHabits] = useState<Habits>(defaultHabits);

  const handleDaySelect = (day: string, date: Date, week: number) => {
    setSelectedDay(day);
    setSelectedDate(date);
    setWeekNumber(week);
    
    // Load exercises from routine with individual sets
    const dayData = defaultRoutine.days[day];
    if (dayData) {
      setExercises(
        dayData.exercises.map((ex, idx) => {
          const { sets: numSets, reps } = parseTargetReps(ex.targetReps);
          
          const setsArray: ExerciseSet[] = Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1,
            targetWeight: ex.targetWeight,
            targetReps: reps,
            actualWeight: '',
            actualReps: '',
            completed: false,
          }));

          return {
            name: ex.name,
            category: ex.category,
            sets: setsArray,
            sort_order: idx,
          };
        })
      );
    }
    
    setStep('exercises');
  };

  const handleExercisesDone = () => {
    const completedCount = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    if (completedCount === 0) {
      toast.error('Complete at least one set');
      return;
    }
    setStep('habits');
  };

  const handleSubmit = async () => {
    const completedCount = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    if (completedCount === 0) {
      toast.error('Complete at least one set');
      return;
    }

    try {
      await createWorkout({
        day: selectedDay,
        day_name: defaultRoutine.days[selectedDay].name,
        week_number: weekNumber,
        date: selectedDate,
        exercises,
        habits,
      });
      
      toast.success('Workout logged! 💪');
      navigate('/');
    } catch (error) {
      toast.error('Failed to save workout');
    }
  };

  const handleBack = () => {
    if (step === 'exercises') {
      setStep('select-day');
    } else if (step === 'habits') {
      setStep('exercises');
    }
  };

  const { completedSets, totalSets } = useMemo(() => {
    const total = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completed = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
      0
    );
    return { completedSets: completed, totalSets: total };
  }, [exercises]);

  return (
    <MainLayout title="LOG WORKOUT">
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        {step !== 'select-day' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            BACK
          </button>
        )}

        {/* Progress indicator */}
        <div className="flex gap-2">
          {['select-day', 'exercises', 'habits'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 ${
                i <= ['select-day', 'exercises', 'habits'].indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        {step === 'select-day' && (
          <DaySelector selectedDay={selectedDay} onSelect={handleDaySelect} />
        )}

        {step === 'exercises' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">{defaultRoutine.days[selectedDay]?.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Week {weekNumber} • {defaultRoutine.days[selectedDay]?.focus}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  {completedSets}/{totalSets}
                </div>
                <div className="text-xs text-muted-foreground">SETS DONE</div>
              </div>
            </div>

            <ExerciseList exercises={exercises} onChange={setExercises} />

            <button
              onClick={handleExercisesDone}
              disabled={completedSets === 0}
              className="btn-brutalist btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONTINUE TO HABITS
            </button>
          </>
        )}

        {step === 'habits' && (
          <>
            <HabitsForm habits={habits} onChange={setHabits} />

            <button
              onClick={handleSubmit}
              disabled={isCreating}
              className="btn-brutalist btn-primary w-full py-4"
            >
              {isCreating ? 'SAVING...' : 'COMPLETE WORKOUT'}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
