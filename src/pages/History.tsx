import { Box, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { MuiCard } from '@/components/ui/MuiCard';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Calendar, Edit2 } from 'lucide-react';
import { BackfillDialog } from '@/components/dashboard/BackfillDialog';

export default function History() {
  const { workouts, isLoading } = useWorkouts();
  const navigate = useNavigate();

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    const week = `Week ${workout.week_number}`;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(workout);
    return acc;
  }, {} as Record<string, typeof workouts>);

  return (
    <MainLayout title="HISTORY">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
          {/* Backfill Action */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BackfillDialog />
          </Box>

          {workouts.length === 0 ? (
            <MuiCard>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Calendar size={32} style={{ margin: '0 auto', opacity: 0.5 }} />
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  No workouts logged yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Start logging to build your history
                </Typography>
              </Box>
            </MuiCard>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show">
              {Object.entries(workoutsByWeek).map(([week, weekWorkouts]) => (
                <motion.div key={week} variants={staggerItem}>
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.1em',
                        fontWeight: 600,
                        mb: 1.5,
                        display: 'block',
                      }}
                    >
                      {week}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {weekWorkouts.map((workout) => (
                        <MuiCard
                          key={workout.id}
                          onClick={() => navigate(`/history/${workout.id}`)}
                          sx={{ 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'action.hover',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {workout.day_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {format(new Date(workout.date), 'EEEE, MMM d')}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Chip 
                                label={workout.day} 
                                size="small"
                                sx={{ 
                                  fontSize: '0.65rem',
                                  height: 24,
                                }}
                              />
                              <Edit2 size={16} style={{ opacity: 0.5 }} />
                            </Box>
                          </Box>
                        </MuiCard>
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </motion.div>
          )}

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
