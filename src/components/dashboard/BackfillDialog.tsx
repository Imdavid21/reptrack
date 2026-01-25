import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  History, Calendar as CalendarIcon, Sun, Moon, 
  Check, Loader2, ChevronRight, BedDouble 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

export function BackfillDialog() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'morning' | 'evening' | null>(null);

  const { 
    checkin: morningCheckin, 
    upsertCheckin: upsertMorning, 
    isUpserting: isUpsertingMorning,
  } = useMorningCheckin(selectedDate);

  const { 
    checkin: nightCheckin, 
    upsertCheckin: upsertNight, 
    isUpserting: isUpsertingNight,
  } = useNightCheckin(selectedDate);

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

  // Load existing data when date changes
  const loadExistingData = () => {
    if (morningCheckin) {
      const totalSleepHours = morningCheckin.sleep_hours || 0;
      const hours = Math.floor(totalSleepHours);
      const minutes = Math.round((totalSleepHours - hours) * 60);
      
      setMorningForm({
        sleep_hours: hours ? hours.toString() : '',
        sleep_minutes: minutes ? minutes.toString() : '',
        energy_level: morningCheckin.energy_level?.toString() || '',
        heart_rate: morningCheckin.heart_rate?.toString() || '',
        oxygen_level: morningCheckin.oxygen_level?.toString() || '',
        bodyweight: morningCheckin.bodyweight?.toString() || '',
      });
    }

    if (nightCheckin) {
      setNightForm({
        performance_score: nightCheckin.performance_score?.toString() || '',
        energy_score: nightCheckin.energy_score?.toString() || '',
        steps: nightCheckin.steps?.toString() || '',
        bodyweight: nightCheckin.bodyweight?.toString() || '',
        is_rest_day: nightCheckin.is_rest_day || false,
      });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
      setActiveSection(null);
      // Reset forms
      setMorningForm({
        sleep_hours: '',
        sleep_minutes: '',
        energy_level: '',
        heart_rate: '',
        oxygen_level: '',
        bodyweight: '',
      });
      setNightForm({
        performance_score: '',
        energy_score: '',
        steps: '',
        bodyweight: '',
        is_rest_day: false,
      });
    }
  };

  const handleSaveMorning = async () => {
    try {
      const hours = morningForm.sleep_hours ? parseInt(morningForm.sleep_hours) : 0;
      const minutes = morningForm.sleep_minutes ? parseInt(morningForm.sleep_minutes) : 0;
      const totalHours = hours + (minutes / 60);

      await upsertMorning({
        date: format(selectedDate, 'yyyy-MM-dd'),
        sleep_hours: totalHours > 0 ? totalHours : null,
        energy_level: morningForm.energy_level ? parseInt(morningForm.energy_level) : null,
        heart_rate: morningForm.heart_rate ? parseInt(morningForm.heart_rate) : null,
        oxygen_level: morningForm.oxygen_level ? parseInt(morningForm.oxygen_level) : null,
        bodyweight: morningForm.bodyweight ? parseFloat(morningForm.bodyweight) : null,
      });
      
      setActiveSection(null);
      toast.success(`Morning data saved for ${format(selectedDate, 'MMM d')}`);
    } catch (error) {
      toast.error('Failed to save morning data');
    }
  };

  const handleSaveNight = async () => {
    try {
      await upsertNight({
        date: format(selectedDate, 'yyyy-MM-dd'),
        performance_score: nightForm.performance_score ? parseInt(nightForm.performance_score) : null,
        energy_score: nightForm.energy_score ? parseInt(nightForm.energy_score) : null,
        steps: nightForm.steps ? parseInt(nightForm.steps) : 0,
        bodyweight: nightForm.bodyweight ? parseFloat(nightForm.bodyweight) : null,
        is_rest_day: nightForm.is_rest_day,
      });
      
      setActiveSection(null);
      toast.success(`Evening data saved for ${format(selectedDate, 'MMM d')}`);
    } catch (error) {
      toast.error('Failed to save evening data');
    }
  };

  const hasMorningData = morningCheckin && (
    morningCheckin.sleep_hours || morningCheckin.energy_level || morningCheckin.bodyweight
  );

  const hasNightData = nightCheckin && (
    nightCheckin.performance_score || nightCheckin.steps || nightCheckin.bodyweight
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -mx-2">
          <History className="h-3 w-3" />
          <span>Backfill previous day</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            BACKFILL ENTRIES
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selector */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="btn-brutalist w-full text-left p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">SELECTED DATE</div>
                  <div className="font-bold">{format(selectedDate, 'EEEE, MMM d, yyyy')}</div>
                </div>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date >= new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Morning Section */}
          <div className="border border-border">
            <button
              onClick={() => {
                if (activeSection === 'morning') {
                  setActiveSection(null);
                } else {
                  loadExistingData();
                  setActiveSection('morning');
                }
              }}
              className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">MORNING</span>
                {hasMorningData && (
                  <span className="text-xs text-primary">✓ Has data</span>
                )}
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                activeSection === 'morning' && "rotate-90"
              )} />
            </button>

            {activeSection === 'morning' && (
              <div className="p-3 border-t border-border space-y-3">
                <div>
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

                <div className="grid grid-cols-2 gap-3">
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

                <button
                  onClick={handleSaveMorning}
                  disabled={isUpsertingMorning}
                  className="btn-brutalist w-full flex items-center justify-center gap-2"
                >
                  {isUpsertingMorning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  SAVE MORNING
                </button>
              </div>
            )}
          </div>

          {/* Evening Section */}
          <div className="border border-border">
            <button
              onClick={() => {
                if (activeSection === 'evening') {
                  setActiveSection(null);
                } else {
                  loadExistingData();
                  setActiveSection('evening');
                }
              }}
              className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">EVENING</span>
                {hasNightData && (
                  <span className="text-xs text-primary">✓ Has data</span>
                )}
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                activeSection === 'evening' && "rotate-90"
              )} />
            </button>

            {activeSection === 'evening' && (
              <div className="p-3 border-t border-border space-y-3">
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

                <div className="flex items-center gap-3 p-2 border border-border bg-muted/30">
                  <Checkbox
                    id="backfillRestDay"
                    checked={nightForm.is_rest_day}
                    onCheckedChange={(checked) => setNightForm(prev => ({ ...prev, is_rest_day: checked === true }))}
                  />
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="backfillRestDay" className="text-sm cursor-pointer">
                      Rest day
                    </Label>
                  </div>
                </div>

                <button
                  onClick={handleSaveNight}
                  disabled={isUpsertingNight}
                  className="btn-brutalist w-full flex items-center justify-center gap-2"
                >
                  {isUpsertingNight ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  SAVE EVENING
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
