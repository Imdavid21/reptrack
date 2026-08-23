import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

function ProductFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[24px] border border-border bg-card shadow-sm overflow-hidden">
      <div className="h-11 px-4 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>RepTrack</span>
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-h-14 flex items-center justify-between gap-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {detail ? <div className="text-xs text-muted-foreground mt-0.5">{detail}</div> : null}
      </div>
      <div className="text-sm font-medium tabular-nums text-right">{value}</div>
    </div>
  );
}

function TodayPreview() {
  return (
    <ProductFrame label="Today">
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sunday, 23 August</div>
            <div className="text-lg font-semibold mt-1">Today</div>
          </div>
          <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
            <Settings className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-[20px] border border-border bg-background p-5 mb-5">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Next</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tracking-tight">Pull A</div>
              <div className="text-sm text-muted-foreground mt-1">Back + biceps · ~70 min</div>
            </div>
            <div className="h-11 px-4 rounded-xl bg-foreground text-background flex items-center gap-2 text-sm font-semibold shrink-0">
              Start <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-border px-4">
          <MetricRow label="Sleep" value="7h 21m" />
          <MetricRow label="Weight" value="72.45 kg" />
          <MetricRow label="Water" value="1.25 / 3.0 L" detail="+250   +500" />
          <MetricRow label="Food" value="1,640 kcal" detail="128 g protein" />
        </div>
      </div>
    </ProductFrame>
  );
}

function TrainPreview() {
  return (
    <ProductFrame label="Train">
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pull A</div>
            <div className="text-lg font-semibold mt-1">Chest-supported row</div>
          </div>
          <div className="text-sm tabular-nums text-muted-foreground">21:42</div>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-6">
          <div className="h-full w-[38%] rounded-full bg-foreground" />
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs mb-6">
          <div>
            <div className="text-muted-foreground">Previous</div>
            <div className="font-semibold mt-1 tabular-nums">80 × 8</div>
          </div>
          <div>
            <div className="text-muted-foreground">Target</div>
            <div className="font-semibold mt-1 tabular-nums">82.5 × 8</div>
          </div>
          <div>
            <div className="text-muted-foreground">Set</div>
            <div className="font-semibold mt-1 tabular-nums">2 / 3</div>
          </div>
        </div>

        <div className="rounded-[18px] border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Weight</div>
              <div className="h-14 rounded-xl bg-muted/50 flex items-center justify-center text-xl font-semibold tabular-nums">82.5 kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Reps</div>
              <div className="h-14 rounded-xl bg-muted/50 flex items-center justify-center text-xl font-semibold tabular-nums">8</div>
            </div>
          </div>
          <div className="mt-4 h-12 rounded-xl bg-foreground text-background flex items-center justify-center text-sm font-semibold">Log set</div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rest</span>
          <span className="font-semibold tabular-nums">01:27</span>
          <span className="text-muted-foreground">−15 · Skip · +15</span>
        </div>
      </div>
    </ProductFrame>
  );
}

function ProgressPreview() {
  return (
    <ProductFrame label="Progress">
      <div className="p-5 md:p-6">
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last 30 days</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mt-5">
          <div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">72.45 kg</div>
            <div className="text-xs text-muted-foreground mt-1">Bodyweight</div>
          </div>
          <div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">21</div>
            <div className="text-xs text-muted-foreground mt-1">Workouts</div>
          </div>
          <div>
            <div className="text-xl font-semibold tabular-nums">−0.6 kg/week</div>
            <div className="text-xs text-muted-foreground mt-1">Current trend</div>
          </div>
          <div>
            <div className="text-xl font-semibold tabular-nums">5.1 / week</div>
            <div className="text-xs text-muted-foreground mt-1">Training frequency</div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-sm font-semibold">Your approach is working.</div>
          <div className="text-sm text-muted-foreground mt-1">Weight is trending down while training frequency stays consistent.</div>
        </div>

        <div className="mt-6 space-y-3">
          {[['Back', 88], ['Chest', 64], ['Quads', 55]].map(([label, width]) => (
            <div key={label as string}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span>{label}</span>
                <span className="text-muted-foreground">Training distribution</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProductFrame>
  );
}

const principles = [
  'One obvious next action instead of a dashboard full of choices.',
  'Previous performance, targets, and PR context where you actually need them.',
  'Training, nutrition, weight, sleep, water, and activity in one daily system.',
  'Progress shown as trends and comparisons, not noisy scores.',
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-7 w-7 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl h-16 px-5 md:px-6 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/signin" className="h-10 px-4 rounded-xl bg-foreground text-background inline-flex items-center gap-2 text-sm font-semibold">
              Open RepTrack
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 md:px-6 pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-5">Personal fitness operating system</div>
              <h1 className="text-[42px] leading-[1.02] md:text-6xl lg:text-[68px] font-semibold tracking-[-0.045em] max-w-[760px]">
                RepTrack already knows the plan.
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl">
                Train, eat, recover, and log what actually happened. RepTrack handles the administration underneath and keeps the next decision obvious.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/signin" className="min-h-12 px-5 rounded-xl bg-foreground text-background inline-flex items-center justify-center gap-2 text-sm font-semibold">
                  Start using RepTrack
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#product" className="min-h-12 px-5 rounded-xl border border-border inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-muted/40 transition-colors">
                  See how it works
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-border max-w-xl grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-foreground" /> Fast set logging</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-foreground" /> Adaptive training context</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-foreground" /> Nutrition + recovery tracking</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-foreground" /> PWA + offline resilience</div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 bg-muted/30 blur-3xl rounded-[40px] pointer-events-none" aria-hidden />
              <div className="relative"><TodayPreview /></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40 px-5 md:px-6 py-8">
          <div className="mx-auto max-w-6xl grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="py-5 md:px-8 first:pl-0">
              <div className="text-sm font-semibold">Today</div>
              <div className="text-sm text-muted-foreground mt-1">What should I do now?</div>
            </div>
            <div className="py-5 md:px-8">
              <div className="text-sm font-semibold">Train</div>
              <div className="text-sm text-muted-foreground mt-1">What is my next set?</div>
            </div>
            <div className="py-5 md:px-8 last:pr-0">
              <div className="text-sm font-semibold">Progress</div>
              <div className="text-sm text-muted-foreground mt-1">Is what I am doing working?</div>
            </div>
          </div>
        </section>

        <section id="product" className="px-5 md:px-6 py-20 md:py-28 scroll-mt-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl mb-12 md:mb-16">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Decision compression</div>
              <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.035em]">Less software to manage. More context when it matters.</h2>
              <p className="mt-5 text-base md:text-lg leading-relaxed text-muted-foreground">
                The app can know a lot without showing all of it at once. Each surface is designed around one immediate question.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-10 items-start">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">During training</div>
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">The next set stays obvious.</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
                  Previous performance, today’s target, actual values, PR context, and rest timing stay in the same flow. You should not need to remember what the app already knows.
                </p>
                <TrainPreview />
              </div>

              <div className="lg:pt-20">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">When reviewing</div>
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">Progress starts with an answer.</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
                  Trends, workout comparisons, exercise progression, nutrition, sleep, and activity are organized around whether the current approach is working.
                </p>
                <ProgressPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40 px-5 md:px-6 py-20 md:py-24">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product philosophy</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-[-0.03em]">An autopilot with a log underneath.</h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                RepTrack proposes the sensible default, keeps control close, and gets out of the way when nothing needs attention.
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {principles.map((principle) => (
                <div key={principle} className="min-h-16 py-4 flex items-start gap-3">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm md:text-base leading-relaxed">{principle}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 md:px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Dumbbell className="h-6 w-6 mx-auto text-muted-foreground" />
            <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-[-0.035em]">Your fitness data should reduce decisions, not create more of them.</h2>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Open RepTrack, see what matters now, log reality, and move on.
            </p>
            <Link to="/signin" className="mt-8 min-h-12 px-6 rounded-xl bg-foreground text-background inline-flex items-center justify-center gap-2 text-sm font-semibold">
              Open RepTrack
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 md:px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
