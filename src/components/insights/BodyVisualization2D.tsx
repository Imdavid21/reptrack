import { useMemo, useState } from 'react';
import { Box, Typography, Skeleton, Chip, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useMuscleGroups, getMuscleStatus, getMuscleColor } from '@/hooks/useMuscleGroups';

// Muscle positions for 2D SVG body model (percentage-based positions)
const muscleConfig: Record<string, { position: { x: number; y: number }; size: { w: number; h: number }; label: string }> = {
  // Torso - Front
  chest: { position: { x: 42, y: 22 }, size: { w: 16, h: 8 }, label: 'Chest' },
  abs: { position: { x: 44, y: 33 }, size: { w: 12, h: 12 }, label: 'Abs' },
  obliques: { position: { x: 38, y: 33 }, size: { w: 5, h: 10 }, label: 'Obliques' },
  
  // Shoulders
  front_delt: { position: { x: 35, y: 20 }, size: { w: 6, h: 6 }, label: 'Front Delt' },
  side_delt: { position: { x: 33, y: 19 }, size: { w: 5, h: 6 }, label: 'Side Delt' },
  rear_delt: { position: { x: 33, y: 21 }, size: { w: 5, h: 5 }, label: 'Rear Delt' },
  
  // Arms
  biceps: { position: { x: 30, y: 28 }, size: { w: 5, h: 10 }, label: 'Biceps' },
  triceps: { position: { x: 31, y: 30 }, size: { w: 4, h: 8 }, label: 'Triceps' },
  forearms: { position: { x: 28, y: 40 }, size: { w: 4, h: 10 }, label: 'Forearms' },
  
  // Back
  lats: { position: { x: 42, y: 28 }, size: { w: 14, h: 10 }, label: 'Lats' },
  traps: { position: { x: 44, y: 16 }, size: { w: 12, h: 5 }, label: 'Traps' },
  rhomboids: { position: { x: 44, y: 22 }, size: { w: 8, h: 6 }, label: 'Rhomboids' },
  lower_back: { position: { x: 44, y: 40 }, size: { w: 10, h: 6 }, label: 'Lower Back' },
  
  // Legs
  quads: { position: { x: 40, y: 52 }, size: { w: 8, h: 16 }, label: 'Quads' },
  hamstrings: { position: { x: 41, y: 55 }, size: { w: 7, h: 14 }, label: 'Hamstrings' },
  glutes: { position: { x: 42, y: 47 }, size: { w: 10, h: 6 }, label: 'Glutes' },
  calves: { position: { x: 40, y: 72 }, size: { w: 6, h: 12 }, label: 'Calves' },
};

export function BodyVisualization2D() {
  const { data, isLoading } = useMuscleGroups(7);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Build muscle data map
  const muscleData = useMemo(() => {
    const map = new Map<string, { status: string; sets: number }>();
    
    if (data?.muscles) {
      data.muscles.forEach(m => {
        map.set(m.muscle, {
          status: getMuscleStatus(m),
          sets: m.sets,
        });
      });
    }
    
    // Add fresh muscles
    Object.keys(muscleConfig).forEach(name => {
      if (!map.has(name)) {
        map.set(name, { status: 'fresh', sets: 0 });
      }
    });
    
    return map;
  }, [data]);

  const selectedData = selectedMuscle ? muscleData.get(selectedMuscle) : null;
  const selectedConfig = selectedMuscle ? muscleConfig[selectedMuscle] : null;

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: '#f8f9fa', borderRadius: 3, p: 2, border: '1px solid #e9ecef' }}>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, bgcolor: '#e9ecef' }} />
      </Box>
    );
  }

  const workedCount = data?.summary?.totalMusclesWorked || 0;
  const totalMuscles = Object.keys(muscleConfig).length;
  const progressPercent = (workedCount / totalMuscles) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ 
        bgcolor: '#f8f9fa', 
        borderRadius: 3, 
        overflow: 'hidden',
        border: '1px solid #e9ecef',
      }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e9ecef' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
              Muscle Activity (7 Days)
            </Typography>
            <Chip 
              size="small" 
              label={`${workedCount}/${totalMuscles}`}
              sx={{ 
                fontSize: '0.65rem',
                height: 20,
                bgcolor: '#d8f3dc',
                color: '#081c15',
              }}
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercent}
            sx={{ 
              height: 6, 
              borderRadius: 3,
              bgcolor: '#e9ecef',
              '& .MuiLinearProgress-bar': { bgcolor: '#95d5b2' },
            }}
          />
        </Box>

        {/* Body SVG */}
        <Box sx={{ position: 'relative', height: 320, p: 2 }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Body outline */}
            <ellipse cx="50" cy="12" rx="8" ry="10" fill="#e9ecef" stroke="#ced4da" strokeWidth="0.5" />
            <path 
              d="M42 20 L38 22 L32 35 L30 50 L32 52 L38 52 L40 45 L42 45 L42 20 Z" 
              fill="#e9ecef" 
              stroke="#ced4da" 
              strokeWidth="0.5"
            />
            <path 
              d="M58 20 L62 22 L68 35 L70 50 L68 52 L62 52 L60 45 L58 45 L58 20 Z" 
              fill="#e9ecef" 
              stroke="#ced4da" 
              strokeWidth="0.5"
            />
            <rect x="42" y="20" width="16" height="28" rx="2" fill="#e9ecef" stroke="#ced4da" strokeWidth="0.5" />
            <path 
              d="M42 48 L40 50 L38 70 L36 90 L40 92 L44 70 L46 70 L48 92 L52 92 L54 70 L56 70 L60 92 L64 90 L62 70 L60 50 L58 48 Z" 
              fill="#e9ecef" 
              stroke="#ced4da" 
              strokeWidth="0.5"
            />
            
            {/* Muscle overlays */}
            {Object.entries(muscleConfig).map(([name, config]) => {
              const muscleInfo = muscleData.get(name) || { status: 'fresh', sets: 0 };
              const isSelected = selectedMuscle === name;
              const color = getMuscleColor(muscleInfo.status as any);
              
              return (
                <g key={name} onClick={() => setSelectedMuscle(isSelected ? null : name)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={config.position.x}
                    y={config.position.y}
                    width={config.size.w}
                    height={config.size.h}
                    rx="1"
                    fill={color}
                    stroke={isSelected ? '#081c15' : 'transparent'}
                    strokeWidth={isSelected ? '0.8' : '0'}
                    opacity={muscleInfo.status === 'worked' ? 0.95 : 0.7}
                  />
                  {/* Mirror for bilateral muscles */}
                  {['front_delt', 'side_delt', 'rear_delt', 'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'calves', 'obliques'].includes(name) && (
                    <rect
                      x={100 - config.position.x - config.size.w}
                      y={config.position.y}
                      width={config.size.w}
                      height={config.size.h}
                      rx="1"
                      fill={color}
                      stroke={isSelected ? '#081c15' : 'transparent'}
                      strokeWidth={isSelected ? '0.8' : '0'}
                      opacity={muscleInfo.status === 'worked' ? 0.95 : 0.7}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Selected muscle info overlay */}
          {selectedMuscle && selectedConfig && (
            <Box sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              bgcolor: 'rgba(255,255,255,0.95)',
              borderRadius: 2,
              p: 1.5,
              border: '1px solid #e9ecef',
              backdropFilter: 'blur(8px)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
                  {selectedConfig.label}
                </Typography>
                <Chip 
                  size="small" 
                  label={selectedData?.status || 'fresh'}
                  sx={{ 
                    fontSize: '0.65rem',
                    height: 20,
                    bgcolor: getMuscleColor(selectedData?.status as any || 'fresh'),
                    color: '#081c15',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                {selectedData?.sets || 0} sets this week
              </Typography>
            </Box>
          )}
        </Box>

        {/* Legend */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid #e9ecef',
          display: 'flex', 
          gap: 1.5, 
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {[
            { status: 'worked', label: 'Recently Worked' },
            { status: 'recovering', label: 'Recovering' },
            { status: 'optimal', label: 'Ready' },
            { status: 'fresh', label: 'Needs Attention' },
          ].map(({ status, label }) => (
            <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%',
                bgcolor: getMuscleColor(status as any),
                border: '1px solid #e9ecef',
              }} />
              <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.6rem' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Needs Attention List */}
        {data?.summary?.musclesNeedingAttention && data.summary.musclesNeedingAttention.length > 0 && (
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid #e9ecef',
            bgcolor: '#ffffff',
          }}>
            <Typography variant="caption" sx={{ color: '#6c757d', display: 'block', mb: 1 }}>
              Needs Attention:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {data.summary.musclesNeedingAttention.slice(0, 6).map(muscle => (
                <Chip
                  key={muscle}
                  label={muscleConfig[muscle]?.label || muscle}
                  size="small"
                  onClick={() => setSelectedMuscle(muscle)}
                  sx={{ 
                    fontSize: '0.55rem', 
                    height: 18,
                    bgcolor: '#f8f9fa',
                    color: '#6c757d',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#e9ecef' },
                  }}
                />
              ))}
              {data.summary.musclesNeedingAttention.length > 6 && (
                <Chip
                  label={`+${data.summary.musclesNeedingAttention.length - 6}`}
                  size="small"
                  sx={{ fontSize: '0.55rem', height: 18, bgcolor: '#e9ecef', color: '#6c757d' }}
                />
              )}
            </Box>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}
