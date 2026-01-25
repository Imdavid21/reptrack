import { useMeals } from '@/hooks/useMeals';
import { Apple, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealWithNutrition {
  id: string;
  food_name: string | null;
  calories: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  food_quality?: string | null;
}

export function NutritionInsights() {
  const { meals } = useMeals();

  // Analyze meal patterns
  const mealsWithData = meals.filter(m => m.calories) as MealWithNutrition[];
  
  // Calculate totals (with fallback estimates based on calories)
  const totals = mealsWithData.reduce((acc, meal) => {
    const cals = meal.calories || 0;
    return {
      calories: acc.calories + cals,
      protein: acc.protein + (meal.protein || cals * 0.15 / 4), // Estimate 15% protein
      carbs: acc.carbs + (meal.carbs || cals * 0.45 / 4), // Estimate 45% carbs
      fat: acc.fat + (meal.fat || cals * 0.35 / 9), // Estimate 35% fat
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Recommended daily values
  const targets = {
    protein: 120, // g
    carbs: 250, // g
    fat: 65, // g
  };

  const proteinPercent = Math.min((totals.protein / targets.protein) * 100, 100);
  const carbsPercent = Math.min((totals.carbs / targets.carbs) * 100, 100);
  const fatPercent = Math.min((totals.fat / targets.fat) * 100, 100);

  // Generate insights
  const insights: { type: 'good' | 'warning' | 'info'; message: string }[] = [];

  if (totals.protein < targets.protein * 0.5 && mealsWithData.length >= 2) {
    insights.push({
      type: 'warning',
      message: 'Low protein intake — add lean meats, eggs, or legumes',
    });
  } else if (totals.protein >= targets.protein * 0.8) {
    insights.push({
      type: 'good',
      message: 'Good protein intake for muscle recovery',
    });
  }

  if (totals.fat > targets.fat * 1.2 && mealsWithData.length >= 2) {
    insights.push({
      type: 'warning',
      message: 'High fat intake — consider lighter options',
    });
  }

  // Check food quality if available
  const qualityScores = mealsWithData
    .filter(m => m.food_quality)
    .map(m => {
      const scores = { excellent: 4, good: 3, moderate: 2, poor: 1 };
      return scores[m.food_quality as keyof typeof scores] || 2;
    });

  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    if (avgQuality >= 3) {
      insights.push({
        type: 'good',
        message: 'Great food choices today!',
      });
    } else if (avgQuality < 2) {
      insights.push({
        type: 'warning',
        message: 'Consider more whole foods and vegetables',
      });
    }
  }

  if (mealsWithData.length === 0) {
    return (
      <div className="card-brutalist">
        <div className="flex items-center gap-2 mb-4">
          <Apple className="h-4 w-4" />
          <h3 className="section-header mb-0">NUTRITION</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Log meals to see nutrition insights
        </p>
      </div>
    );
  }

  return (
    <div className="card-brutalist">
      <div className="flex items-center gap-2 mb-4">
        <Apple className="h-4 w-4" />
        <h3 className="section-header mb-0">NUTRITION</h3>
      </div>

      {/* Macro breakdown */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Protein</span>
            <span className="tabular-nums">{Math.round(totals.protein)}g / {targets.protein}g</span>
          </div>
          <div className="progress-bar h-2">
            <div
              className={cn(
                "h-full transition-all",
                proteinPercent >= 80 ? "bg-success" : proteinPercent >= 50 ? "bg-primary" : "bg-warning"
              )}
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Carbs</span>
            <span className="tabular-nums">{Math.round(totals.carbs)}g / {targets.carbs}g</span>
          </div>
          <div className="progress-bar h-2">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Fat</span>
            <span className="tabular-nums">{Math.round(totals.fat)}g / {targets.fat}g</span>
          </div>
          <div className="progress-bar h-2">
            <div
              className={cn(
                "h-full transition-all",
                fatPercent > 100 ? "bg-warning" : "bg-primary"
              )}
              style={{ width: `${Math.min(fatPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-2 text-sm",
                insight.type === 'good' && "bg-success/5 border-l-2 border-success",
                insight.type === 'warning' && "bg-warning/5 border-l-2 border-warning",
                insight.type === 'info' && "bg-muted/50 border-l-2 border-muted-foreground"
              )}
            >
              {insight.type === 'good' && <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />}
              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
              {insight.type === 'info' && <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
