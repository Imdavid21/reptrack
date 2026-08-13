import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { useSEO } from '@/hooks/useSEO';
import { APP_VERSION } from '@/lib/version';

const changelogEntries = [
  {
    date: '2026-08-13',
    title: 'A calmer daily training flow',
    items: [
      'Today, Train, and Timeline now make up the primary navigation; Settings is available from the Today header.',
      'Today now keeps sleep, bodyweight, water, food, and activity logging within one or two taps.',
      'Training starts with a single primary action, with optional warm-up, session selection, and “Feeling rough?” adaptation controls.',
      'Sets prefill from your prescription and history for quicker tap-based logging; completion no longer requires a post-workout form.',
      'Weekly physique and mobility check-ins now appear on Mondays and remain visible until completed; bodyweight uses your logged average.',
    ],
  },
  {
    date: '2026-08-12',
    title: 'Private ChatGPT fitness-data connection',
    items: [
      'Added an authenticated, read-only MCP connection for accessing your fitness records through ChatGPT.',
      'Added OAuth consent, scoped access, rate limits, and production health checks for the connection.',
      'Removed the redundant in-app chat route in favor of the connected ChatGPT experience.',
    ],
  },
  {
    date: '2026-08-11',
    title: 'Accessibility and visual reliability',
    items: [
      'Improved dark and light mode contrast, readability, and responsive modal behaviour.',
      'Improved mobile safe-area handling around the Dynamic Island and bottom navigation.',
      'Added workout consistency tracking and streamlined Settings information hierarchy.',
    ],
  },
  {
    date: '2026-08-03',
    title: 'More complete nutrition logging',
    items: [
      'Added macro breakdowns plus sugar and sodium tracking.',
      'Improved food-photo analysis and corrected nutrition and protein logging issues.',
    ],
  },
  {
    date: '2026-07-26',
    title: 'More accurate energy balance',
    items: [
      'Added a live BMR and maintenance-energy view to the deficit dashboard.',
      'Corrected activity and maintenance calculations, including manual overrides and same-day logging states.',
      'Improved data export/import coverage and simplified advanced settings.',
    ],
  },
  {
    date: '2026-07-24',
    title: 'Adaptive training progression',
    items: [
      'Added adaptive exercise lifecycles, progression history, and plateau-aware variation recommendations.',
      'Improved personal-record detection and made adaptive suggestions easier to review from the workout flow.',
    ],
  },
  {
    date: '2026-07-20',
    title: 'Data quality and activity improvements',
    items: [
      'Added point-in-time goal history so changing a target does not rewrite the past.',
      'Improved activity editing, distance-based calorie calculations, water units, and macro capture robustness.',
      'Made meal buckets private and strengthened the data model around daily records.',
    ],
  },
  {
    date: '2026-07-16',
    title: 'Foundation reliability pass',
    items: [
      'Resolved timezone, offline-sync, split-selection, and stale-preference issues across the app.',
      'Improved PWA safe areas, clearer feedback, workout-date saving, and auth onboarding reliability.',
      'Refined training-focus controls, exercise identity, and progressive-overload calculations.',
    ],
  },
];

export default function Changelog() {
  useSEO({ title: 'Changelog – Reps & Reminders', description: 'See what is new in Reps & Reminders.', canonical: '/changelog' });
  return <div className="min-h-screen bg-background text-foreground">
    <header className="py-6 px-4 border-b border-border"><div className="max-w-3xl mx-auto flex items-center justify-between"><Link to="/"><Logo size="sm" /></Link><Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link></div></header>
    <main className="max-w-3xl mx-auto px-4 py-10"><div className="flex items-center gap-2 mb-1"><h1 className="text-2xl font-bold tracking-tight">Changelog</h1><span className="badge-energy">v{APP_VERSION}</span></div><p className="text-sm text-muted-foreground mb-8">The notable product changes from the past month.</p><div className="space-y-8">{changelogEntries.map(entry => <article key={entry.date} className="relative pl-6 border-l-2 border-border"><div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-energy"/><time className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time><h2 className="text-base font-semibold mt-1 mb-2">{entry.title}</h2><ul className="space-y-1">{entry.items.map(item => <li key={item} className="text-sm text-muted-foreground leading-relaxed">• {item}</li>)}</ul></article>)}</div></main>
    <footer className="py-8 px-4 border-t border-border"><div className="max-w-3xl mx-auto flex justify-between items-center"><Logo size="sm"/><Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></div></footer>
  </div>;
}
