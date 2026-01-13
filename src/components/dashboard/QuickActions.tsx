import { Link } from 'react-router-dom';
import { Dumbbell, Sparkles, Droplets } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="space-y-2">
      <h3 className="section-header">QUICK ACTIONS</h3>
      
      <Link
        to="/log"
        className="btn-brutalist btn-primary w-full flex items-center justify-center gap-2 py-4"
      >
        <Dumbbell className="h-5 w-5" />
        LOG TODAY'S WORKOUT
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/create"
          className="btn-brutalist flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI ROUTINE
        </Link>
        <Link
          to="/settings"
          className="btn-brutalist flex items-center justify-center gap-2"
        >
          <Droplets className="h-4 w-4" />
          WATER AUTO
        </Link>
      </div>
    </div>
  );
}
