import { useState, useEffect } from 'react';
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

  // Parse insights into bullet points
  const bulletPoints = insights
    ? insights
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
    : [];

  if (!hasData && !hasGenerated) {
    return (
      <div className="border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" />
          <h3 className="section-header mb-0">AI COACH</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Log workouts to unlock AI-powered coaching insights.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <h3 className="section-header mb-0">AI COACH</h3>
        </div>
        {hasGenerated && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      {!hasGenerated && !isLoading && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Get personalized insights based on your workout data
          </p>
          <Button
            onClick={handleGenerate}
            className="gap-2"
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-2">
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="ml-3"
          >
            Retry
          </Button>
        </div>
      )}

      {hasGenerated && !isLoading && !error && bulletPoints.length > 0 && (
        <ul className="space-y-2">
          {bulletPoints.map((point, idx) => (
            <li
              key={idx}
              className={cn(
                'flex items-start gap-2 text-sm',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <span className="text-muted-foreground mt-0.5">→</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {hasGenerated && !isLoading && !error && bulletPoints.length === 0 && insights && (
        <p className="text-sm">{insights}</p>
      )}
    </div>
  );
}
