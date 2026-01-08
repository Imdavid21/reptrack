import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Edit3, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

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

export default function CreateRoutine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [goals, setGoals] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveRoutine = async () => {
    if (!generatedRoutine || !user) return;

    setIsSaving(true);

    try {
      // First, deactivate any existing active routines
      await supabase
        .from('custom_routines')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Save the new routine
      const { error } = await supabase.from('custom_routines').insert({
        user_id: user.id,
        routine_name: generatedRoutine.routineName,
        routine_data: generatedRoutine as unknown as Record<string, unknown>,
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

  return (
    <MainLayout title="CREATE ROUTINE">
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
                    onClick={handleSaveRoutine}
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
              Manual routine creation coming soon. For now, use the pre-loaded
              Push/Pull/Legs program or generate one with AI.
            </p>

            <div className="card-brutalist text-center py-8">
              <Edit3 className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Manual routine builder coming soon
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
