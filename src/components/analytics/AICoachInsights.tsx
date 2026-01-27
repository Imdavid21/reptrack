import { useState } from 'react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AICoachInsights() {
  const { insights, isLoading, error, generateInsights, hasData } = useAIInsights();
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    await generateInsights();
    setHasGenerated(true);
  };

  const bulletPoints = insights
    ? insights
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
    : [];

  if (!hasData && !hasGenerated) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-insight-lavender/15">
            <Sparkles className="h-4 w-4 text-insight-lavender" />
          </div>
          <h3 className="text-sm font-semibold">AI Coach</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Log workouts to unlock AI-powered coaching insights.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-insight-lavender/15">
            <Sparkles className="h-4 w-4 text-insight-lavender" />
          </div>
          <h3 className="text-sm font-semibold">AI Coach</h3>
        </div>
        {hasGenerated && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            className="h-8 px-3 text-xs rounded-full"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      {!hasGenerated && !isLoading && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            Get personalized insights based on your workout data
          </p>
          <Button
            onClick={handleGenerate}
            className="gap-2 rounded-full"
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-2">
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="ml-3 rounded-full"
          >
            Retry
          </Button>
        </div>
      )}

      {hasGenerated && !isLoading && !error && bulletPoints.length > 0 && (
        <ul className="space-y-3">
          {bulletPoints.map((point, idx) => (
            <li
              key={idx}
              className={cn(
                'flex items-start gap-3 text-sm p-3 rounded-xl bg-muted/30',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <span className="text-insight-lavender mt-0.5">→</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {hasGenerated && !isLoading && !error && bulletPoints.length === 0 && insights && (
        <p className="text-sm p-3 rounded-xl bg-muted/30">{insights}</p>
      )}
    </div>
  );
}
