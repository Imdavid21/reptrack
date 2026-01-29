import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar, Trophy, Moon, Zap, Scale } from 'lucide-react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';

interface EditDailyLogDialogProps {
  open: boolean;
  onClose: () => void;
  initialDate?: Date;
}

export function EditDailyLogDialog({ open, onClose, initialDate }: EditDailyLogDialogProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data, upsertMetrics, isUpserting } = useDailyMetrics({
    from: subDays(selectedDate, 30),
    to: selectedDate,
  });

  const [pullups, setPullups] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<string>('');
  const [sleepMinutes, setSleepMinutes] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<string>('');
  const [bodyweight, setBodyweight] = useState<string>('');

  // Load existing data when date changes
  useEffect(() => {
    if (data?.dataPoints) {
      const dayData = data.dataPoints.find(d => d.date === dateStr);
      if (dayData) {
        setPullups(dayData.pullups || 0);
        setNotes(dayData.notes || '');
        
        // Sleep - convert decimal to hours/minutes
        if (dayData.sleep_hours !== null && dayData.sleep_hours > 0) {
          const hours = Math.floor(dayData.sleep_hours);
          const minutes = Math.round((dayData.sleep_hours - hours) * 60);
          setSleepHours(String(hours));
          setSleepMinutes(String(minutes));
        } else {
          setSleepHours('');
          setSleepMinutes('');
        }
        
        // Energy
        setEnergyLevel(dayData.energy_level !== null ? String(dayData.energy_level) : '');
        
        // Bodyweight
        setBodyweight(dayData.bodyweight !== null && dayData.bodyweight > 0 
          ? String(dayData.bodyweight) 
          : '');
      } else {
        // Reset to defaults if no data for this date
        setPullups(0);
        setNotes('');
        setSleepHours('');
        setSleepMinutes('');
        setEnergyLevel('');
        setBodyweight('');
      }
    }
  }, [data, dateStr]);

  // Reset date when dialog opens
  useEffect(() => {
    if (open && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [open, initialDate]);

  const handlePrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate < tomorrow) {
      setSelectedDate(prev => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 1);
        return next;
      });
    }
  };

  const handleSave = async () => {
    try {
      // Calculate sleep in decimal hours
      let sleepDecimal: number | undefined = undefined;
      if (sleepHours || sleepMinutes) {
        const hours = parseInt(sleepHours) || 0;
        const minutes = parseInt(sleepMinutes) || 0;
        sleepDecimal = hours + (minutes / 60);
      }

      await upsertMetrics({
        date: dateStr,
        pullups,
        notes: notes || undefined,
        sleep_hours: sleepDecimal,
        energy_level: energyLevel ? parseInt(energyLevel) : undefined,
        bodyweight: bodyweight ? parseFloat(bodyweight) : undefined,
      });
      haptic('medium');
      toast.success(`Saved log for ${format(selectedDate, 'MMM d')}`);
      onClose();
    } catch (error) {
      toast.error('Failed to save log');
    }
  };

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
  const isFuture = selectedDate > new Date();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar size={20} />
          <Typography variant="h6" component="span">Edit Daily Log</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Date Navigator */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
          borderRadius: 2,
          p: 1,
          mb: 3,
        }}>
          <IconButton onClick={handlePrevDay} size="small">
            <ChevronLeft size={20} />
          </IconButton>
          <Typography variant="body1" fontWeight={600}>
            {isToday ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
          </Typography>
          <IconButton 
            onClick={handleNextDay} 
            size="small"
            disabled={isFuture || isToday}
          >
            <ChevronRight size={20} />
          </IconButton>
        </Box>

        {/* Sleep - Hours & Minutes */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Moon size={16} />
            <Typography variant="body2" fontWeight={600}>Sleep</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="number"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="0"
              size="small"
              label="Hours"
              inputProps={{ min: 0, max: 23 }}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              value={sleepMinutes}
              onChange={(e) => setSleepMinutes(e.target.value)}
              placeholder="0"
              size="small"
              label="Minutes"
              inputProps={{ min: 0, max: 59 }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>

        {/* Energy Level */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Zap size={16} />
            <Typography variant="body2" fontWeight={600}>Energy Level</Typography>
          </Box>
          <TextField
            type="number"
            value={energyLevel}
            onChange={(e) => setEnergyLevel(e.target.value)}
            placeholder="1-10"
            size="small"
            fullWidth
            inputProps={{ min: 1, max: 10 }}
            helperText="Rate 1 (exhausted) to 10 (energized)"
          />
        </Box>

        {/* Bodyweight */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Scale size={16} />
            <Typography variant="body2" fontWeight={600}>Bodyweight (kg)</Typography>
          </Box>
          <TextField
            type="number"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            placeholder="70.0"
            size="small"
            fullWidth
            inputProps={{ min: 0, step: 0.1 }}
          />
        </Box>

        {/* Pull-ups */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Trophy size={16} />
            <Typography variant="body2" fontWeight={600}>Pull-ups</Typography>
          </Box>
          <TextField
            type="number"
            value={pullups || ''}
            onChange={(e) => setPullups(parseInt(e.target.value) || 0)}
            placeholder="0"
            size="small"
            fullWidth
            inputProps={{ min: 0 }}
          />
        </Box>

        {/* Notes */}
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>Notes</Typography>
          <TextField
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for this day..."
            size="small"
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isUpserting}
        >
          {isUpserting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}