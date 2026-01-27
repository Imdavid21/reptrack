import { useHealthInsights } from '@/hooks/useHealthInsights';
import { Lightbulb, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface HealthInsightsCardProps {
  days?: number;
}

export function HealthInsightsCard({ days = 30 }: HealthInsightsCardProps) {
  const { data, isLoading } = useHealthInsights(days);

  if (isLoading) {
    return (
      <div className="card-brutalist">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4" />
          <h3 className="section-header mb-0">HEALTH INSIGHTS</h3>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const insights = data?.insights || [];

  if (insights.length === 0) {
    return (
      <div className="card-brutalist">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4" />
          <h3 className="section-header mb-0">HEALTH INSIGHTS</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Log more morning/night check-ins and workouts to see personalized insights.
        </p>
      </div>
    );
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return 'border-l-4 border-l-success bg-success/5';
      case 'negative':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      default:
        return 'border-l-4 border-l-muted-foreground';
    }
  };

  return (
    <div className="card-brutalist">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4" />
        <h3 className="section-header mb-0">HEALTH INSIGHTS</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-3 ${getTypeStyles(insight.type)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium">{insight.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {insight.description}
                </p>
              </div>
              {insight.metric && (
                <div className="flex items-center gap-1 text-sm font-bold whitespace-nowrap">
                  {getTrendIcon(insight.trend)}
                  {insight.metric}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
