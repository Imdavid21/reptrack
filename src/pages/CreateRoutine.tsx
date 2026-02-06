import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Edit3, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { exerciseLibrary, dayTemplates, ExerciseOption } from '@/lib/exerciseLibrary';

type Tab = 'ai' | 'manual';

interface GeneratedRoutine {
  routineName: string;
  days: Record<string, {
    name: string;
    focus: string;
    exercises: Array<{
      name: string;
      category: string;
      targetWeight: string;
      targetReps: string;
      notes?: string;
    }>;
  }>;
}

interface SelectedExercise extends ExerciseOption {
  selected: boolean;
}

export default function CreateRoutine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [goals, setGoals] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual selection state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [manualExercises, setManualExercises] = useState<Record<string, SelectedExercise[]>>(() => {
    const initial: Record<string, SelectedExercise[]> = {};
    dayTemplates.forEach(day => {
      initial[day.key] = exerciseLibrary[day.type].map(ex => ({ ...ex, selected: false }));
    });
    return initial;
  });
  const [routineName, setRoutineName] = useState('My Custom Routine');

  const handleGenerate = async () => {
    if (!goals.trim()) {
      toast.error('Please describe your goals');
      return;
    }

    setIsGenerating(true);
    setGeneratedRoutine(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: { goals: goals.trim() },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate routine');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.routine) {
        setGeneratedRoutine(data.routine);
        toast.success('Routine generated!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate routine');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRoutine = async (routine: GeneratedRoutine) => {
    if (!routine || !user) return;

    setIsSaving(true);

    try {
      await supabase
        .from('custom_routines')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { error } = await supabase.from('custom_routines').insert({
        user_id: user.id,
        routine_name: routine.routineName,
        routine_data: routine as unknown as Record<string, unknown>,
        is_active: true,
      } as any);

      if (error) throw error;

      toast.success('Routine saved and activated!');
      queryClient.invalidateQueries({ queryKey: ['custom_routines'] });
      setGeneratedRoutine(null);
      setGoals('');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save routine');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExercise = (dayKey: string, exerciseName: string) => {
    setManualExercises(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map(ex => 
        ex.name === exerciseName ? { ...ex, selected: !ex.selected } : ex
      ),
    }));
  };

  const getSelectedCount = (dayKey: string) => {
    return manualExercises[dayKey]?.filter(ex => ex.selected).length || 0;
  };

  const handleSaveManualRoutine = async () => {
    if (!user) return;

    // Build routine from selections
    const hasAnyExercises = Object.values(manualExercises).some(
      exercises => exercises.some(ex => ex.selected)
    );

    if (!hasAnyExercises) {
      toast.error('Select at least one exercise');
      return;
    }

    const routine: GeneratedRoutine = {
      routineName: routineName || 'My Custom Routine',
      days: {},
    };

    dayTemplates.forEach(day => {
      const selectedExercises = manualExercises[day.key].filter(ex => ex.selected);
      routine.days[day.key] = {
        name: day.name,
        focus: day.focus,
        exercises: selectedExercises.map(ex => ({
          name: ex.name,
          category: ex.category,
          targetWeight: ex.defaultWeight,
          targetReps: ex.defaultReps,
        })),
      };
    });

    await handleSaveRoutine(routine);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Tab Selector */}
        <div className="flex border border-border">
          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 transition-colors',
              activeTab === 'ai'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Sparkles className="h-4 w-4" />
            AI GENERATE
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 transition-colors',
              activeTab === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Edit3 className="h-4 w-4" />
            MANUAL
          </button>
        </div>

        {/* AI Generate Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {!generatedRoutine ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Describe your fitness goals, experience level, available equipment, and
                  schedule. Our AI will generate a personalized 6-day routine.
                </p>

                <Textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder={`Goal: Build muscle and strength
Experience: 20 months lifting
Equipment: Full gym with barbells, dumbbells, cables, leg press
Schedule: 6 days/week (Monday-Saturday)
Focus areas: Chest, shoulders, pull-ups
Weak points: Overhead pressing, pull-up strength`}
                  className="input-terminal min-h-[200px] resize-none"
                  disabled={isGenerating}
                />

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !goals.trim()}
                  className="btn-brutalist btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      GENERATE CUSTOM ROUTINE
                    </>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Powered by AI • Uses your preferences to create optimal programming
                </p>
              </>
            ) : (
              <>
                {/* Generated Routine Preview */}
                <div className="card-brutalist">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">{generatedRoutine.routineName}</h3>
                    <span className="badge-brutalist">AI GENERATED</span>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(generatedRoutine.days).map(([dayKey, day]) => (
                      <div key={dayKey} className="border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs text-muted-foreground">{dayKey}</span>
                            <div className="font-bold">{day.name}</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{day.focus}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.exercises.length} exercises
                        </div>
                        <div className="mt-2 space-y-1">
                          {day.exercises.slice(0, 3).map((ex, idx) => (
                            <div key={idx} className="text-sm flex justify-between">
                              <span>{ex.name}</span>
                              <span className="text-muted-foreground">
                                {ex.targetWeight} × {ex.targetReps}
                              </span>
                            </div>
                          ))}
                          {day.exercises.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{day.exercises.length - 3} more exercises
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGeneratedRoutine(null)}
                    className="btn-brutalist flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    DISCARD
                  </button>
                  <button
                    onClick={() => handleSaveRoutine(generatedRoutine)}
                    disabled={isSaving}
                    className="btn-brutalist btn-primary flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    SAVE & USE
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select exercises for each day from the library below.
            </p>

            {/* Routine Name */}
            <div>
              <label className="text-xs text-muted-foreground">ROUTINE NAME</label>
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="input-terminal w-full mt-1"
                placeholder="My Custom Routine"
              />
            </div>

            {/* Day Accordions */}
            <div className="space-y-2">
              {dayTemplates.map((day, idx) => (
                <div key={day.key} className="border border-border">
                  <button
                    onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">{day.key}</div>
                      <div className="font-bold">{day.name}</div>
                      <div className="text-xs text-muted-foreground">{day.focus}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge-brutalist">
                        {getSelectedCount(day.key)} selected
                      </span>
                      {expandedDay === idx ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  
                  {expandedDay === idx && (
                    <div className="border-t border-border p-4 space-y-2 animate-fade-in">
                      <div className="text-xs text-muted-foreground mb-3">
                        Select exercises for this day:
                      </div>
                      
                      {/* Group by category */}
                      {['primary', 'accessory'].map(category => {
                        const categoryExercises = manualExercises[day.key]?.filter(
                          ex => ex.category === category
                        ) || [];
                        
                        if (categoryExercises.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
                              {category}
                            </div>
                            <div className="space-y-1">
                              {categoryExercises.map(ex => (
                                <div
                                  key={ex.name}
                                  className={cn(
                                    'flex items-center gap-3 p-2 border border-border cursor-pointer transition-colors',
                                    ex.selected && 'bg-muted/50'
                                  )}
                                  onClick={() => toggleExercise(day.key, ex.name)}
                                >
                                  <Checkbox
                                    checked={ex.selected}
                                    className="checkbox-brutalist"
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{ex.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {ex.muscleGroup} • {ex.defaultWeight} × {ex.defaultReps}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveManualRoutine}
              disabled={isSaving}
              className="btn-brutalist btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              SAVE ROUTINE
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
