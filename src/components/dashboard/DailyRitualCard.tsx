import { useState, useMemo } from 'react';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import { 
  Sun, Moon, Clock, Heart, Scale, Activity, 
  Footprints, Star, Check, Loader2, ChevronDown,
  BedDouble
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TimeOfDay = 'morning' | 'midday' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 18) return 'midday';
  return 'evening';
}

const TIME_CONFIG = {
  morning: {
    title: 'MORNING RITUAL',
    icon: Sun,
    description: 'Log sleep, weight & vitals',
  },
  midday: {
    title: "TODAY'S PROGRESS",
    icon: Clock,
    description: 'Track your day',
  },
  evening: {
    title: 'EVENING REVIEW',
    icon: Moon,
    description: 'Reflect on your day',
  },
};

export function DailyRitualCard() {
  const timeOfDay = getTimeOfDay();
  const config = TIME_CONFIG[timeOfDay];
  const Icon = config.icon;

  const { 
    checkin: morningCheckin, 
    upsertCheckin: upsertMorning, 
    isUpserting: isUpsertingMorning,
    isLoading: isLoadingMorning 
  } = useMorningCheckin();
  
  const { 
    checkin: nightCheckin, 
    upsertCheckin: upsertNight, 
    isUpserting: isUpsertingNight,
    isLoading: isLoadingNight 
  } = useNightCheckin();

  const [isEditing, setIsEditing] = useState(false);
  const [showOtherSection, setShowOtherSection] = useState(false);
  
  const [morningForm, setMorningForm] = useState({
    sleep_hours: '',
    sleep_minutes: '',
    energy_level: '',
    heart_rate: '',
    oxygen_level: '',
    bodyweight: '',
  });

  const [nightForm, setNightForm] = useState({
    performance_score: '',
    energy_score: '',
    steps: '',
    bodyweight: '',
    is_rest_day: false,
  });

  const hasMorningData = morningCheckin && (
    morningCheckin.sleep_hours || morningCheckin.energy_level || 
    morningCheckin.heart_rate || morningCheckin.bodyweight
  );

  const hasNightData = nightCheckin && (
    nightCheckin.performance_score || nightCheckin.energy_score || 
    nightCheckin.steps || nightCheckin.bodyweight
  );

  const handleStartEdit = () => {
    // Populate morning form
    const totalSleepHours = morningCheckin?.sleep_hours || 0;
    const hours = Math.floor(totalSleepHours);
    const minutes = Math.round((totalSleepHours - hours) * 60);
    
    setMorningForm({
      sleep_hours: hours ? hours.toString() : '',
      sleep_minutes: minutes ? minutes.toString() : '',
      energy_level: morningCheckin?.energy_level?.toString() || '',
      heart_rate: morningCheckin?.heart_rate?.toString() || '',
      oxygen_level: morningCheckin?.oxygen_level?.toString() || '',
      bodyweight: morningCheckin?.bodyweight?.toString() || '',
    });

    // Populate night form
    setNightForm({
      performance_score: nightCheckin?.performance_score?.toString() || '',
      energy_score: nightCheckin?.energy_score?.toString() || '',
      steps: nightCheckin?.steps?.toString() || '',
      bodyweight: nightCheckin?.bodyweight?.toString() || '',
      is_rest_day: nightCheckin?.is_rest_day || false,
    });

    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Save morning data if on morning/midday
      if (timeOfDay === 'morning' || timeOfDay === 'midday') {
        const hours = morningForm.sleep_hours ? parseInt(morningForm.sleep_hours) : 0;
        const minutes = morningForm.sleep_minutes ? parseInt(morningForm.sleep_minutes) : 0;
        const totalHours = hours + (minutes / 60);

        await upsertMorning({
          sleep_hours: totalHours > 0 ? totalHours : null,
          energy_level: morningForm.energy_level ? parseInt(morningForm.energy_level) : null,
          heart_rate: morningForm.heart_rate ? parseInt(morningForm.heart_rate) : null,
          oxygen_level: morningForm.oxygen_level ? parseInt(morningForm.oxygen_level) : null,
          bodyweight: morningForm.bodyweight ? parseFloat(morningForm.bodyweight) : null,
        });
      }

      // Save night data if on evening or if editing other section
      if (timeOfDay === 'evening' || showOtherSection) {
        await upsertNight({
          performance_score: nightForm.performance_score ? parseInt(nightForm.performance_score) : null,
          energy_score: nightForm.energy_score ? parseInt(nightForm.energy_score) : null,
          steps: nightForm.steps ? parseInt(nightForm.steps) : 0,
          bodyweight: nightForm.bodyweight ? parseFloat(nightForm.bodyweight) : null,
          is_rest_day: nightForm.is_rest_day,
        });
      }

      setIsEditing(false);
      setShowOtherSection(false);
      toast.success('Check-in saved');
    } catch (error) {
      toast.error('Failed to save check-in');
    }
  };

  const formatSleepDisplay = (totalHours: number | null) => {
    if (!totalHours) return '-';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  if (isLoadingMorning || isLoadingNight) {
    return (
      <div className="card-brutalist animate-pulse">
        <div className="h-40 bg-muted" />
      </div>
    );
  }

  // Completed state - show summary
  const showCompletedView = !isEditing && (
    (timeOfDay === 'morning' && hasMorningData) ||
    (timeOfDay === 'midday' && hasMorningData) ||
    (timeOfDay === 'evening' && hasNightData)
  );

  if (showCompletedView) {
    return (
      <div 
        className="card-brutalist cursor-pointer hover:bg-muted/50 transition-colors" 
        onClick={handleStartEdit}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="section-header mb-0">{config.title}</h3>
            {nightCheckin?.is_rest_day && (
              <span className="text-xs bg-muted px-2 py-0.5 border border-border">REST</span>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Morning/Midday shows morning data */}
        {(timeOfDay === 'morning' || timeOfDay === 'midday') && hasMorningData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {formatSleepDisplay(morningCheckin?.sleep_hours ?? null)}
                </div>
                <div className="text-xs text-muted-foreground">SLEEP</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {morningCheckin?.bodyweight || '-'} kg
                </div>
                <div className="text-xs text-muted-foreground">WEIGHT</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {morningCheckin?.energy_level || '-'}/10
                </div>
                <div className="text-xs text-muted-foreground">ENERGY</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {morningCheckin?.heart_rate || '-'}
                </div>
                <div className="text-xs text-muted-foreground">BPM</div>
              </div>
            </div>
          </div>
        )}

        {/* Evening shows night data */}
        {timeOfDay === 'evening' && hasNightData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {nightCheckin?.steps?.toLocaleString() || '-'}
                </div>
                <div className="text-xs text-muted-foreground">STEPS</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {nightCheckin?.bodyweight || morningCheckin?.bodyweight || '-'} kg
                </div>
                <div className="text-xs text-muted-foreground">WEIGHT</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {nightCheckin?.performance_score || '-'}/10
                </div>
                <div className="text-xs text-muted-foreground">PERF</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {nightCheckin?.energy_score || '-'}/10
                </div>
                <div className="text-xs text-muted-foreground">ENERGY</div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">Tap to edit</p>
      </div>
    );
  }

  // Edit/Input state
  return (
    <div className="card-brutalist">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header mb-0">{config.title}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Morning/Midday Form */}
      {(timeOfDay === 'morning' || timeOfDay === 'midday') && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">SLEEP</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="7"
                  value={morningForm.sleep_hours}
                  onChange={(e) => setMorningForm(prev => ({ ...prev, sleep_hours: e.target.value }))}
                  className="input-terminal"
                />
                <span className="text-xs text-muted-foreground">hrs</span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  value={morningForm.sleep_minutes}
                  onChange={(e) => setMorningForm(prev => ({ ...prev, sleep_minutes: e.target.value }))}
                  className="input-terminal"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">WEIGHT (KG)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="75.5"
              value={morningForm.bodyweight}
              onChange={(e) => setMorningForm(prev => ({ ...prev, bodyweight: e.target.value }))}
              className="input-terminal mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">ENERGY (1-10)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              placeholder="7"
              value={morningForm.energy_level}
              onChange={(e) => setMorningForm(prev => ({ ...prev, energy_level: e.target.value }))}
              className="input-terminal mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">HEART RATE</Label>
            <Input
              type="number"
              placeholder="65"
              value={morningForm.heart_rate}
              onChange={(e) => setMorningForm(prev => ({ ...prev, heart_rate: e.target.value }))}
              className="input-terminal mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">SpO2 (%)</Label>
            <Input
              type="number"
              min="90"
              max="100"
              placeholder="98"
              value={morningForm.oxygen_level}
              onChange={(e) => setMorningForm(prev => ({ ...prev, oxygen_level: e.target.value }))}
              className="input-terminal mt-1"
            />
          </div>
        </div>
      )}

      {/* Evening Form */}
      {timeOfDay === 'evening' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">STEPS</Label>
              <Input
                type="number"
                placeholder="10000"
                value={nightForm.steps}
                onChange={(e) => setNightForm(prev => ({ ...prev, steps: e.target.value }))}
                className="input-terminal mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">WEIGHT (KG)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="75.0"
                value={nightForm.bodyweight}
                onChange={(e) => setNightForm(prev => ({ ...prev, bodyweight: e.target.value }))}
                className="input-terminal mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">PERFORMANCE</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="7"
                value={nightForm.performance_score}
                onChange={(e) => setNightForm(prev => ({ ...prev, performance_score: e.target.value }))}
                className="input-terminal mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ENERGY</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="7"
                value={nightForm.energy_score}
                onChange={(e) => setNightForm(prev => ({ ...prev, energy_score: e.target.value }))}
                className="input-terminal mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border bg-muted/30">
            <Checkbox
              id="restDay"
              checked={nightForm.is_rest_day}
              onCheckedChange={(checked) => setNightForm(prev => ({ ...prev, is_rest_day: checked === true }))}
              className="checkbox-brutalist"
            />
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="restDay" className="text-sm cursor-pointer">
                Mark as rest day
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible "Other" section to access the other time's data */}
      <Collapsible open={showOtherSection} onOpenChange={setShowOtherSection} className="mt-4">
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
          <ChevronDown className={cn("h-3 w-3 transition-transform", showOtherSection && "rotate-180")} />
          {timeOfDay === 'evening' ? 'Edit morning data' : 'Edit evening data'}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 pt-4 border-t border-border">
          {timeOfDay === 'evening' ? (
            // Show morning form in evening
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">SLEEP</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      placeholder="7"
                      value={morningForm.sleep_hours}
                      onChange={(e) => setMorningForm(prev => ({ ...prev, sleep_hours: e.target.value }))}
                      className="input-terminal"
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="30"
                      value={morningForm.sleep_minutes}
                      onChange={(e) => setMorningForm(prev => ({ ...prev, sleep_minutes: e.target.value }))}
                      className="input-terminal"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WEIGHT (KG)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={morningForm.bodyweight}
                  onChange={(e) => setMorningForm(prev => ({ ...prev, bodyweight: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ENERGY (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={morningForm.energy_level}
                  onChange={(e) => setMorningForm(prev => ({ ...prev, energy_level: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
            </div>
          ) : (
            // Show night form in morning/midday
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">STEPS</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={nightForm.steps}
                  onChange={(e) => setNightForm(prev => ({ ...prev, steps: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">PERFORMANCE</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={nightForm.performance_score}
                  onChange={(e) => setNightForm(prev => ({ ...prev, performance_score: e.target.value }))}
                  className="input-terminal mt-1"
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <button
        onClick={handleSave}
        disabled={isUpsertingMorning || isUpsertingNight}
        className="btn-brutalist w-full mt-4 flex items-center justify-center gap-2"
      >
        {(isUpsertingMorning || isUpsertingNight) ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        SAVE
      </button>
    </div>
  );
}
