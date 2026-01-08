import { Link } from 'react-router-dom';
import { Dumbbell, Sparkles, Droplets, ChevronRight } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="space-y-3">
      <h3 className="section-header">Quick Actions</h3>
      
      <Link
        to="/log"
        className="group card-premium flex items-center justify-between p-5 hover-lift press-effect"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-base">Log Workout</span>
            <p className="text-sm text-muted-foreground">Start today's session</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/create"
          className="card-premium flex flex-col items-start p-4 hover-lift press-effect"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <span className="font-semibold text-sm">AI Routine</span>
          <span className="text-xs text-muted-foreground">Generate workout</span>
        </Link>
        <Link
          to="/settings"
          className="card-premium flex flex-col items-start p-4 hover-lift press-effect"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3">
            <Droplets className="h-5 w-5 text-cyan-400" />
          </div>
          <span className="font-semibold text-sm">Water Reminders</span>
          <span className="text-xs text-muted-foreground">Setup automation</span>
        </Link>
      </div>
    </div>
  );
}