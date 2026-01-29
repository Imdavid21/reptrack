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
import { ChevronLeft, ChevronRight, Calendar, Trophy } from 'lucide-react';
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

  // Load existing data when date changes
  useEffect(() => {
    if (data?.dataPoints) {
      const dayData = data.dataPoints.find(d => d.date === dateStr);
      if (dayData) {
        setPullups(dayData.pullups || 0);
        setNotes(dayData.notes || '');
      } else {
        // Reset to defaults if no data for this date
        setPullups(0);
        setNotes('');
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
      await upsertMetrics({
        date: dateStr,
        pullups,
        notes: notes || undefined,
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
            rows={3}
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
