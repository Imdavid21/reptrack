import { useState } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import { MuiCard } from '@/components/ui/MuiCard';

export function PersonalRecords() {
  const { data: records, isLoading } = usePersonalRecords();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trophy size={16} style={{ opacity: 0.6 }} />
          <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Personal Records
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ width: 80, height: 32, bgcolor: 'action.hover', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
          ))}
        </Box>
      </MuiCard>
    );
  }

  if (!records || records.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trophy size={16} style={{ opacity: 0.6 }} />
          <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Personal Records
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Log workouts to track your PRs
        </Typography>
      </MuiCard>
    );
  }

  // Show top 4 PRs collapsed, all when expanded
  const visibleRecords = expanded ? records : records.slice(0, 4);
  const hasMore = records.length > 4;

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trophy size={16} style={{ opacity: 0.6 }} />
          <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Personal Records
          </Typography>
          {hasMore && (
            <Chip 
              label={records.length} 
              size="small" 
              sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }} 
            />
          )}
        </Box>
        {hasMore && (
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
            sx={{ 
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDown size={16} />
          </IconButton>
        )}
      </Box>

      {/* Compact chip grid */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1, 
        mt: 1.5,
      }}>
        {visibleRecords.map((record) => (
          <Chip
            key={record.exerciseName}
            label={
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                  {shortenName(record.exerciseName)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.75rem' }}>
                  {record.maxWeight}kg
                </Typography>
                {record.reps && (
                  <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                    ×{record.reps}
                  </Typography>
                )}
              </Box>
            }
            variant="outlined"
            sx={{ 
              height: 'auto',
              py: 0.5,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        ))}
      </Box>

      {/* Collapse animation for remaining */}
      {hasMore && (
        <Collapse in={expanded}>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            mt: 1,
          }}>
            {records.slice(4).map((record) => (
              <Chip
                key={record.exerciseName}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                      {shortenName(record.exerciseName)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.75rem' }}>
                      {record.maxWeight}kg
                    </Typography>
                    {record.reps && (
                      <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                        ×{record.reps}
                      </Typography>
                    )}
                  </Box>
                }
                variant="outlined"
                sx={{ 
                  height: 'auto',
                  py: 0.5,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </MuiCard>
  );
}

// Shorten exercise names for compact display
function shortenName(name: string): string {
  const mappings: Record<string, string> = {
    'Incline DB Press': 'Inc DB',
    'Cable Fly': 'Cable Fly',
    'Lat Pulldown': 'Lat Pull',
    'Barbell Row': 'BB Row',
    'Barbell Squat': 'Squat',
    'Romanian Deadlift': 'RDL',
    'Leg Press': 'Leg Press',
    'Leg Curl': 'Leg Curl',
    'Shoulder Press': 'OHP',
    'Lateral Raise': 'Lat Raise',
    'Face Pull': 'Face Pull',
    'Tricep Pushdown': 'Tri Push',
    'Bicep Curl': 'Curl',
    'Hammer Curl': 'Hammer',
  };
  
  return mappings[name] || name.split(' ').slice(0, 2).join(' ');
}
