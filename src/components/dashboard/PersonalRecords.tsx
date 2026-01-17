import { Trophy } from 'lucide-react';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { format, parseISO } from 'date-fns';

export function PersonalRecords() {
  const { data: records, isLoading } = usePersonalRecords();

  if (isLoading) {
    return (
      <div className="border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-mono text-sm font-medium">PERSONAL RECORDS</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-mono text-sm font-medium">PERSONAL RECORDS</h3>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          Log workouts to track your PRs
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-sm font-medium">PERSONAL RECORDS</h3>
      </div>
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.exerciseName}
            className="flex items-center justify-between p-3 bg-muted/50 border border-border"
          >
            <div>
              <p className="font-mono text-sm font-medium">{record.exerciseName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {format(parseISO(record.date), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-primary">
                {record.maxWeight} kg
              </p>
              {record.reps && (
                <p className="font-mono text-xs text-muted-foreground">
                  {record.reps} reps
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
