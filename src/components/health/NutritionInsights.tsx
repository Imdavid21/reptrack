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

  const mealsWithData = meals.filter(m => m.calories) as MealWithNutrition[];
  
  const totals = mealsWithData.reduce((acc, meal) => {
    const cals = meal.calories || 0;
    return {
      calories: acc.calories + cals,
      protein: acc.protein + (meal.protein || cals * 0.15 / 4),
      carbs: acc.carbs + (meal.carbs || cals * 0.45 / 4),
      fat: acc.fat + (meal.fat || cals * 0.35 / 9),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const targets = {
    protein: 120,
    carbs: 250,
    fat: 65,
  };

  const proteinPercent = Math.min((totals.protein / targets.protein) * 100, 100);
  const carbsPercent = Math.min((totals.carbs / targets.carbs) * 100, 100);
  const fatPercent = Math.min((totals.fat / targets.fat) * 100, 100);

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
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-insight-mint/15">
            <Apple className="h-4 w-4 text-insight-mint" />
          </div>
          <h3 className="text-sm font-semibold">Nutrition</h3>
        </div>
        <p className="text-sm text-muted-foreground py-4 text-center">
          Log meals to see nutrition insights
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-insight-mint/15">
          <Apple className="h-4 w-4 text-insight-mint" />
        </div>
        <h3 className="text-sm font-semibold">Nutrition</h3>
      </div>

      {/* Macro breakdown */}
      <div className="space-y-4 mb-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span>Protein</span>
            <span className="tabular-nums text-muted-foreground">{Math.round(totals.protein)}g / {targets.protein}g</span>
          </div>
          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                proteinPercent >= 80 ? "bg-insight-mint" : proteinPercent >= 50 ? "bg-insight-blue" : "bg-insight-coral"
              )}
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span>Carbs</span>
            <span className="tabular-nums text-muted-foreground">{Math.round(totals.carbs)}g / {targets.carbs}g</span>
          </div>
          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-insight-yellow rounded-full transition-all duration-500"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span>Fat</span>
            <span className="tabular-nums text-muted-foreground">{Math.round(totals.fat)}g / {targets.fat}g</span>
          </div>
          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                fatPercent > 100 ? "bg-insight-coral" : "bg-insight-lavender"
              )}
              style={{ width: `${Math.min(fatPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border/30">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-3 text-sm rounded-xl",
                insight.type === 'good' && "bg-insight-mint/10",
                insight.type === 'warning' && "bg-insight-coral/10",
                insight.type === 'info' && "bg-muted/30"
              )}
            >
              {insight.type === 'good' && <CheckCircle className="h-4 w-4 text-insight-mint shrink-0 mt-0.5" />}
              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-insight-coral shrink-0 mt-0.5" />}
              {insight.type === 'info' && <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
