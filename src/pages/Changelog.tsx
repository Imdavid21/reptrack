import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { useSEO } from '@/hooks/useSEO';
import { APP_VERSION } from '@/lib/version';

const changelogEntries = [
  {
    date: '2026-06-15',
    title: 'Back-dated logging for everything',
    items: [
      'Log workouts, water, food, activity, sleep, and weight for any past day',
      'A single date control on each logger — defaults to today, future dates disabled',
      'Back-dated entries flow into History, charts, and your Body Score automatically',
    ],
  },
  {
    date: '2026-06-15',
    title: 'Smarter exercise library',
    items: [
      '45+ new exercises across Push/Pull/Legs/Core (204 total) with equipment variations',
      'Star your favorites and a "Your exercises" quick row for one-tap adding',
      'The app remembers your preferred variation of a movement and reuses it next time',
    ],
  },
  {
    date: '2026-06-14',
    title: 'Body Score over time',
    items: [
      'New trend line showing your overall Body Score across the selected range',
      'See at a glance whether your trajectory is climbing, holding, or slipping',
    ],
  },
  {
    date: '2026-06-13',
    title: 'Muscle intelligence & growth signals',
    items: [
      'Whole-body muscle map: weekly sets per muscle vs evidence-based volume landmarks',
      'Flags undertrained, overtrained, and never-trained muscles with movements to add',
      'Automatic PR detection plus plateau alerts that suggest switching to a fresh variation',
      'Room-to-grow prompts for muscles with space for more productive volume',
    ],
  },
  {
    date: '2026-06-13',
    title: 'Refreshed design',
    items: [
      'Modern, soft color system with one consistent hue per domain (training, fuel, recovery, hydration)',
      'Redesigned History timeline, 404 page, and accessible date pickers',
      'No more dark-mode flash on load; clearer, higher-contrast text throughout',
    ],
  },
  {
    date: '2026-06-12',
    title: 'Insights north star: your Body Overview',
    items: [
      'One composite Body Score built from four pillars — training, fuel, recovery, hydration',
      'Honest scoring that only counts a pillar once it has enough data',
      'A prioritized "Do these next" list with concrete, one-tap actions',
    ],
  },
  {
    date: '2026-06-12',
    title: 'Reliability & security hardening',
    items: [
      'Fixed new-account sign-up and closed cross-user data exposure',
      'Meal photos are now private; workouts and metrics save on the correct local date',
      'Reliable offline sync (no duplicate entries), account deletion, and AI rate limiting',
    ],
  },
  {
    date: '2026-02-10',
    title: 'Energy Balance & Calorie Accuracy',
    items: [
      'Fixed calorie burn aggregation for days with multiple workouts',
      'Improved workout duration selection to use longest session per day',
      'Corrected Net Calorie totals across all workout days',
    ],
  },
  {
    date: '2026-02-09',
    title: 'Insights & Analytics Upgrades',
    items: [
      'Added Energy Balance chart with intake vs. burned visualization',
      'Introduced ML Coach Insights with correlation analysis',
      'Added monthly and weekly summary cards',
      'New body parts progress spline chart',
      'Volume Sankey diagram for training distribution',
      'Strength overview chart improvements',
    ],
  },
  {
    date: '2026-02-08',
    title: 'Health & Nutrition Tracking',
    items: [
      'AI-powered food image analysis for calorie estimation',
      'Text-based food logging with natural language parsing',
      'Calorie tracker with daily intake and burn history',
      'Hydration tracking with daily water goal progress',
      'Nutrition insights with macro breakdown',
    ],
  },
  {
    date: '2026-02-07',
    title: 'Workout Experience Polish',
    items: [
      'Set-by-set logging with real-time progress tracking',
      'Exercise picker with search and category filters',
      'Workout duration auto-calculation from start/end times',
      'Pre/post workout check-ins (energy, motivation, soreness)',
      'Workout coach card with AI-generated suggestions',
    ],
  },
  {
    date: '2026-02-06',
    title: 'Dashboard & Daily Tracking',
    items: [
      'Activity heatmap for workout consistency visualization',
      'Personal records tracking with automatic PR detection',
      'Quick actions bar for fast logging',
      'Water tracker widget on dashboard',
      'Morning and night check-in system',
    ],
  },
  {
    date: '2026-02-05',
    title: 'Routine & Split System',
    items: [
      'Custom routine builder with split templates (PPL, Upper/Lower, etc.)',
      'Day selector with workout scheduling',
      'Exercise library with 100+ exercises and muscle targeting',
      'Last-used weights auto-fill for progressive overload',
    ],
  },
  {
    date: '2026-02-04',
    title: 'History & Workout Detail',
    items: [
      'Workout history with filterable list view',
      'Detailed workout view with exercise breakdown',
      'Workout edit and delete capabilities',
      'Data export functionality (JSON)',
    ],
  },
  {
    date: '2026-02-03',
    title: 'Settings & Personalization',
    items: [
      'User preferences with fitness goals and body metrics',
      'Dark/light theme toggle with system preference detection',
      'Units system toggle (metric/imperial)',
      'API key management for AI features',
    ],
  },
  {
    date: '2026-02-02',
    title: 'Auth & Onboarding',
    items: [
      'Email authentication with sign-up and sign-in',
      'Guided onboarding flow for new users',
      'Profile setup with training goals',
    ],
  },
  {
    date: '2026-02-01',
    title: 'Foundation & Landing',
    items: [
      'Landing page with feature overview and live demos',
      'PWA support with offline capability',
      'Blog with 40+ fitness and training articles',
      'Bottom navigation with instant page transitions',
      'Responsive mobile-first design system',
    ],
  },
];

export default function Changelog() {
  useSEO({
    title: 'Changelog – Reps & Reminders',
    description: 'See what\'s new in Reps & Reminders. Latest updates, features, and improvements.',
    canonical: '/changelog',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
          <span className="badge-energy">v{APP_VERSION}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-8">All notable updates to Reps & Reminders.</p>

        <div className="space-y-8">
          {changelogEntries.map((entry) => (
            <article key={entry.date} className="relative pl-6 border-l-2 border-border">
              <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-energy" />
              <time className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
              <h2 className="text-base font-semibold mt-1 mb-2">{entry.title}</h2>
              <ul className="space-y-1">
                {entry.items.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
