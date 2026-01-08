import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="space-y-3">
      <Link
        to="/log"
        className="flex items-center justify-between p-4 border border-border rounded-lg active:opacity-70 transition-opacity"
      >
        <span className="font-medium">Log Workout</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/create"
          className="p-4 border border-border rounded-lg active:opacity-70 transition-opacity"
        >
          <span className="text-sm font-medium">AI Routine</span>
        </Link>
        <Link
          to="/settings"
          className="p-4 border border-border rounded-lg active:opacity-70 transition-opacity"
        >
          <span className="text-sm font-medium">Reminders</span>
        </Link>
      </div>
    </div>
  );
}