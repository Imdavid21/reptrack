import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { Download, FileJson, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedLabData, useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useDataroomData } from '@/hooks/useDataroomData';
import { cutControl, progressionAutopilot, recoveryPattern, weakPointRadar } from '@/lib/advanced/engine';

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function CoachExport() {
  const { settings } = useAdvancedMode();
  const lab = useAdvancedLabData(settings.enabled);
  const [days, setDays] = useState(30);
  const range = useMemo(() => ({ from: subDays(new Date(), days - 1), to: new Date() }), [days]);
  const data = useDataroomData(range);

  const report = useMemo(() => {
    const sets = data.sets.map(set => ({ exercise: set.exercise_name, date: set.workout_date || '', weight: Number(set.actual_weight || 0), reps: Number(set.actual_reps || 0), rir: set.actual_rir, pain: set.pain_score }));
    const progression = progressionAutopilot(sets);
    const cut = cutControl(data.metrics.map(point => ({ date: point.date, bodyweight: point.bodyweight })), data.preferences?.weight_goal);
    const recovery = recoveryPattern(data.metrics.map(point => ({ date: point.date, sleep: point.sleep_hours })));
    const weakPoints = weakPointRadar(sets, settings.specializationMuscles);
    const workouts = data.workouts.filter(workout => workout.completed_at && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped);
    const mealDays = new Set(data.meals.map(meal => meal.date));
    const mealCalories = data.meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
    const protein = data.meals.reduce((sum, meal) => sum + Number(meal.protein || 0), 0);
    const activityMinutes = data.activities.reduce((sum, activity) => sum + Number(activity.duration_minutes || 0), 0);
    return {
      generated_at: new Date().toISOString(),
      range: { days, start: data.startDate, end: data.endDate },
      advanced: {
        specialization: settings.specializationMuscles,
        session_volume_modifier: settings.sessionVolumeModifier,
        active_block: lab.blocks.find(block => block.status === 'active') ?? null,
        active_experiments: lab.experiments.filter(item => item.status === 'active'),
        gyms: lab.gyms,
      },
      bodyweight: cut,
      recovery,
      training: {
        workouts: workouts.length,
        sets: sets.length,
        progression,
        set_exposure: weakPoints,
      },
      nutrition: {
        logged_days: mealDays.size,
        average_calories_per_logged_day: mealDays.size ? Math.round(mealCalories / mealDays.size) : null,
        average_protein_g_per_logged_day: mealDays.size ? Math.round(protein / mealDays.size) : null,
        completeness_known: false,
      },
      activity: {
        entries: data.activities.length,
        duration_minutes: Math.round(activityMinutes),
      },
      evidence_rules: {
        nutrition_completeness_is_unknown: true,
        set_exposure_is_not_a_hypertrophy_score: true,
        estimated_progression_uses_logged_load_and_reps: true,
      },
    };
  }, [data, days, lab.blocks, lab.experiments, lab.gyms, settings.sessionVolumeModifier, settings.specializationMuscles]);

  const markdown = useMemo(() => {
    const improving = report.training.progression.filter(item => item.state === 'progressing');
    const regressed = report.training.progression.filter(item => item.state === 'regressed');
    const block = report.advanced.active_block;
    return [
      '# RepTrack Coach Report',
      '',
      `Range: ${report.range.start} to ${report.range.end}`,
      '',
      '## Training',
      `- Workouts: ${report.training.workouts}`,
      `- Working sets: ${report.training.sets}`,
      `- Progressing: ${improving.length}`,
      `- Regressed: ${regressed.length}`,
      ...improving.slice(0, 10).map(item => `- ↑ ${item.exercise}: ${item.latestWeight} kg × ${item.latestReps}${item.changePct == null ? '' : ` (${item.changePct > 0 ? '+' : ''}${item.changePct}%)`}`),
      ...regressed.slice(0, 10).map(item => `- ↓ ${item.exercise}: ${item.latestWeight} kg × ${item.latestReps}${item.changePct == null ? '' : ` (${item.changePct}%)`}`),
      '',
      '## Bodyweight',
      `- 7D trend: ${report.bodyweight.latest == null ? 'not available' : `${report.bodyweight.latest} kg`}`,
      `- Observed rate: ${report.bodyweight.weeklyRate == null ? 'not available' : `${report.bodyweight.weeklyRate} kg/week`}`,
      `- Goal: ${report.bodyweight.target == null ? 'not set' : `${report.bodyweight.target} kg`}`,
      `- Runway: ${report.bodyweight.weeks == null ? report.bodyweight.status : `${report.bodyweight.weeks} weeks`}`,
      '',
      '## Recovery',
      `- 7D sleep: ${report.recovery.current == null ? 'not available' : `${report.recovery.current} h`}`,
      `- Previous 7D: ${report.recovery.previous == null ? 'not available' : `${report.recovery.previous} h`}`,
      '',
      '## Nutrition logs',
      `- Logged days: ${report.nutrition.logged_days}`,
      `- Avg calories / logged day: ${report.nutrition.average_calories_per_logged_day ?? '—'}`,
      `- Avg protein / logged day: ${report.nutrition.average_protein_g_per_logged_day == null ? '—' : `${report.nutrition.average_protein_g_per_logged_day} g`}`,
      '- Completeness: unknown',
      '',
      '## Advanced',
      `- Block: ${block ? `${block.name}${block.focus ? ` · ${block.focus}` : ''}` : 'none'}`,
      `- Specialization: ${report.advanced.specialization.join(', ') || 'none'}`,
      `- Active experiments: ${report.advanced.active_experiments.map(item => item.name).join(', ') || 'none'}`,
      '',
      'Use the attached JSON for complete machine-readable evidence.',
    ].join('\n');
  }, [report]);

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings/data" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  return <MainLayout showBack backTo="/app/settings/data" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Export</div><h1 className="type-page-title mt-1">Coach Report</h1></header>

      <div className="flex gap-2 mb-5">{[7,30,90].map(value => <button key={value} onClick={() => setDays(value)} className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${days === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>{value}D</button>)}</div>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5">
        <div className="grid grid-cols-3 gap-px bg-border"><div className="bg-card p-4"><div className="type-caption">Workouts</div><div className="mt-1 text-2xl font-semibold tabular-nums">{report.training.workouts}</div></div><div className="bg-card p-4"><div className="type-caption">Sets</div><div className="mt-1 text-2xl font-semibold tabular-nums">{report.training.sets}</div></div><div className="bg-card p-4"><div className="type-caption">Logged food</div><div className="mt-1 text-2xl font-semibold tabular-nums">{report.nutrition.logged_days}d</div></div></div>
        <div className="p-4 border-t border-border"><div className="type-caption">Weight rate</div><div className="mt-1 text-lg font-semibold tabular-nums">{report.bodyweight.weeklyRate == null ? '—' : `${report.bodyweight.weeklyRate > 0 ? '+' : ''}${report.bodyweight.weeklyRate} kg/wk`}</div></div>
      </section>

      <div className="grid grid-cols-2 gap-2"><button onClick={() => downloadText(`reptrack-coach-report-${report.range.end}.md`, markdown, 'text/markdown')} className="min-h-14 rounded-2xl border border-border bg-card font-semibold flex items-center justify-center gap-2"><FileText className="h-4 w-4"/>Markdown</button><button onClick={() => downloadText(`reptrack-coach-report-${report.range.end}.json`, JSON.stringify(report, null, 2), 'application/json')} className="min-h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2"><FileJson className="h-4 w-4"/>JSON</button></div>
      <div className="mt-3 flex items-center justify-center gap-2 type-caption"><Download className="h-3.5 w-3.5"/>Built from stored RepTrack evidence.</div>
    </div>
  </MainLayout>;
}
