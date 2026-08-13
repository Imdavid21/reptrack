import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Flame, Moon, Droplets, Scale, CheckCircle2 } from 'lucide-react';
import { BodyOverview, NextStep } from '@/lib/bodyScore';
import { haptic } from '@/lib/haptics';

const STEP_META: Record<NextStep['pillar'], { icon: typeof Dumbbell; chip: string; text: string }> = {
  training: { icon: Dumbbell, chip: 'bg-energy-soft', text: 'text-energy-ink' },
  fuel: { icon: Flame, chip: 'bg-fuel-soft', text: 'text-fuel-ink' },
  recovery: { icon: Moon, chip: 'bg-recover-soft', text: 'text-recover-ink' },
  hydration: { icon: Droplets, chip: 'bg-water-soft', text: 'text-water-ink' },
  body: { icon: Scale, chip: 'bg-muted', text: 'text-foreground' },
};

interface Props {
  overview: BodyOverview | null;
  isLoading: boolean;
}

/**
 * The actionable layer of the north star: up to four concrete, data-grounded
 * actions, each one tappable straight into the place where it gets done.
 */
export function NextStepsCard({ overview, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading || !overview) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="type-component-title mb-3">
        Do these next
      </div>

      {overview.nextSteps.length === 0 ? (
        <div className="flex items-center gap-3 py-1">
          <div className="h-8 w-8 rounded-full bg-energy/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-energy-ink" />
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing urgent — training, fuel, recovery and hydration are all on
            track for this period. Keep doing what you're doing.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {overview.nextSteps.map((step) => {
            const meta = STEP_META[step.pillar];
            const Icon = meta.icon;
            const clickable = !!step.route;
            const Row = clickable ? 'button' : 'div';
            return (
              <Row
                key={step.id}
                {...(clickable
                  ? {
                      onClick: () => {
                        haptic('light');
                        navigate(step.route!);
                      },
                    }
                  : {})}
                className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left ${
                  clickable ? 'hover:bg-muted/50 active:scale-[0.99] transition-all cursor-pointer' : ''
                }`}
              >
                <div className={`h-8 w-8 rounded-lg ${meta.chip} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`h-4 w-4 ${meta.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-tight">{step.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{step.detail}</div>
                </div>
                {clickable && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />}
              </Row>
            );
          })}
        </div>
      )}
    </div>
  );
}
