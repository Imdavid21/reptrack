import { useState } from 'react';
import { Box, Typography, Chip, IconButton, TextField } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useNavigate } from 'react-router-dom';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Calendar, Edit2, Moon, Scale, Dumbbell, Trophy, Check, X } from 'lucide-react';
import { toast } from '@/lib/toast';

export default function History() {
  const { workouts } = useWorkouts();
  const navigate = useNavigate();
  
  // Get last 30 days of metrics
  const { data: metricsData, upsertMetrics, isUpserting } = useDailyMetrics({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Editing state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    pullups: string;
    notes: string;
  }>({ pullups: '', notes: '' });

  // Build a combined timeline of the last 14 days
  const last14Days = eachDayOfInterval({
    start: subDays(startOfDay(new Date()), 13),
    end: startOfDay(new Date()),
  }).reverse();

  // Create a map for quick lookup
  const workoutsByDate = workouts.reduce((acc, w) => {
    acc[w.date] = w;
    return acc;
  }, {} as Record<string, typeof workouts[0]>);

  const metricsByDate = (metricsData?.dataPoints || []).reduce((acc, m) => {
    acc[m.date] = m;
    return acc;
  }, {} as Record<string, typeof metricsData.dataPoints[0]>);

  const startEdit = (dateStr: string) => {
    const metric = metricsByDate[dateStr];
    setEditingDate(dateStr);
    setEditValues({
      pullups: metric?.pullups ? String(metric.pullups) : '',
      notes: metric?.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setEditValues({ pullups: '', notes: '' });
  };

  const saveEdit = async () => {
    if (!editingDate) return;
    
    try {
      await upsertMetrics({
        date: editingDate,
        pullups: editValues.pullups ? parseInt(editValues.pullups) : 0,
        notes: editValues.notes || undefined,
      });
      toast.success('Saved');
      setEditingDate(null);
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const formatSleep = (hours: number | null) => {
    if (!hours) return null;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <MainLayout title="HISTORY">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>
          
          {/* Daily Timeline */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {last14Days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const workout = workoutsByDate[dateStr];
              const metric = metricsByDate[dateStr];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
              const isEditing = editingDate === dateStr;
              
              const hasSleep = metric?.sleep_hours && metric.sleep_hours > 0;
              const hasWeight = metric?.bodyweight && metric.bodyweight > 0;
              const hasPullups = metric?.pullups && metric.pullups > 0;
              const hasNotes = metric?.notes;
              const hasAnyData = workout || hasSleep || hasWeight || hasPullups || hasNotes;

              return (
                <motion.div key={dateStr} variants={staggerItem}>
                  <MuiCard sx={{ mb: 1.5, opacity: hasAnyData ? 1 : 0.5 }}>
                    {/* Date Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: hasAnyData ? 1.5 : 0,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {isToday ? 'Today' : format(date, 'EEE, MMM d')}
                        </Typography>
                        {isToday && (
                          <Chip label="TODAY" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                      
                      {!isEditing && (
                        <IconButton size="small" onClick={() => startEdit(dateStr)}>
                          <Edit2 size={14} />
                        </IconButton>
                      )}
                    </Box>

                    {/* Inline Edit Mode */}
                    {isEditing && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <TextField
                            label="Pull-ups"
                            type="number"
                            size="small"
                            value={editValues.pullups}
                            onChange={(e) => setEditValues(v => ({ ...v, pullups: e.target.value }))}
                            sx={{ width: 100 }}
                            inputProps={{ min: 0 }}
                          />
                          <TextField
                            label="Notes"
                            size="small"
                            value={editValues.notes}
                            onChange={(e) => setEditValues(v => ({ ...v, notes: e.target.value }))}
                            sx={{ flex: 1 }}
                            placeholder="Any notes..."
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <IconButton size="small" onClick={cancelEdit}>
                            <X size={16} />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={saveEdit}
                            disabled={isUpserting}
                            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
                          >
                            <Check size={16} />
                          </IconButton>
                        </Box>
                      </Box>
                    )}

                    {/* Content Grid */}
                    {hasAnyData && !isEditing && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {/* Workout */}
                        {workout && (
                          <Box 
                            onClick={() => navigate(`/history/${workout.id}`)}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.75,
                              cursor: 'pointer',
                              px: 1.5,
                              py: 0.75,
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              borderRadius: 1,
                              '&:hover': { opacity: 0.9 },
                            }}
                          >
                            <Dumbbell size={14} />
                            <Typography variant="caption" fontWeight={600}>
                              {workout.day_name}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Sleep */}
                        {hasSleep && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Moon size={14} style={{ opacity: 0.6 }} />
                            <Typography variant="caption" color="text.secondary">
                              {formatSleep(metric.sleep_hours)}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Weight */}
                        {hasWeight && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Scale size={14} style={{ opacity: 0.6 }} />
                            <Typography variant="caption" color="text.secondary">
                              {metric.bodyweight} kg
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Pull-ups */}
                        {hasPullups && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Trophy size={14} style={{ opacity: 0.6 }} />
                            <Typography variant="caption" color="text.secondary">
                              {metric.pullups} pull-ups
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Notes */}
                    {hasNotes && !isEditing && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          display: 'block', 
                          mt: 1, 
                          fontStyle: 'italic',
                          opacity: 0.8,
                        }}
                      >
                        "{metric.notes}"
                      </Typography>
                    )}

                    {/* Empty state */}
                    {!hasAnyData && !isEditing && (
                      <Typography variant="caption" color="text.disabled">
                        No activity
                      </Typography>
                    )}
                  </MuiCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Stats summary */}
          {workouts.length > 0 && (
            <motion.div variants={staggerItem}>
              <MuiCard>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {workouts.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      Total Sessions
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {Math.max(...workouts.map((w) => w.week_number))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Weeks Completed
                    </Typography>
                  </Box>
                </Box>
              </MuiCard>
            </motion.div>
          )}
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
